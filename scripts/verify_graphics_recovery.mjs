import { chromium, webkit } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const engine = process.env.ABYSSAL_ENGINE || "chromium";
const out =
  process.env.ABYSSAL_RECOVERY_DIRECTORY ||
  `.local/graphics_recovery/${engine}`;
const url = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5188";
await mkdir(out, { recursive: true });
const report = {
  engine,
  url,
  at: new Date().toISOString(),
  cases: [],
  errors: [],
};
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  ...(engine === "webkit" ? {} : { channel: "chrome" }),
  headless: false,
});
let page;
try {
  page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(120000);
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("console", (e) => {
    if (e.type() === "error") report.errors.push(e.text());
  });
  await page.goto(url);
  await page.waitForFunction(
    () => window.__ABYSSAL__ && !__ABYSSAL__.regionLoading,
  );
  await page.evaluate(async () => {
    window.T = await import("/node_modules/.vite/deps/three.js");
    window.texturePixels = (renderer, texture) => {
      const rt = new T.WebGLRenderTarget(32, 32),
        scene = new T.Scene(),
        camera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const geometry = new T.PlaneGeometry(2, 2),
        material = new T.ShaderMaterial({
          uniforms: { image: { value: texture } },
          vertexShader:
            "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.);}",
          fragmentShader:
            "varying vec2 vUv;uniform sampler2D image;void main(){gl_FragColor=texture2D(image,vUv);}",
        });
      scene.add(new T.Mesh(geometry, material));
      const old = renderer.getRenderTarget(),
        face = renderer.getActiveCubeFace(),
        mip = renderer.getActiveMipmapLevel();
      const pixels = new Uint8Array(4096);
      try {
        renderer.setRenderTarget(rt);
        renderer.render(scene, camera);
        renderer.readRenderTargetPixels(rt, 0, 0, 32, 32, pixels);
      } finally {
        renderer.setRenderTarget(old, face, mip);
        rt.dispose();
        geometry.dispose();
        material.dispose();
      }
      let sum = 0,
        hash = 2166136261;
      for (let i = 0; i < pixels.length; i++) {
        hash = Math.imul(hash ^ pixels[i], 16777619);
        if (i % 4 < 3) sum += pixels[i];
      }
      return { sum, hash: hash >>> 0 };
    };
    window.worldCapture = () => {
      const g = __ABYSSAL__;
      g.visuals.render();
      const png = g.renderer.domElement.toDataURL();
      const maps = new Map();
      g.scene.traverseVisible((o) => {
        for (const m of Array.isArray(o.material)
          ? o.material
          : o.material
            ? [o.material]
            : []) {
          for (const key of ["map", "roughnessMap", "metalnessMap"])
            if (m[key] && !m[key].isRenderTargetTexture)
              maps.set(m[key].uuid, m[key]);
        }
      });
      const textures = [...maps].map(([id, t]) => ({
        id,
        width: t.image?.width,
        ...texturePixels(g.renderer, t),
      }));
      return {
        png,
        textures,
        environment: texturePixels(g.renderer, g.scene.environment),
        memory: { ...g.renderer.info.memory },
        state: {
          mode: g.mode,
          health: g.player.health,
          elapsed: g.player.elapsed,
          position: g.position.toArray(),
        },
      };
    };
  });
  const capture = async (name) => {
    const data = await page.evaluate(() => worldCapture());
    await writeFile(
      `${out}/${name}.png`,
      Buffer.from(data.png.split(",")[1], "base64"),
    );
    delete data.png;
    return data;
  };
  for (const region of ["atlantis", "hawaii", "europa"]) {
    if ((await page.$eval("#region-select", (e) => e.value)) !== region) {
      await page.click("#region-select");
      await page.click(`[data-choice-value="${region}"]`);
    }
    await page.waitForFunction(
      (id) =>
        __ABYSSAL__.expedition.region.id === id && !__ABYSSAL__.regionLoading,
      region,
    );
    await page.click("#start");
    await page.waitForFunction(() => __ABYSSAL__.mode === "playing");
    if (region === "atlantis") {
      // 初始位置为诊断夹具；后续靠正常前进经过门口，不按帧钉住角色。
      await page.evaluate(() => {
        const g = __ABYSSAL__;
        g.player.invulnerable = 1000;
        g.setPosition(0, -175, -240);
        g.setFacing(0, 0);
      });
      await page.waitForTimeout(3200);
    }
    await page.click("#pause");
    await page.waitForTimeout(120);
    for (const high of [false, true]) {
      if ((await page.evaluate(() => __ABYSSAL__.visuals.enabled)) !== high)
        await page.click("#quality");
      await page.waitForTimeout(150);
      const label = `${region}_${high ? "high" : "smooth"}`;
      const before = await capture(`${label}_before`);
      assert.ok(before.environment.sum > 0);
      const cycles = [];
      for (let i = 0; i < 2; i++) {
        await page.evaluate(async () => {
          const g = __ABYSSAL__,
            canvas = g.renderer.domElement;
          window.restoreExtension = g.renderer
            .getContext()
            .getExtension("WEBGL_lose_context");
          const lost = new Promise((resolve) =>
            canvas.addEventListener("webglcontextlost", resolve, {
              once: true,
            }),
          );
          restoreExtension.loseContext();
          await lost;
        });
        assert.equal(await page.locator("#resume").isDisabled(), true);
        await page.evaluate(() =>
          document
            .querySelector("#resume")
            .dispatchEvent(new MouseEvent("click", { bubbles: true })),
        );
        assert.equal(await page.evaluate(() => __ABYSSAL__.mode), "paused");
        await page.evaluate(() => restoreExtension.restoreContext());
        await page.waitForFunction(
          () =>
            document.querySelector("#loading").hidden &&
            !document.querySelector("#resume").disabled,
        );
        await page.waitForTimeout(100);
        const after = await capture(`${label}_restore_${i}`);
        assert.deepEqual(
          after.environment,
          before.environment,
          `${label} environment pixels`,
        );
        assert.deepEqual(
          after.textures,
          before.textures,
          `${label} retained texture pixels`,
        );
        assert.deepEqual(after.state, before.state, `${label} paused world`);
        cycles.push(after);
      }
      assert.deepEqual(
        cycles[0].memory,
        cycles[1].memory,
        `${label} repeated restoration resource count`,
      );
      report.cases.push({
        label,
        before,
        cycles,
        errorsSoFar: report.errors.length,
      });
    }
    await page.click("#resume");
    await page.waitForFunction(() => __ABYSSAL__.mode === "playing");
    await page.waitForTimeout(250);
    await page.click("#pause");
    await page.click("#return-menu");
  }
  // 在实际游玩中中断，并故意延迟首次恢复，验证连点与二次中断不会越过保护。
  await page.click("#start");
  await page.waitForFunction(() => __ABYSSAL__.mode === "playing");
  await page.evaluate(async () => {
    const g = __ABYSSAL__;
    window.originalPrepare = g.visuals.prepare;
    window.recoveryPrepared = false;
    let first = true;
    g.visuals.prepare = async function () {
      await originalPrepare.call(this);
      if (first) {
        first = false;
        recoveryPrepared = true;
        await new Promise((resolve) => {
          window.completeRecovery = resolve;
        });
      }
    };
    const lost = new Promise((r) =>
      g.renderer.domElement.addEventListener("webglcontextlost", r, {
        once: true,
      }),
    );
    window.restoreExtension = g.renderer
      .getContext()
      .getExtension("WEBGL_lose_context");
    restoreExtension.loseContext();
    await lost;
    window.pausedAfterLoss = {
      elapsed: g.player.elapsed,
      health: g.player.health,
      position: g.position.toArray(),
    };
  });
  assert.equal(await page.evaluate(() => __ABYSSAL__.mode), "paused");
  await page.evaluate(() => restoreExtension.restoreContext());
  await page.waitForFunction(() => recoveryPrepared);
  assert.equal(await page.locator("#resume").isDisabled(), true);
  await page.evaluate(() =>
    document
      .querySelector("#resume")
      .dispatchEvent(new MouseEvent("click", { bubbles: true })),
  );
  assert.equal(await page.evaluate(() => __ABYSSAL__.mode), "paused");
  await page.evaluate(async () => {
    const canvas = __ABYSSAL__.renderer.domElement;
    const lost = new Promise((r) =>
      canvas.addEventListener("webglcontextlost", r, { once: true }),
    );
    restoreExtension.loseContext();
    await lost;
    completeRecovery();
  });
  await page.waitForTimeout(150);
  assert.equal(await page.locator("#resume").isDisabled(), true);
  await page.evaluate(() => restoreExtension.restoreContext());
  await page.waitForFunction(
    () =>
      document.querySelector("#loading").hidden &&
      !document.querySelector("#resume").disabled,
  );
  report.playingRecovery = await page.evaluate(() => {
    const g = __ABYSSAL__;
    g.visuals.prepare = originalPrepare;
    return {
      before: pausedAfterLoss,
      after: {
        elapsed: g.player.elapsed,
        health: g.player.health,
        position: g.position.toArray(),
      },
      mode: g.mode,
    };
  });
  assert.deepEqual(report.playingRecovery.before, report.playingRecovery.after);
  assert.equal(report.playingRecovery.mode, "paused");
  await page.click("#resume");
  await page.waitForFunction(() => __ABYSSAL__.mode === "playing");
  await page.click("#pause");
  await page.click("#return-menu");
  await page.click("#open-guide");
  await page.click('[data-category="player"]');
  await page.click('.guide-entry[data-kind="mechanical_shark"]');
  await page.waitForFunction(
    () => document.querySelector(".guide-texture-status").hidden,
  );
  const guideBefore = await page.evaluate(() => {
    const g = __ABYSSAL__.guide.inspectPreview();
    return texturePixels(g.renderer, g.scene.environment);
  });
  await page.evaluate(async () => {
    const { renderer } = __ABYSSAL__.guide.inspectPreview(),
      canvas = renderer.domElement;
    const ext = renderer.getContext().getExtension("WEBGL_lose_context");
    const lost = new Promise((r) =>
      canvas.addEventListener("webglcontextlost", r, { once: true }),
    );
    ext.loseContext();
    await lost;
    await new Promise((r) => setTimeout(r, 150));
    ext.restoreContext();
  });
  await page.waitForFunction((expected) => {
    const g = __ABYSSAL__.guide.inspectPreview();
    return (
      !g.renderer.getContext().isContextLost() &&
      texturePixels(g.renderer, g.scene.environment).sum === expected
    );
  }, guideBefore.sum);
  await page.screenshot({ path: `${out}/guide_restored.png` });
  report.guide = {
    before: guideBefore,
    after: await page.evaluate(() => {
      const g = __ABYSSAL__.guide.inspectPreview();
      return texturePixels(g.renderer, g.scene.environment);
    }),
  };
  assert.deepEqual(report.guide.before, report.guide.after);
  await page.click(".guide-close");
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.error = error.stack;
  process.exitCode = 1;
  await page?.screenshot({ path: `${out}/failure.png` }).catch(() => {});
} finally {
  await browser.close();
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      passed: report.passed,
      error: report.error,
      cases: report.cases.length,
      errors: report.errors,
    }),
  );
}
