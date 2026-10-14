import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { selectCharacter } from "./menu_picker_helpers.mjs";

// 仅开发入口使用初始位置/体型夹具；随后保留真实生态、伤害、战斗时钟与原生输入。
const out =
  process.env.ABYSSAL_REVIEW_OUT || ".local/expedition_objectives_20261014";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: false });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  locale: "en-US",
});
page.setDefaultTimeout(60000);
const report = {
  errors: [],
  fights: [],
  layouts: [],
  limits: [
    "Initial position/30 m fixtures, not a natural full run",
    "Native desktop Chrome at narrow sizes, not a physical phone",
  ],
};
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("console", (e) => {
  if (e.type() === "error") report.errors.push(e.text());
});
async function home() {
  const mode = await page.evaluate(() => window.__ABYSSAL__.mode);
  if (mode === "playing") await page.click("#pause");
  if (mode !== "menu") await page.click("#return-menu");
  await page.locator("#start").waitFor({ state: "visible" });
}
async function region(id) {
  if (
    (await page.locator("#region-select").evaluate((el) => el.value)) !== id
  ) {
    await page.click("#region-select");
    await page.click(`[data-choice-value="${id}"]`);
  }
  await page.waitForFunction(
    (id) =>
      document.querySelector("#region-select").value === id &&
      document.querySelector("#region-loading").hidden,
    id,
  );
}
try {
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5188/");
  await page.waitForFunction(
    () => window.__ABYSSAL__?.guide && !window.__ABYSSAL__.regionLoading,
  );
  await page.locator("header [data-language-select]").selectOption("en");
  for (const [id, kind] of [
    ["europa", "brine_regent"],
    ["amazon", "thunderbarbel"],
  ]) {
    await region(id);
    await selectCharacter(page, "orca");
    await page.click("#start");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    await page.keyboard.down("KeyK");
    await page.mouse.move(720, 450);
    const initial = await page.evaluate((kind) => {
      const g = window.__ABYSSAL__,
        b = g.encounters.bosses.find(
          (b) => b.enabled && b.state.species.kind === kind,
        );
      g.setLength(30);
      g.setPosition(b.home.x, b.home.y, b.home.z + 70);
      g.setFacing(0, 0);
      return {
        home: b.home.toArray(),
        enabled: g.encounters.bosses.filter((b) => b.enabled).map((b) => b.id),
        objective: { ...g.objective },
      };
    }, kind);
    assert.equal(initial.enabled.length, 3);
    const samples = [],
      captured = new Set();
    let dodged = false;
    const deadline = Date.now() + 18000;
    while (Date.now() < deadline) {
      const state = await page.evaluate((kind) => {
        const g = window.__ABYSSAL__,
          b = g.encounters.bosses.find(
            (b) => b.enabled && b.state.species.kind === kind,
          );
        return {
          phase: b.state.phase,
          timer: b.state.timer,
          health: g.player.health,
          mode: g.mode,
          player: g.position.toArray(),
          boss: b.mesh.position.toArray(),
          shots: b.volleyShots,
          projectiles: g.scene.children.filter(
            (c) => c.name === "thunderbarbel_discharge",
          ).length,
          geometry: g.renderer.info.memory.geometries,
          render: { ...g.renderer.info.render },
          lastCollision: g.lastCollision?.stuck ?? false,
        };
      }, kind);
      samples.push(state);
      if (
        !captured.has(state.phase) &&
        ["windup", "attack", "recover"].includes(state.phase)
      ) {
        if (
          state.phase !== "attack" ||
          kind !== "thunderbarbel" ||
          state.projectiles > 0
        ) {
          await page.screenshot({
            path: `${out}/${kind}_world_${state.phase}.png`,
          });
          captured.add(state.phase);
        }
      }
      if (state.phase === "attack" && !dodged && state.timer > 0.35) {
        await page.keyboard.down("KeyW");
        dodged = true;
      }
      if (dodged && state.phase === "recover") {
        await page.keyboard.up("KeyW");
      }
      if (captured.size === 3 && state.phase === "recover" && state.timer > 0.8)
        break;
      assert.equal(state.mode, "playing", `${kind} fixture ended before cycle`);
      await page.waitForTimeout(120);
    }
    await page.keyboard.up("KeyW");
    await page.keyboard.up("KeyK");
    assert.deepEqual([...captured].sort(), ["attack", "recover", "windup"]);
    await page.click("#pause");
    const paused = await page.evaluate((kind) => {
      const g = window.__ABYSSAL__,
        b = g.encounters.bosses.find((b) => b.state.species.kind === kind);
      return [
        b.state.timer,
        ...b.mesh.position.toArray(),
        ...g.position.toArray(),
      ];
    }, kind);
    await page.waitForTimeout(500);
    assert.deepEqual(
      await page.evaluate((kind) => {
        const g = window.__ABYSSAL__,
          b = g.encounters.bosses.find((b) => b.state.species.kind === kind);
        return [
          b.state.timer,
          ...b.mesh.position.toArray(),
          ...g.position.toArray(),
        ];
      }, kind),
      paused,
    );
    // 独立标注的停帧世界美术检查：保留真实场景光照/生态，仅移动观察相机并遮去HUD。
    await page.addStyleTag({
      content:
        'body[data-lord-art="true"] :is(#hud,#overlay,header,#target,#notification,#touch-controls,#sonar-markers){visibility:hidden!important}',
    });
    const model = await page.evaluate((kind) => {
      const g = window.__ABYSSAL__,
        b = g.encounters.bosses.find((b) => b.state.species.kind === kind);
      let meshes = 0,
        triangles = 0;
      b.mesh.traverse((n) => {
        if (n.isMesh) {
          meshes++;
          triangles +=
            (n.geometry.index?.count ?? n.geometry.attributes.position.count) /
            3;
        }
      });
      document.body.dataset.lordArt = "true";
      g.avatar.visible = false;
      g.camera.position.copy(b.mesh.position).add({ x: 45, y: 32, z: 55 });
      g.camera.lookAt(b.mesh.position);
      g.camera.updateMatrixWorld(true);
      g.visuals.render();
      return { meshes, triangles };
    }, kind);
    await page.screenshot({ path: `${out}/${kind}_world_art.png` });
    await page.evaluate(() => {
      delete document.body.dataset.lordArt;
      window.__ABYSSAL__.avatar.visible = true;
    });
    report.fights.push({
      id,
      kind,
      initial,
      samples,
      model,
      pauseStable: true,
    });
    await home();
    await page.click("#start");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    assert.equal(
      await page.evaluate(
        () =>
          window.__ABYSSAL__.encounters.bosses.filter(
            (b) => b.enabled && !b.state.defeated,
          ).length,
      ),
      3,
    );
    await home();
  }
  for (const [width, language] of [
    [1440, "en"],
    [390, "zh-CN"],
    [320, "en"],
  ]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.locator("header [data-language-select]").selectOption(language);
    for (const [id, kind] of [
      ["europa", "brine_regent"],
      ["amazon", "thunderbarbel"],
    ]) {
      await region(id);
      await page.screenshot({
        path: `${out}/${id}_menu_${width}_${language}.png`,
      });
      await page.click("#open-guide");
      await page.locator("#guide-region").selectOption(id);
      await page.click(`[data-catalog-id="${kind}"]`);
      await page.waitForTimeout(250);
      const result = await page.evaluate(() => ({
        text: document.querySelector(".guide-info").innerText,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        preview: document
          .querySelector(".guide-preview")
          .getBoundingClientRect()
          .toJSON(),
      }));
      assert.equal(result.overflow, false);
      if (language === "en")
        assert.doesNotMatch(result.text, /[\u3400-\u9fff]/u);
      await page.screenshot({
        path: `${out}/${kind}_guide_${width}_${language}.png`,
      });
      report.layouts.push({ id, width, language, ...result });
      await page.click(".guide-close");
    }
  }
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.failure = error.stack;
  throw error;
} finally {
  await writeFile(
    `${out}/native_expansion.json`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
