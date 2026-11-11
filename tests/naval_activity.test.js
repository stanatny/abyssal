import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createHumanActivity, HUMAN_CATALOG } from "../src/human_activity.js";
import { HUMAN_RULES, SUBMARINE_DEFENSE_RULES } from "../src/human_rules.js";
import { createPlayer } from "../src/simulation.js";
import {
  getNavalMinefields,
  navalMinefieldSlot,
} from "../src/naval_minefields.js";
import { REGIONS } from "../src/expedition_config.js";
import { setLanguage, t } from "../src/i18n.js";

test("Every enabled region owns four intact minefields; disabled maps hide all mines and reset restores the same shared pool", () => {
  const a = createHumanActivity(new THREE.Scene());
  const pool = a.hazards.map((e) => e.mesh);
  try {
    for (const r of REGIONS) {
      a.reset({ ...r.humanActivity, regionId: r.id });
      const enabled = ["hawaii", "atlantis", "bermuda"].includes(r.id);
      assert.equal(
        a.hazards.filter((e) => e.active).length,
        enabled ? 48 : 0,
        r.id,
      );
      assert.deepEqual(
        a.hazards.map((e) => e.mesh),
        pool,
      );
      assert.equal(
        a.hazards.filter((e) => e.warning.visible).length,
        enabled ? 48 : 0,
      );
      if (!enabled) continue;
      assert.equal(new Set(a.hazards.map((e) => e.fieldId)).size, 4);
      for (let i = 0; i < a.hazards.length; i++) {
        const p = navalMinefieldSlot(r.id, i),
          e = a.hazards[i];
        assert.equal(e.fieldId, p.fieldId);
        assert.deepEqual(e.mesh.position.toArray(), [p.x, p.y, p.z]);
        assert.equal(e.mesh.userData.contactRadius, 1.8);
      }
      const positions = a.hazards.map((e) => e.mesh.position.toArray());
      a.hazards[0].active = false;
      a.reset({ ...r.humanActivity, regionId: r.id });
      assert.deepEqual(
        a.hazards.map((e) => e.mesh.position.toArray()),
        positions,
      );
      assert.ok(a.hazards.every((e) => e.active));
    }
  } finally {
    a.dispose();
  }
});

test("Approaching a dense field gives an early warning; a clear bypass and disabled field do not", () => {
  const events = [],
    a = createHumanActivity(new THREE.Scene(), {
      notify: (m) => events.push(t(m)),
    });
  try {
    const player = createPlayer(),
      f = new THREE.Vector3(0, 0, -1),
      center = getNavalMinefields("hawaii")[0].center;
    a.update(
      0.016,
      1,
      player,
      new THREE.Vector3(center[0], center[1], center[2] + 55),
      f,
    );
    assert.ok(events.some((m) => m.includes("密集雷区")));
    events.length = 0;
    a.update(0.016, 9, player, new THREE.Vector3(0, center[1], center[2]), f);
    assert.ok(!events.some((m) => m.includes("水雷") || m.includes("雷区")));
    a.reset({
      mines: false,
      swimmers: false,
      divers: false,
      submarines: false,
    });
    events.length = 0;
    a.update(0.016, 20, player, new THREE.Vector3(...center), f);
    assert.equal(events.length, 0);
  } finally {
    a.dispose();
  }
});

test("Crossing adjacent mines detonates each touched mine once, keeps invulnerability and reports actual armored damage", () => {
  const notices = [],
    damage = [],
    a = createHumanActivity(new THREE.Scene(), {
      notify: (m) => notices.push(t(m)),
      onDamage: (n) => damage.push(n),
    });
  try {
    const player = createPlayer("mechanical_shark", 3);
    let pair,
      separation = Infinity;
    // 沿真实相邻雷体的三维连线扫掠，不再假设它们排在同一水平线上。
    for (let i = 0; i < a.hazards.length; i++)
      for (let j = i + 1; j < a.hazards.length; j++) {
        const distance = a.hazards[i].mesh.position.distanceTo(
          a.hazards[j].mesh.position,
        );
        if (distance < separation) {
          separation = distance;
          pair = [a.hazards[i].mesh.position, a.hazards[j].mesh.position];
        }
      }
    const forward = pair[1].clone().sub(pair[0]).normalize();
    const run = () =>
      a.onMovement(
        player,
        pair[0].clone().addScaledVector(forward, -5),
        pair[1].clone().addScaledVector(forward, 5),
        forward,
        { speed: 100, now: 1 },
      );
    const contacts = run().filter((e) => e.kind === "torpedo");
    assert.ok(contacts.length >= 2);
    assert.equal(
      new Set(contacts.map((e) => e.entry.id)).size,
      contacts.length,
    );
    assert.equal(damage.length, 1);
    assert.ok(Math.abs(damage[0] - HUMAN_RULES.torpedoDamage / 1.5) < 1e-8);
    assert.ok(Math.abs(player.health - (100 - damage[0])) < 1e-8);
    assert.ok(notices.includes(`水雷爆炸 · 生命 -${Math.round(damage[0])}`));
    assert.equal(run().filter((e) => e.kind === "torpedo").length, 0);
    assert.equal(damage.length, 1);
    a.reset();
    assert.ok(a.hazards.every((e) => e.active));
  } finally {
    a.dispose();
  }
});

test("Both Guide languages describe the shared faster shot rules and dense minefield inventory", () => {
  try {
    for (const lang of ["zh-CN", "en"]) {
      setLanguage(lang);
      const shot = HUMAN_CATALOG.find((e) => e.kind === "attack_torpedo").text,
        mine = HUMAN_CATALOG.find((e) => e.kind === "torpedo");
      for (const n of [
        SUBMARINE_DEFENSE_RULES.minimumLength,
        SUBMARINE_DEFENSE_RULES.windup,
        SUBMARINE_DEFENSE_RULES.speed,
        SUBMARINE_DEFENSE_RULES.damage,
        SUBMARINE_DEFENSE_RULES.cooldown,
        SUBMARINE_DEFENSE_RULES.lifetime,
      ])
        assert.ok(shot.includes(String(n)));
      assert.ok(mine.text.includes(String(HUMAN_RULES.torpedoCount)));
      if (lang === "en")
        for (const copy of [shot, mine.text, t(mine.habitat), t(mine.counter)])
          assert.ok(!/[\u3400-\u9fff]/u.test(copy));
    }
  } finally {
    setLanguage("zh-CN");
  }
});
