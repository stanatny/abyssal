import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createInterface } from "node:readline";
import { cp, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

// 两个已构建版本放在隔离目录；本测试不修改项目源码或现有试玩来源。
const out = resolve(
  process.env.ABYSSAL_CACHE_EVIDENCE || ".local/loading_cache_20261020",
);
const a = resolve(process.env.ABYSSAL_CACHE_BUILD_A || `${out}/build_a`);
const b = resolve(process.env.ABYSSAL_CACHE_BUILD_B || `${out}/build_b`);
const runtime = `${out}/update_runtime`;
await mkdir(out, { recursive: true });
await cp(a, runtime, { recursive: true });
const server = spawn("python3", [
  "scripts/preview_server.py",
  "--root",
  runtime,
  "--port",
  "0",
]);
const lines = createInterface({ input: server.stdout });
const [line] = await once(lines, "line");
const url = `http://127.0.0.1:${JSON.parse(line).port}/`;
const report = { url, cases: [], errors: [], scope: "Native desktop Chrome" };
const profile = `${out}/browser_profile`;
let context, page;
const open = async () => {
  context = await chromium.launchPersistentContext(profile, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1440, height: 900 },
  });
  page = context.pages()[0] || (await context.newPage());
  page.setDefaultTimeout(60000);
  page.on("pageerror", (error) => report.errors.push(error.message));
};
const ready = async (p) => {
  await p.waitForFunction(
    () =>
      document.querySelector("#region-loading")?.hidden &&
      document.querySelector("#loading")?.hidden,
  );
  assert.equal(await p.evaluate(() => typeof window.__ABYSSAL__), "undefined");
};
const play = async (p) => {
  await p.click("#start");
  await p.waitForFunction(
    () =>
      !document.body.classList.contains("launching") &&
      document.querySelector("#pause")?.offsetParent !== null,
  );
  await p.waitForLoadState("networkidle");
  await p.click("#pause");
  await p.click("#return-menu");
};
const deploy = async (dir) => {
  await cp(`${dir}/assets`, `${runtime}/assets`, { recursive: true });
  await cp(`${dir}/index.html`, `${runtime}/next.html`);
  await rename(`${runtime}/next.html`, `${runtime}/index.html`);
};
const entry = async (dir) =>
  (await readFile(`${dir}/index.html`, "utf8")).match(
    /src="([^"]+index-[^"]+\.js)"/,
  )[1];
try {
  await open();
  await page.goto(url);
  await ready(page);
  await play(page);
  await context.close();

  // 真正关闭并重开浏览器，验证磁盘缓存，而不是只验证页面内存里的模型池。
  await open();
  const client = await context.newCDPSession(page);
  await client.send("Network.enable");
  let responses = [];
  client.on("Network.responseReceived", ({ response }) =>
    responses.push({
      url: response.url,
      cached: !!response.fromDiskCache,
      status: response.status,
    }),
  );
  await page.goto(url);
  await ready(page);
  await play(page);
  const cached = responses.filter((r) => r.cached);
  assert.ok(cached.length > 50, "Browser restart must reuse many disk assets");
  report.cases.push({
    name: "browser_restart",
    cached: cached.length,
    responses,
  });

  await deploy(b);
  const updated = await context.newPage();
  updated.on("pageerror", (e) => report.errors.push(e.message));
  await updated.goto(url);
  await ready(updated);
  await play(updated);
  assert.equal(
    await updated.locator("script[type=module]").getAttribute("src"),
    await entry(b),
  );
  const names = await updated.evaluate(() =>
    performance.getEntriesByType("resource").map((e) => ({
      name: e.name,
      transfer: e.transferSize,
    })),
  );
  const tuna = names.find((r) => /model_tuna_hf_mesh-/.test(r.name));
  assert.ok(tuna?.transfer > 0, "Changed model must be downloaded");
  const retained = names.filter(
    (r) => /model_/.test(r.name) && !/model_tuna_/.test(r.name),
  );
  assert.ok(retained.length > 40 && retained.every((r) => r.transfer === 0));
  report.cases.push({
    name: "same_address_model_update",
    entry: await entry(b),
    tuna,
    reusedModels: retained.length,
  });
  await play(page);
  assert.equal(
    await page.locator("script[type=module]").getAttribute("src"),
    await entry(a),
  );
  report.cases.push({ name: "old_open_tab_remains_playable" });

  await deploy(a);
  await updated.reload();
  await ready(updated);
  assert.equal(
    await updated.locator("script[type=module]").getAttribute("src"),
    await entry(a),
  );
  await play(updated);
  report.cases.push({ name: "rollback_refresh" });
  await updated.close();

  responses = [];
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });
  await page.reload();
  await ready(page);
  await play(page);
  assert.ok(
    responses.filter((r) => /\/assets\//.test(r.url)).every((r) => !r.cached),
  );
  report.cases.push({ name: "disabled_cache_network_fallback" });
  await page.screenshot({ path: `${out}/cache_final_menu.png` });
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.error = error.stack;
  process.exitCode = 1;
} finally {
  await context?.close();
  server.kill("SIGTERM");
  lines.close();
  await writeFile(
    `${out}/cache_lifecycle_report.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      passed: report.passed,
      cases: report.cases.map((c) => c.name),
      error: report.error,
    }),
  );
}
