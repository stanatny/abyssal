import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { selectCharacter } from "./menu_picker_helpers.mjs";

// 有生态的真实场景：仅设置起始观察点，阶段、接触、暂停由原生游戏循环执行。
const out =
  process.env.ABYSSAL_REVIEW_OUT || ".local/deep_hazards_20261016/native";
await mkdir(out, { recursive: true });
const report = {
  cases: [],
  errors: [],
  guide: [],
  limits:
    "Controlled starting positions in populated native desktop Chrome; no physical-phone, blind expedition or thermal claim",
};
const browser = await chromium.launch({ channel: "chrome", headless: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(45000);
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("console", (e) => {
  if (e.type() === "error") report.errors.push(e.text());
});
const region = async (id) => {
  if ((await page.locator("#region-select").evaluate((e) => e.value)) !== id) {
    await page.click("#region-select");
    await page.click(`[data-choice-value="${id}"]`);
  }
  await page.waitForFunction(
    (id) =>
      document.querySelector("#region-select").value === id &&
      !window.__ABYSSAL__.regionLoading,
    id,
  );
};
const snapshot = () =>
  page.evaluate(() => {
    const g = window.__ABYSSAL__,
      s = g.ocean.deepHazards.sites[window.hazardReviewIndex];
    return {
      phase: s.state.phase,
      remaining: s.state.remaining,
      spent: s.state.spent,
      hp: g.player.health,
      position: g.position.toArray(),
      activations: s.state.activations,
      elapsed: g.elapsed,
    };
  });
try {
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5188/");
  await page.waitForFunction(
    () => window.__ABYSSAL__ && !window.__ABYSSAL__.regionLoading,
  );
  await page.selectOption("[data-language-select]", "en");
  for (const id of (
    process.env.ABYSSAL_REGIONS ||
    "atlantis,hawaii,bermuda,mariana,europa,amazon,odyssey,penglai"
  ).split(",")) {
    await region(id);
    const sites = await page.evaluate(() =>
      window.__ABYSSAL__.ocean.deepHazards.sites.map((s) => ({
        id: s.id,
        x: s.x,
        y: s.y,
        z: s.z,
        profile: s.profile.id,
      })),
    );
    assert.equal(sites.length, id === "atlantis" ? 4 : 2, id);
    for (let index = 0; index < sites.length; index++) {
      await selectCharacter(
        page,
        id === "europa" ? "mechanical_shark" : "orca",
      );
      await page.click("#start");
      await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
      await page.keyboard.down("KeyK");
      await page.evaluate((index) => {
        window.hazardReviewIndex = index;
        const g = window.__ABYSSAL__,
          s = g.ocean.deepHazards.sites[index];
        g.setLength(30);
        g.setPosition(
          s.x - 12 * Math.cos(s.yaw),
          s.y + 15,
          s.z + 12 * Math.sin(s.yaw),
        );
        g.setFacing(-Math.PI / 2 + s.yaw, 0);
      }, index);
      await page.waitForFunction(
        () =>
          window.__ABYSSAL__.ocean.deepHazards.sites[window.hazardReviewIndex]
            .state.phase === "warning",
      );
      const warning = await snapshot();
      assert.equal(warning.hp, 100);
      if (index === 0)
        await page.screenshot({ path: `${out}/${id}_warning_follow.png` });
      await page.waitForFunction(
        () =>
          window.__ABYSSAL__.ocean.deepHazards.sites[window.hazardReviewIndex]
            .state.spent,
        { timeout: 8000 },
      );
      const hit = await snapshot();
      assert.equal(hit.phase, "active");
      assert.ok(
        hit.hp <= (id === "europa" ? 89 : 83),
        `${id}:${sites[index].id} health ${hit.hp}`,
      );
      await page.click("#pause");
      const paused = await snapshot();
      await page.waitForTimeout(350);
      assert.deepEqual(await snapshot(), paused);
      const cost = await page.evaluate(() => {
        const g = window.__ABYSSAL__,
          s = g.ocean.deepHazards.sites[window.hazardReviewIndex],
          r = s.art.group;
        let triangles = 0,
          meshes = 0,
          points = 0;
        r.traverse((n) => {
          if (n.isMesh) {
            meshes++;
            triangles +=
              (n.geometry.index?.count ||
                n.geometry.attributes.position.count) / 3;
          }
          if (n.isPoints) points += n.geometry.attributes.position.count;
        });
        return {
          triangles,
          meshes,
          points,
          scene: { ...g.renderer.info.memory },
          draws: g.renderer.info.render.calls,
        };
      });
      if (index === 0) {
        await page.evaluate(() => {
          const g = window.__ABYSSAL__,
            s = g.ocean.deepHazards.sites[0];
          window.reviewOverlayStyle =
            document.querySelector("#overlay").style.visibility;
          document.querySelector("#overlay").style.visibility = "hidden";
          g.avatar.visible = false;
          g.camera.position.set(s.x + 14, s.y + 24, s.z + 25);
          g.camera.lookAt(s.x, s.y + 4, s.z);
          g.camera.updateMatrixWorld();
          g.visuals.render();
        });
        await page.screenshot({ path: `${out}/${id}_active_detail.png` });
        await page.evaluate(() => {
          document.querySelector("#overlay").style.visibility =
            window.reviewOverlayStyle;
          window.__ABYSSAL__.avatar.visible = true;
        });
      }
      await page.keyboard.up("KeyK");
      await page.click("#return-menu");
      await page.waitForSelector("#start", { state: "visible" });
      const reset = await page.evaluate(() =>
        window.__ABYSSAL__.ocean.deepHazards.sites.map((s) => ({
          phase: s.state.phase,
          spent: s.state.spent,
        })),
      );
      assert.ok(reset.every((s) => s.phase === "idle" && !s.spent));
      report.cases.push({
        region: id,
        site: sites[index],
        warning,
        hit,
        paused,
        cost,
        reset,
      });
      console.log(`PASS ${id}:${sites[index].id}`);
    }
  }
  for (const [language, width, height] of [
    ["en", 1440, 900],
    ["zh-CN", 390, 667],
  ]) {
    await page.setViewportSize({ width, height });
    await page.selectOption("[data-language-select]", language);
    await page.click("#open-guide");
    for (const [id, kind] of [
      ["atlantis", "ruin_waterlock"],
      ["hawaii", "volcanic_fissure"],
      ["bermuda", "wreck_pressure_seam"],
      ["mariana", "trench_pressure_fault"],
      ["europa", "brine_fracture"],
      ["amazon", "silt_gas_pocket"],
      ["odyssey", "cavern_blowhole"],
      ["penglai", "submerged_resonance"],
    ]) {
      await page.selectOption("#guide-region", id);
      await page.click(`.guide-entry[data-kind="${kind}"]`);
      const text = await page.locator(".guide-info").innerText();
      assert.match(text, /18/);
      if (language === "en") assert.equal(/[\u3400-\u9fff]/u.test(text), false);
      report.guide.push({ id, language, width, text });
      if (id === "atlantis")
        await page.screenshot({ path: `${out}/guide_${language}.png` });
    }
    await page.click(".guide-close");
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (e) {
  report.error = e.stack;
  process.exitCode = 1;
  await page.screenshot({ path: `${out}/failed.png` }).catch(() => {});
  console.error(e);
} finally {
  await browser.close();
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
}
