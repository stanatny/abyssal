import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const out =
  process.env.ABYSSAL_REVIEW_OUT || ".local/expedition_objectives_20261014";
const browser = await chromium.launch({ channel: "chrome", headless: false });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  locale: "en-US",
});
page.setDefaultTimeout(60000);
const report = {
  errors: [],
  completion: [],
  resources: [],
  limits: [
    "Defeat flags are explicit settlement fixtures, not claimed combat victories",
    "Resource counts are native Chrome observations, not physical-phone performance",
  ],
};
page.on("pageerror", (e) => report.errors.push(e.message));
async function region(id) {
  if ((await page.locator("#region-select").evaluate((e) => e.value)) !== id) {
    await page.click("#region-select");
    await page.click(`[data-choice-value="${id}"]`);
  }
  await page.waitForFunction(
    (id) =>
      window.__ABYSSAL__.expedition.region.id === id &&
      !window.__ABYSSAL__.regionLoading,
    id,
  );
  await page.waitForTimeout(450);
}
try {
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5188/");
  await page.waitForFunction(
    () => window.__ABYSSAL__?.guide && !window.__ABYSSAL__.regionLoading,
  );
  await page.locator("header [data-language-select]").selectOption("en");
  for (const id of ["europa", "amazon"]) {
    await region(id);
    await page.click("#start");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    await page.keyboard.down("KeyK");
    await page.evaluate(() => window.__ABYSSAL__.setLength(29));
    for (let n = 1; n <= 3; n++) {
      await page.evaluate((n) => {
        const g = window.__ABYSSAL__,
          b = g.encounters.bosses.filter((b) => b.enabled)[n - 1];
        b.state.health = 0;
        b.state.defeated = true;
        b.state.phase = "defeated";
      }, n);
      await page.waitForFunction(
        (n) => window.__ABYSSAL__.objective.defeated.size === n,
        n,
      );
      assert.equal(
        await page.evaluate(() => window.__ABYSSAL__.mode),
        "playing",
      );
    }
    await page.evaluate(() => window.__ABYSSAL__.setLength(30));
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "won");
    const result = await page.evaluate(() => ({
      mode: window.__ABYSSAL__.mode,
      objective: document.querySelector("#goal")?.innerText,
      defeated: window.__ABYSSAL__.objective.defeated.size,
    }));
    await page.screenshot({ path: `${out}/${id}_three_lord_settlement.png` });
    report.completion.push({ id, ...result });
    await page.keyboard.up("KeyK");
    await page.click("#return-menu");
    await page.click("#start");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    assert.equal(
      await page.evaluate(() => window.__ABYSSAL__.objective.defeated.size),
      0,
    );
    await page.click("#pause");
    await page.click("#return-menu");
  }
  for (let round = 0; round < 4; round++)
    for (const id of ["europa", "amazon", "atlantis"]) {
      await region(id);
      report.resources.push(
        await page.evaluate(
          ({ id, round }) => {
            const g = window.__ABYSSAL__;
            let meshes = 0;
            const gs = new Set(),
              ms = new Set();
            g.scene.traverse((n) => {
              if (n.isMesh) {
                meshes++;
                gs.add(n.geometry.uuid);
                for (const m of Array.isArray(n.material)
                  ? n.material
                  : [n.material])
                  ms.add(m.uuid);
              }
            });
            return {
              id,
              round,
              meshes,
              geometries: gs.size,
              materials: ms.size,
              memory: { ...g.renderer.info.memory },
              lords: g.encounters.bosses
                .filter((b) => b.enabled)
                .map((b) => [b.id, b.mesh.uuid]),
              discharges: g.scene.children.filter(
                (c) => c.name === "thunderbarbel_discharge",
              ).length,
            };
          },
          { id, round },
        ),
      );
    }
  for (const id of ["europa", "amazon", "atlantis"]) {
    const samples = report.resources.filter((x) => x.id === id).slice(1);
    for (const s of samples.slice(1)) {
      assert.deepEqual(s.lords, samples[0].lords, `${id} lord reuse`);
      assert.equal(s.meshes, samples[0].meshes, `${id} meshes`);
      assert.equal(s.geometries, samples[0].geometries, `${id} geometry`);
      assert.equal(s.materials, samples[0].materials, `${id} materials`);
      assert.equal(s.discharges, 0);
    }
  }
  assert.deepEqual(report.errors, []);
} catch (e) {
  report.failure = e.stack;
  throw e;
} finally {
  await writeFile(
    `${out}/native_lifecycle.json`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
