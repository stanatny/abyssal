import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { selectCharacter } from "./menu_picker_helpers.mjs";

// 本机开发夹具：图鉴控制力度与视角，河流仅初始定位；不替代自然流程或实体手机验收。
const out =
  process.env.ABYSSAL_REVIEW_OUT || ".local/croc_swim_20261014/native";
const kinds = [
  "black_caiman",
  "saltwater_crocodile",
  "purussaurus",
  "rootback_colossus",
  "rootjaw",
];
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: false });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: out, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
page.setDefaultTimeout(45000);
const report = {
  errors: [],
  guide: [],
  world: [],
  limits:
    "Controlled native desktop Chrome; no physical phone, natural full round or thermal claim",
};
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("console", (e) => {
  if (e.type() === "error") report.errors.push(e.text());
});
try {
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5188/");
  await page.waitForFunction(
    () => window.__ABYSSAL__?.guide && !window.__ABYSSAL__.regionLoading,
  );
  await page.addStyleTag({
    content:
      'body[data-swim-art="true"] :is(#hud,#overlay,header,#target,#notification,#touch-controls,#sonar-markers){visibility:hidden!important}',
  });
  await page.selectOption("header [data-language-select]", "en");
  await page.click("#region-select");
  await page.click('[data-choice-value="amazon"]');
  await page.waitForFunction(
    () =>
      !window.__ABYSSAL__.regionLoading &&
      document.querySelector("#region-select").value === "amazon",
  );
  for (const kind of kinds.filter(
    (k) => !process.env.SWIM_WORLD_KIND || k === process.env.SWIM_WORLD_KIND,
  )) {
    await selectCharacter(page, "orca");
    await page.click("#start");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    await page.keyboard.down("KeyK");
    const before = await page.evaluate((kind) => {
      const g = window.__ABYSSAL__,
        e =
          kind === "rootjaw"
            ? g.encounters.bosses.find(
                (b) => b.enabled && b.state.species.kind === kind,
              )
            : g.entities.find((e) => e.species.kind === kind);
      window.reviewActor = e;
      g.setLength(
        kind === "rootjaw" ? 30 : kind === "rootback_colossus" ? 20 : 3,
      );
      g.setPosition(
        e.mesh.position.x + 40,
        e.mesh.position.y,
        e.mesh.position.z + 35,
      );
      g.setFacing(Math.PI / 4, 0);
      return {
        position: e.mesh.position.toArray(),
        uuid: e.mesh.uuid,
        revision: e.mesh.userData.artRevision,
      };
    }, kind);
    const samples = [];
    for (let i = 0; i < 24; i++) {
      await page.waitForTimeout(250);
      samples.push(
        await page.evaluate(() => {
          const e = window.reviewActor;
          let rig;
          e.mesh.traverse((p) => {
            if (p.userData.crocodilianRig) rig = p;
          });
          return {
            position: e.mesh.position.toArray(),
            up: e.mesh.matrix.elements[5] / e.mesh.scale.y,
            visible: e.mesh.visible,
            tail: rig.skeleton.bones[5].rotation.y,
            phase: e.state?.phase || e.hunter?.phase,
            mode: window.__ABYSSAL__.mode,
          };
        }),
      );
    }
    assert.ok(samples.every((s) => s.mode === "playing" && s.up > 0.65));
    assert.ok(
      samples.some((s) =>
        s.position.some((v, i) => Math.abs(v - before.position[i]) > 0.1),
      ),
    );
    assert.ok(
      new Set(samples.filter((s) => s.visible).map((s) => s.tail.toFixed(5)))
        .size > 2,
      `${kind}: live tail updates`,
    );
    await page.click("#pause");
    await page.keyboard.up("KeyK");
    assert.ok(
      samples.at(-1).visible,
      `${kind}: specimen still present for the world image`,
    );
    const frozen = await page.evaluate(() => {
      let b;
      window.reviewActor.mesh.traverse((p) => {
        if (p.userData.crocodilianRig) b = p;
      });
      return Array.from(b.skeleton.boneMatrices);
    });
    await page.waitForTimeout(400);
    assert.deepEqual(
      await page.evaluate(() => {
        let b;
        window.reviewActor.mesh.traverse((p) => {
          if (p.userData.crocodilianRig) b = p;
        });
        return Array.from(b.skeleton.boneMatrices);
      }),
      frozen,
    );
    // 暂停后的近景仅调整已有相机，不变更模型、灯光、雾或周围生态。
    await page.evaluate(() => {
      const g = window.__ABYSSAL__,
        m = window.reviewActor.mesh,
        p = m.position,
        l = m.userData.length;
      document.body.dataset.swimArt = "true";
      g.avatar.visible = false;
      g.camera.position.set(p.x + l * 0.75, p.y + l * 0.5, p.z - l * 0.65);
      g.camera.lookAt(p);
      g.camera.updateMatrixWorld();
      g.visuals.render();
    });
    await page.screenshot({ path: `${out}/${kind}_river.png` });
    await page.evaluate(() => {
      delete document.body.dataset.swimArt;
      window.__ABYSSAL__.avatar.visible = true;
    });
    report.world.push({
      kind,
      before,
      samples,
      pause: true,
      image:
        "Paused free camera, HUD and player hidden; original world lighting and ecology",
    });
    await page.click("#return-menu");
  }
  for (const [lang, width, height] of process.env.SWIM_WORLD_ONLY
    ? []
    : [
        ["en", 1440, 900],
        ["zh-CN", 390, 667],
      ]) {
    await page.setViewportSize({ width, height });
    await page.selectOption("header [data-language-select]", lang);
    await page.click("#open-guide");
    await page.selectOption("#guide-region", "amazon");
    for (const kind of kinds) {
      await page.click(`.guide-entry[data-catalog-id="${kind}"]`);
      const box = await page.locator(".guide-preview").boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      const initial = await page.evaluate(() => {
        const p = window.__ABYSSAL__.guide.inspectPreview(),
          u = p.model.userData;
        u.reviewAnimate ??= u.animate;
        u.animate = (t) => u.reviewAnimate(t, window.reviewEffort ?? 0.5);
        window.reviewEffort = 0.5;
        const aspect =
          (p.camera.right - p.camera.left) / (p.camera.top - p.camera.bottom);
        p.camera.top = Math.max(0.6, p.camera.top);
        p.camera.bottom = -p.camera.top;
        p.camera.left = -p.camera.top * aspect;
        p.camera.right = p.camera.top * aspect;
        p.camera.updateProjectionMatrix();
        p.camera.position.set(0, 4, -0.01);
        p.camera.lookAt(0, 0, 0);
        let meshes = 0,
          triangles = 0;
        p.model.traverse((m) => {
          if (m.isMesh) {
            meshes++;
            triangles +=
              (m.geometry.index?.count ||
                m.geometry.attributes.position.count) / 3;
          }
        });
        return {
          uuid: p.model.uuid,
          meshes,
          triangles,
          revision: u.artRevision,
        };
      });
      for (const [effort, label] of [
        [0.5, "cruise"],
        [3, "chase"],
        [0.5, "brake"],
      ]) {
        await page.evaluate((e) => (window.reviewEffort = e), effort);
        await page.waitForTimeout(lang === "en" ? 2400 : 800);
        await page
          .locator(".guide-preview")
          .screenshot({ path: `${out}/${kind}_${lang}_${label}.png` });
      }
      await page.mouse.up();
      assert.equal(initial.revision, "amazon_crocodilian_v5_swim");
      assert.equal(initial.meshes, 4);
      report.guide.push({ lang, kind, ...initial });
    }
    await page.click(".guide-close");
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (e) {
  report.failure = e.stack;
  throw e;
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  await context.close();
  await browser.close();
}
