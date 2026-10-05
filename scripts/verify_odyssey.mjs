import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { getRegionSpecies } from "../src/region_ecology.js";
const baseUrl = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178";
const out = process.env.ABYSSAL_ODYSSEY_DIRECTORY || ".local/odyssey_review";
await mkdir(out, { recursive: true });
const report = {
  errors: [],
  checks: [],
  guide: [],
  combat: [],
  switches: [],
  limits: [
    "Development viewpoints, isolated encounter cases and direct three-hit settlement are controlled; this is not a natural full-round playthrough.",
    "390x667 and 320x568 use Chrome touch emulation, not a physical phone.",
  ],
};
const browser = await chromium.launch({ channel: "chrome", headless: false });
const p = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  locale: "en-US",
  reducedMotion: "reduce",
});
p.setDefaultTimeout(60000);
p.on("pageerror", (e) => report.errors.push(e.message));
p.on("console", (m) => {
  if (m.type() === "error") report.errors.push(m.text());
});
async function select(id) {
  if (await p.evaluate(() => window.__ABYSSAL__.mode !== "menu"))
    await p.evaluate(() => window.__ABYSSAL__.returnToMenu());
  if (
    (await p.evaluate(() => window.__ABYSSAL__.expedition.region.id)) !== id
  ) {
    await p.click("#region-select");
    await p.click(`[data-choice-value="${id}"]`);
  }
  await p.waitForFunction(
    (id) =>
      window.__ABYSSAL__.expedition.region.id === id &&
      !window.__ABYSSAL__.regionLoading,
    id,
  );
}
async function start() {
  await p.click("#start");
  await p.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  await p.keyboard.down("KeyK");
}
async function stage(pos, size = 25, yaw = 0, pitch = 0) {
  await p.evaluate(
    ({ pos, size, yaw, pitch }) => {
      const g = window.__ABYSSAL__;
      g.setLength(size);
      g.setPosition(...pos);
      g.setFacing(yaw, pitch);
      g.player.health = g.player.stamina = g.player.hunger = 100;
    },
    { pos, size, yaw, pitch },
  );
}
async function shot(name) {
  await p.screenshot({ path: `${out}/final_${name}.png` });
}
try {
  await p.goto(baseUrl);
  await p.waitForFunction(
    () => window.__ABYSSAL__ && !window.__ABYSSAL__.regionLoading,
  );
  await select("odyssey");
  await shot("home_en");
  const stock = await p.evaluate(() => {
    const g = window.__ABYSSAL__;
    return {
      counts: g.entities.reduce(
        (r, e) => ((r[e.species.kind] = (r[e.species.kind] || 0) + 1), r),
        {},
      ),
      models: g.entities
        .filter((e) => e.mesh.userData.odysseyAnatomy !== e.species.kind)
        .map((e) => e.species.kind),
      bosses: g.encounters.bosses
        .filter((e) => e.enabled)
        .map((e) => e.state.species.kind),
    };
  });
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(stock.counts).filter(([k]) => k !== "golden_argonaut"),
    ),
    Object.fromEntries(
      getRegionSpecies("odyssey").map((s) => [s.kind, s.population]),
    ),
  );
  assert.equal(stock.counts.golden_argonaut, 1);
  assert.deepEqual(stock.models, []);
  assert.deepEqual(stock.bosses.sort(), ["charybdis", "karkinos", "scylla"]);
  report.stock = stock;
  report.checks.push(
    "Actual exclusive population, shared Guide/world model wiring and three guardians",
  );
  for (const language of ["en", "zh-CN"]) {
    await p.locator("[data-language-select]").first().selectOption(language);
    await p.click("#open-guide");
    await p.locator("#guide-region").selectOption("odyssey");
    const kinds = await p
      .locator(".guide-entry[data-kind]")
      .evaluateAll((es) => es.map((e) => e.dataset.kind));
    for (const kind of [
      ...getRegionSpecies("odyssey").map((s) => s.kind),
      "scylla",
      "charybdis",
      "karkinos",
      "golden_argonaut",
    ]) {
      assert.ok(kinds.includes(kind), kind);
      await p.locator(`.guide-entry[data-kind="${kind}"]`).click();
      await p.waitForTimeout(90);
      const text = await p.locator(".guide-info").innerText();
      assert.ok(text.length > 180);
      if (language === "en")
        assert.ok(!/\p{Script=Han}/u.test(text), `${kind}: ${text}`);
      report.guide.push({ kind, language, characters: text.length });
      if (
        [
          "nereid",
          "scylla",
          "charybdis",
          "karkinos",
          "golden_argonaut",
          "iris_cuttlefish",
          "amphora_hermit",
          "aegean_jelly",
          "silver_pipefish",
          "aegis_sturgeon",
          "thalassa_manta",
          "cerulean_hound",
        ].includes(kind)
      )
        await shot(`guide_${kind}_${language}`);
    }
    report.categories = await p
      .locator(".guide-filters button:visible")
      .evaluateAll((es) => es.map((e) => e.dataset.category));
    assert.ok(!report.categories.includes("alien"));
    await p.locator(".guide-close").click();
    await shot(`home_${language}`);
  }
  await p.locator("[data-language-select]").first().selectOption("en");
  for (const char of ["orca", "squid", "zombie_shark", "mechanical_shark"]) {
    await p.click("#character-select");
    await p.click(`[data-choice-value="${char}"]`);
    await start();
    assert.equal(await p.evaluate(() => window.__ABYSSAL__.player.length), 3);
    await p.keyboard.up("KeyK");
    await p.evaluate(() => window.__ABYSSAL__.returnToMenu());
  }
  report.checks.push("All four characters start at 3m and return to menu");
  await p.click("#character-select");
  await p.click('[data-choice-value="orca"]');
  await start();
  for (const [name, pos, size, yaw, pitch] of [
    ["nursery", [0, -18, 75], 3, 0, -0.1],
    ["gardens", [-45, -100, -270], 10, 0, -0.05],
    ["galley", [-40, -245, -440], 16, 0, -0.1],
    ["karkinos", [120, -214, -320], 25, 0, -0.1],
    ["scylla", [-95, -350, -615], 25, 0, -0.1],
    ["charybdis", [100, -560, -935], 25, 0, -0.05],
    ["surface", [40, 3, 5], 10, 0, 0.08],
  ]) {
    await stage(pos, size, yaw, pitch);
    await p.waitForTimeout(500);
    await shot(name);
  }
  // 受控隔离后由真实状态机推进，不改攻击阶段或计时。
  for (const kind of ["scylla", "charybdis", "karkinos"]) {
    await p.evaluate((kind) => {
      const g = window.__ABYSSAL__;
      g.startGame();
      g.entities.forEach((e) => (e.hiddenFor = 999));
      g.encounters.bosses.forEach(
        (b) => (b.enabled = b.state.species.kind === kind),
      );
      const b = g.encounters.bosses.find((b) => b.enabled);
      g.setLength(24);
      g.setPosition(b.home.x, b.home.y, b.home.z + 80);
      g.setFacing(0, 0);
      g.player.health = g.player.hunger = g.player.stamina = 100;
      window.__combat = [];
      window.__projectiles = new Set();
    }, kind);
    await p.keyboard.down("KeyK");
    const until = Date.now() + 11500;
    while (Date.now() < until) {
      await p.waitForTimeout(90);
      await p.evaluate(() => {
        const g = window.__ABYSSAL__,
          b = g.encounters.bosses.find((b) => b.enabled);
        for (const n of g.scene.children)
          if (n.name === "scylla_water_projectile")
            window.__projectiles.add(n.uuid);
        const mouth = b.mesh.userData.mouthAnchors[0].getWorldPosition(
          g.position.clone(),
        );
        window.__combat.push({
          phase: b.state.phase,
          ability: b.state.ability,
          timer: b.state.timer,
          shots: b.volleyShots,
          health: g.player.health,
          position: g.position.toArray(),
          originError:
            b.state.ability === "undertow" &&
            ["windup", "attack"].includes(b.state.phase)
              ? mouth.distanceTo(b.attackOrigin)
              : 0,
          held: b.grapple.held,
          combatAudio: g.audio.boss,
        });
        if (g.player.health < 35) g.player.health = 100;
        g.player.hunger = g.player.stamina = 100;
      });
    }
    const evidence = await p.evaluate(() => ({
      samples: window.__combat,
      projectiles: window.__projectiles.size,
    }));
    assert.ok(evidence.samples.some((s) => s.phase === "windup"));
    assert.ok(evidence.samples.some((s) => s.phase === "attack"));
    assert.ok(evidence.samples.some((s) => s.phase === "recover"));
    if (kind === "scylla") {
      assert.ok(evidence.projectiles >= 6);
      assert.equal(Math.max(...evidence.samples.map((s) => s.shots)), 6);
    } else {
      assert.ok(evidence.samples.every((s) => !s.held));
      assert.ok(Math.max(...evidence.samples.map((s) => s.originError)) < 1e-6);
    }
    report.combat.push({ kind, ...evidence });
    await shot(`${kind}_combat`);
  }
  // 只设置预警开始的观察位置，随后真实按空格逃离。
  await p.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.startGame();
    g.entities.forEach((e) => (e.hiddenFor = 999));
    g.encounters.bosses.forEach(
      (b) => (b.enabled = b.state.species.kind === "charybdis"),
    );
    const b = g.encounters.bosses.find((b) => b.enabled);
    g.setLength(24);
    g.setPosition(b.home.x, b.home.y, b.home.z + 65);
    g.setFacing(0, 0);
  });
  await p.waitForFunction(
    () =>
      window.__ABYSSAL__.encounters.bosses.find((b) => b.enabled).state
        .phase === "windup",
  );
  const before = await p.evaluate(() => {
    const g = window.__ABYSSAL__,
      b = g.encounters.bosses.find((b) => b.enabled);
    const m = b.mesh.userData.mouthAnchors[0].getWorldPosition(
      g.position.clone(),
    );
    g.setPosition(m.x, m.y, m.z + 30);
    g.setFacing(Math.PI, 0);
    return { health: g.player.health, distance: g.position.distanceTo(m) };
  });
  await p.keyboard.up("KeyK");
  await p.keyboard.down("Space");
  await p.waitForTimeout(2800);
  await p.keyboard.up("Space");
  const after = await p.evaluate(() => {
    const g = window.__ABYSSAL__,
      b = g.encounters.bosses.find((b) => b.enabled),
      m = b.mesh.userData.mouthAnchors[0].getWorldPosition(g.position.clone());
    return {
      health: g.player.health,
      distance: g.position.distanceTo(m),
      held: b.grapple.held,
      position: g.position.toArray(),
    };
  });
  assert.ok(after.distance > 62);
  assert.equal(after.held, false);
  report.escape = { before, after };
  report.checks.push(
    "Native Space escapes warned frontal Charybdis intake without a Kraken grip",
  );
  // 真实捕食扫掠与正常计时的栖息地补充。
  await p.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.startGame();
    g.encounters.bosses.forEach((b) => (b.enabled = false));
    g.setLength(10);
    g.player.health = 60;
    const e = g.entities.find((e) => e.species.kind === "nereid");
    window.__meal = e;
    const q = e.mesh.position.clone();
    g.setFacing(0, 0);
    g.setPosition(q.x, q.y, q.z + g.player.length * 0.38 + 0.2);
  });
  await p.keyboard.down("KeyK");
  await p.waitForFunction(() => window.__meal.hiddenFor > 0);
  const meal = await p.evaluate(() => ({
    hidden: window.__meal.hiddenFor,
    health: window.__ABYSSAL__.player.health,
    length: window.__ABYSSAL__.player.length,
  }));
  assert.ok(meal.health > 60);
  await stage([180, -55, -240], 10);
  await p.waitForFunction(() => window.__meal.hiddenFor <= 0, null, {
    timeout: 45000,
  });
  report.meal = {
    ...meal,
    respawn: await p.evaluate(() => window.__meal.mesh.position.toArray()),
  };
  // 暂停冻结唯一活动时钟与姿态。
  await p.click("#pause");
  const frozen = await p.evaluate(() => ({
    elapsed: window.__ABYSSAL__.elapsed,
    position: window.__ABYSSAL__.position.toArray(),
  }));
  await p.waitForTimeout(500);
  assert.deepEqual(
    await p.evaluate(() => ({
      elapsed: window.__ABYSSAL__.elapsed,
      position: window.__ABYSSAL__.position.toArray(),
    })),
    frozen,
  );
  await shot("pause");
  await p.click("#return-menu");
  // 直接结算只验接线；实际攻击与逃脱由上面的原生循环覆盖。
  await p.click("#character-select");
  await p.click('[data-choice-value="mechanical_shark"]');
  await start();
  const result = await p.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.setLength(30);
    for (const b of g.encounters.bosses.filter((b) => b.enabled)) {
      for (let i = 0; i < 3; i++) {
        g.player.biteCooldown = 0;
        b.state.biteCooldown = 0;
        b.state.contactArmed = true;
        g.encounters.torpedoHit(g.player, b, b.mesh.position);
      }
    }
    return g.encounters.bosses
      .filter((b) => b.enabled)
      .map((b) => ({
        kind: b.state.species.kind,
        hits: b.state.validatedHits,
        defeated: b.state.defeated,
      }));
  });
  await p.waitForFunction(() => window.__ABYSSAL__.player.won);
  assert.ok(result.every((b) => b.defeated && b.hits === 3));
  report.result = result;
  await shot("result");
  await p.evaluate(() => window.__ABYSSAL__.returnToMenu());
  for (let cycle = 0; cycle < 2; cycle++)
    for (const region of [
      "hawaii",
      "atlantis",
      "bermuda",
      "mariana",
      "amazon",
      "europa",
      "penglai",
      "odyssey",
    ]) {
      await select(region);
      const data = await p.evaluate(() => ({
        region: window.__ABYSSAL__.expedition.region.id,
        count: window.__ABYSSAL__.entities.length,
        memory: { ...window.__ABYSSAL__.renderer.info.memory },
      }));
      assert.equal(
        data.count,
        getRegionSpecies(region).reduce((n, s) => n + s.population, 0) + 1,
      );
      report.switches.push({ cycle, ...data });
    }
  for (const [w, h] of [
    [390, 667],
    [320, 568],
  ]) {
    const context = await browser.newContext({
      viewport: { width: w, height: h },
      hasTouch: true,
      isMobile: true,
      locale: "zh-CN",
      reducedMotion: "reduce",
    });
    const phone = await context.newPage();
    phone.on("pageerror", (e) => report.errors.push(e.message));
    await phone.goto(baseUrl);
    await phone.waitForFunction(
      () => window.__ABYSSAL__ && !window.__ABYSSAL__.regionLoading,
    );
    await phone.click("#region-select");
    await phone.click('[data-choice-value="odyssey"]');
    await phone.waitForFunction(
      () =>
        window.__ABYSSAL__.expedition.region.id === "odyssey" &&
        !window.__ABYSSAL__.regionLoading,
    );
    await phone.click("#open-guide");
    assert.notEqual(
      await phone.evaluate(() => document.activeElement.id),
      "guide-search",
    );
    assert.ok(
      await phone.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await phone.screenshot({ path: `${out}/final_phone_${w}_guide.png` });
    await phone.locator(".guide-close").click();
    await phone.click("#start");
    await phone.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    assert.ok(
      await phone.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await phone.screenshot({ path: `${out}/final_phone_${w}_play.png` });
    await context.close();
  }
  report.checks.push(
    `Native ${report.guide.length} bilingual Guide specimens, isolated combat/recovery, feeding/respawn, pause, eight-region switching, two touch widths`,
  );
  assert.deepEqual(report.errors, []);
} catch (e) {
  report.fatal = e.stack;
} finally {
  await writeFile(`${out}/native_review.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
if (report.fatal) throw new Error(report.fatal);
console.log(
  JSON.stringify({
    checks: report.checks,
    guide: report.guide.length,
    errors: report.errors,
    combat: report.combat.map((c) => ({
      kind: c.kind,
      projectiles: c.projectiles,
    })),
  }),
);
