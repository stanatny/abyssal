import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import { BERMUDA_TITAN_DOCKS } from "./fixtures/bermuda_titan_docks.js";
import { getExpedition } from "../src/expedition_config.js";
import { BERMUDA_TITAN_LAYOUT } from "../src/bermuda_cave_config.js";
import {
  createExpeditionObjective,
  advanceExpeditionObjective,
  expeditionObjectiveHint,
} from "../src/expedition_objectives.js";
import { createPlayer, takeDamage } from "../src/simulation.js";
import { t, message } from "../src/i18n.js";
import { createCreature } from "../src/creatures.js";
import { createBermudaTitanRelic } from "../src/bermuda_titan_relic.js";
import {
  bodyRadius,
  isPositionBlocked,
  castSegment,
} from "../src/collision.js";
import { bodyTerrainFloor } from "../src/terrain_contact.js";
import {
  queryStaticColliders,
  castIndexedSegment,
} from "../src/static_collider_grid.js";
import { projectMinimapPosition } from "../src/minimap_rules.js";
import {
  titanLavaContact,
  isTitanLavaCellBlocked,
} from "../src/bermuda_titan_hazards.js";

// 用真实世界工厂、图形资源准备与任务入口联测；不导入或复制主循环的DOM/输入实现。
test("The real Bermuda constructor starts hero and quest material preparation without an external manual call", async () => {
  const old = {
      window: globalThis.window,
      fetch: globalThis.fetch,
      bitmap: globalThis.createImageBitmap,
    },
    requests = [];
  let ocean;
  try {
    globalThis.window = { addEventListener() {} };
    globalThis.fetch = async (url) => {
      requests.push(String(url));
      return { ok: true, blob: async () => new Blob([new Uint8Array(4)]) };
    };
    globalThis.createImageBitmap = async () => ({
      width: 2,
      height: 2,
      close() {},
    });
    ocean = createBermudaOcean(new T.Group());
    for (let i = 0; i < 4; i++)
      await new Promise((resolve) => setTimeout(resolve, 0));
    for (const name of [
      "bermuda_sleeping_titan_hf_color.webp",
      "bermuda_sleeping_titan_hf_metallic_roughness.webp",
      "quest_plaque_hf_color.webp",
    ])
      assert.ok(
        requests.some((url) => url.endsWith(name)),
        `${name}: 自动发出真实prepare请求`,
      );
    assert.equal(ocean.titan.near.material.map?.isTexture, true);
    assert.equal(ocean.titan.near.material.roughnessMap?.isTexture, true);
    assert.equal(ocean.titan.near.material.vertexColors, false);
    assert.equal(ocean.titan.rearNear, null);
    assert.equal(ocean.titan.rearFar, null);
    assert.equal(ocean.titan.rearPose, null);
    assert.equal(ocean.titan.near.name, "bermuda_whole_hf_near");
    assert.equal(ocean.titan.far.name, "bermuda_whole_hf_far");
    assert.equal(
      ocean.titan.near.material.map,
      ocean.titan.front.asset.material.map,
    );
    assert.equal(
      ocean.titan.near.material.roughnessMap,
      ocean.titan.front.asset.material.roughnessMap,
    );
    assert.equal(ocean.titan.near.material.map.colorSpace, T.SRGBColorSpace);
    assert.equal(
      ocean.titan.near.material.roughnessMap.colorSpace,
      T.NoColorSpace,
    );
    assert.equal(ocean.titan.far.material.isMeshStandardMaterial, true);
    for (const key of [
      "map",
      "roughnessMap",
      "metalnessMap",
      "vertexColors",
      "roughness",
      "metalness",
    ])
      assert.equal(
        ocean.titan.far.material[key],
        ocean.titan.front.asset.farMaterial[key],
      );
    assert.notEqual(ocean.titan.near.material, ocean.titan.far.material);
    assert.equal(
      ocean.titan.far.geometry.attributes.position,
      ocean.titan.near.geometry.attributes.position,
    );
    assert.equal(
      ocean.titan.far.geometry.attributes.skinWeight,
      ocean.titan.near.geometry.attributes.skinWeight,
    );
    assert.ok(
      ocean.titan.far.geometry.index.count <
        ocean.titan.near.geometry.index.count,
    );
    assert.equal(
      requests.some((url) => url.includes("bermuda_titan_head_hf_")),
      false,
    );
    assert.equal(
      ocean.titan.root.userData.prepareMaterials,
      ocean.titan.prepare,
    );
    assert.equal(
      ocean.titanQuest.root.userData.prepareMaterials,
      ocean.titanQuest.prepare,
    );
    assert.ok(ocean.titanQuest.root.getObjectByName("bermuda_amber_heart"));
    // 自动启动已经断言完毕；仅在恢复全局依赖前排空所有待完成任务。
    const tasks = [];
    ocean.root.traverse((node) => {
      if (node.userData.prepareMaterials)
        tasks.push(node.userData.prepareMaterials());
    });
    await Promise.all(tasks);
  } finally {
    ocean?.dispose();
    if (old.window === undefined) delete globalThis.window;
    else globalThis.window = old.window;
    globalThis.fetch = old.fetch;
    if (old.bitmap === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = old.bitmap;
  }
});

let fixture;
after(() => fixture?.dispose());
function world() {
  if (!fixture) {
    fixture = createBermudaOcean(new T.Group());
  }
  assert.ok(
    fixture.root.parent && fixture.colliders.length > 0,
    "Integration requires the actual live world",
  );
  fixture.reset();
  return fixture;
}

// 接受的HF构图停靠点，独立于生产代码；真实嘴与地面投影取生产模型/共享规则。
const DOCKS = Object.fromEntries(
  BERMUDA_TITAN_DOCKS.filter((row) => row.kind === "orca").map((row) => [
    row.length,
    { point: row.localPosition, forward: row.localForward },
  ]),
);

function actualDock(ocean, length) {
  const row = DOCKS[length],
    forward = new T.Vector3(...row.forward).transformDirection(
      ocean.titan.pose.matrixWorld,
    ),
    position = new T.Vector3(...row.point).applyMatrix4(
      ocean.titan.pose.matrixWorld,
    ),
    radius = bodyRadius(length),
    avatar = createCreature("orca", 6);
  position.y = Math.max(
    position.y,
    bodyTerrainFloor(position.x, position.z, {
      heightAt: ocean.contactSurface,
      radius,
      length: (length * 0.52) / 0.42,
      margin: 0.4,
      forward,
    }),
  );
  avatar.position.copy(position);
  avatar.scale.setScalar(length);
  avatar.rotation.set(
    Math.asin(forward.y),
    Math.atan2(-forward.x, -forward.z),
    0,
    "YXZ",
  );
  // 当前停靠夹具记录首次接近的静态嘴；不另施一次动画把入口推过8m边界。
  avatar.updateMatrixWorld(true);
  const intakePoint = avatar.userData.getFeedingMouth(new T.Vector3());
  avatar.userData.dispose?.();
  return { position, forward, intakePoint, radius, length };
}
function bodyContacts(ocean, body) {
  return [
    ...queryStaticColliders(ocean.colliders, body.position, body.position, {
      radius: body.radius,
      padding: body.length * 0.52,
    }),
    ...ocean.dynamicContacts(body.position, body.position, {
      radius: body.radius,
      padding: body.length * 0.52,
    }),
  ];
}

test("Actual ordered seals, posed HF access, full-body portal and physical closure feed the real four-lord victory gate", () => {
  const ocean = world(),
    quest = ocean.titanQuest,
    cave = ocean.caves.records[0],
    region = getExpedition("bermuda").region,
    objective = createExpeditionObjective(region),
    player = createPlayer("orca", 25),
    bosses = region.bossInstances.map((b) => ({
      id: b.id,
      enabled: true,
      state: { defeated: false },
    })),
    initialContacts = ocean.colliders.length;
  assert.equal(bosses.length, 4);
  assert.deepEqual(
    quest.records.seals.map((s) => s.id),
    ["wave", "bone", "flame"],
  );
  assert.equal(ocean.navigationColliders, ocean.colliders);
  assert.equal(typeof ocean.dynamicContacts, "function");
  for (let i = 0; i < 3; i++) {
    const record = quest.records.seals[i],
      config = BERMUDA_TITAN_LAYOUT.seals[i];
    assert.equal(cave.contains(record.point, 0), true);
    assert.ok(
      Math.abs(
        record.point.y -
          ocean.contactSurface(config.x, config.z) -
          config.floorOffset,
      ) < 1e-6,
    );
    assert.ok(
      quest
        .step(0, {
          position: record.point,
          previous: record.point,
          playerLength: 25,
        })
        .some((e) => e.kind === "seal" && e.completed === i + 1),
    );
  }
  for (const boss of bosses) boss.state.defeated = true;
  assert.equal(
    advanceExpeditionObjective(objective, player, bosses, {
      titanRelicCollected: quest.state.secured,
    }).won,
    false,
  );
  const away = new T.Vector3(20, -560, -1500);
  for (let i = 0; i < 45; i++)
    quest.step(0.05, { position: away, previous: away });
  ocean.titan.setPose(quest.state);
  const renderedHeart = quest.root.getObjectByName("bermuda_amber_heart"),
    crystalFrame = renderedHeart.getWorldQuaternion(new T.Quaternion());
  assert.ok(
    Math.abs(crystalFrame.dot(ocean.titan.relicQuaternion)) > 1 - 1e-10,
    "The actual world crystal inherits the same current frame as the held anchor",
  );
  assert.ok(
    Math.abs(quest.records.relicQuaternion.dot(crystalFrame)) > 1 - 1e-10,
    "Recorded pickup orientation matches the rendered crystal",
  );
  const body = actualDock(ocean, 25);
  assert.ok(body.intakePoint.distanceTo(quest.records.relic) <= 8);
  assert.equal(
    isPositionBlocked(body.position, {
      radius: body.radius,
      length: 25,
      forward: body.forward,
      colliders: bodyContacts(ocean, body),
    }),
    false,
  );
  assert.ok(
    quest
      .step(0, {
        ...body,
        previous: body.position,
        playerLength: 25,
        previousIntakePoint: body.intakePoint,
      })
      .some((e) => e.kind === "relic_held"),
  );
  assert.equal(quest.state.relicHeld, true);
  assert.equal(quest.state.relicCollected, false);
  assert.equal(
    advanceExpeditionObjective(objective, player, bosses, {
      titanRelicCollected: quest.state.secured,
    }).won,
    false,
  );
  // 这里独立核对真实出口/封门接线；全程走洞和捕食另由导航及原生试玩验收。
  const exit = ocean.caves.exits.find((e) => e.id === "north"),
    forward = new T.Vector3(0, 0, 1),
    start = exit.origin.clone().add(new T.Vector3(0, 40, -25));
  let previous = start.clone();
  quest.step(0, {
    position: start,
    previous: start,
    playerLength: 25,
    forward,
  });
  for (let step = 1; step <= 60; step++) {
    const current = start.clone().add(new T.Vector3(0, 0, step));
    quest.step(0.04, {
      activeTimeDt: 0.04,
      position: current,
      previous,
      playerLength: 25,
      forward,
    });
    previous = current;
  }
  assert.equal(quest.state.escaped, true);
  assert.equal(quest.state.secured, false);
  for (let i = 0; i < 60; i++)
    quest.step(0.05, {
      activeTimeDt: 0.05,
      position: previous,
      previous,
      playerLength: 25,
      forward,
    });
  assert.equal(ocean.caves.isSealed, true);
  assert.ok(ocean.colliders.length > initialContacts);
  assert.equal(quest.state.secured, true);
  assert.equal(quest.state.relicCollected, true);
  assert.equal(
    advanceExpeditionObjective(objective, player, bosses, {
      titanRelicCollected: quest.state.secured,
    }).won,
    true,
  );
  ocean.reset();
  assert.equal(quest.state.relicHeld, false);
  assert.equal(quest.state.secured, false);
  assert.equal(quest.state.completed, 0);
  assert.equal(quest.state.remaining, 5);
  assert.equal(ocean.caves.isSealed, false);
  assert.equal(ocean.colliders.length, initialContacts);
});

test("Actual supported25/30m Orca mouths reach a real crystal surface only during the released forepaw", () => {
  const ocean = world(),
    relic = createBermudaTitanRelic();
  try {
    for (const length of [25, 30]) {
      ocean.titan.setPose({ guardAmount: 0, awareness: 0 });
      const body = actualDock(ocean, length),
        target = ocean.titan.relicPoint.clone();
      assert.ok(
        body.intakePoint.distanceTo(target) <= 8,
        `${length}: real main-Euler mouth, unchanged centre range`,
      );
      assert.equal(
        isPositionBlocked(body.position, {
          radius: body.radius,
          length,
          forward: body.forward,
          colliders: bodyContacts(ocean, body),
        }),
        false,
      );
      // 用同一真实晶簇工厂的世界表面，不能构造伸出护臂的虚拟拾取点。
      relic.root.position.copy(target);
      relic.root.quaternion.copy(ocean.titan.relicQuaternion);
      const surfacePoints = relic.getPickupSurfacePoints(body.intakePoint);
      assert.ok(surfacePoints.some((p) => p.distanceTo(body.intakePoint) <= 8));
      assert.equal(
        ocean.titan.canAccessRelic({
          ...body,
          playerLength: length,
          relicPoint: target,
          surfacePoints,
          guardOpen: true,
          guardAmount: 0,
        }),
        true,
      );
      ocean.titan.setPose({ guardAmount: 1, awareness: 0 });
      relic.root.position.copy(ocean.titan.relicPoint);
      relic.root.quaternion.copy(ocean.titan.relicQuaternion);
      assert.equal(
        ocean.titan.canAccessRelic({
          ...body,
          playerLength: length,
          relicPoint: ocean.titan.relicPoint,
          surfacePoints: relic.getPickupSurfacePoints(body.intakePoint),
          guardOpen: true,
          guardAmount: 1,
        }),
        false,
        "A visible exposed tip does not release the actual closed grip",
      );
    }
  } finally {
    relic.dispose();
    ocean.reset();
  }
});

test("World updates used by menus and preparation do not advance the active quest or duplicate contacts", () => {
  const ocean = world(),
    quest = ocean.titanQuest,
    point = quest.records.seals[0].point,
    before = structuredClone(quest.state),
    count = ocean.colliders.length;
  for (let i = 0; i < 200; i++)
    ocean.update(i * 0.04, point, 0.04, false, point, true);
  assert.deepEqual(quest.state, before);
  assert.equal(ocean.colliders.length, count);
  assert.equal(new Set(ocean.colliders).size, count);
  assert.deepEqual(quest.step(2, { active: false, position: point }), []);
  assert.deepEqual(quest.state, before);
});

const hazardWait = new T.Vector3(
    -131.131368891,
    -607.393985305,
    -1604.682573228,
  ),
  hazardAway = new T.Vector3(-20, -450, -1250);
function setHazardPhase(quest, phase) {
  Object.assign(quest.state, {
    phase,
    phaseDuration: phase === "charging" ? 2.5 : phase === "breath" ? 3 : 5,
    remaining: phase === "charging" ? 1 : phase === "breath" ? 3 : 5,
  });
}
function hazardStep(quest, position, forward, length = 30, dt = 0) {
  return quest.step(dt, {
    activeTimeDt: dt,
    position,
    previous: position,
    forward,
    playerLength: length,
  });
}
function advanceHazards(quest, forward, seconds) {
  hazardStep(quest, hazardAway, forward);
  for (let elapsed = 0; elapsed < seconds - 1e-8; elapsed += 0.1)
    hazardStep(
      quest,
      hazardAway,
      forward,
      30,
      Math.min(0.1, seconds - elapsed),
    );
}
function renderHazards(ocean, position = hazardWait) {
  ocean.titanQuest.update(1, position);
  return {
    stream: ocean.titanQuest.root.getObjectByName(
      "titan_complete_molten_salvo",
    ),
    marks: ocean.titanQuest.root.getObjectByName("titan_hazard_ground_marks"),
  };
}
function primeActualLava(ocean, seed) {
  ocean.reset();
  ocean.titanQuest.reset({ seed });
  setHazardPhase(ocean.titanQuest, "charging");
  hazardStep(ocean.titanQuest, hazardWait, ocean.titan.approachForward);
  return ocean.titanQuest.hazards.lava.warningSheets;
}

// 在真实落点上找原体型能站立的海床姿态；不扩大伤害/取宝半径，不用空中假落点。
function legalLavaLanding(ocean, path, length = 30) {
  for (const forward of [
    ocean.titan.approachForward.clone(),
    new T.Vector3(0, 0, -1),
    new T.Vector3(1, 0, 0),
  ]) {
    const position = new T.Vector3(path.impact.x, 0, path.impact.z),
      radius = bodyRadius(length);
    position.y = bodyTerrainFloor(position.x, position.z, {
      heightAt: ocean.contactSurface,
      radius,
      length: (length * 0.52) / 0.42,
      margin: 0.4,
      forward,
    });
    const body = { position, forward, length, radius };
    if (
      !isPositionBlocked(position, {
        ...body,
        colliders: bodyContacts(ocean, body),
      })
    )
      return body;
  }
  return null;
}

test("Real travelling lava reaches a legal seabed landing, shares forty-point damage and leaves a cooling pool before cleanup", (t) => {
  const ocean = world(),
    quest = ocean.titanQuest,
    restMouth = ocean.titan.mouth.clone(),
    restDirection = ocean.titan.direction.clone();
  let chosen = null;
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const paths = primeActualLava(ocean, seed);
    assert.equal(quest.hazards.lava.phase, "warning");
    assert.equal(
      paths.length,
      1,
      "real whole-sheet clearance must leave a continuous outpouring",
    );
    const warningVisuals = renderHazards(ocean);
    assert.equal(warningVisuals.stream.visible, false);
    assert.equal(warningVisuals.stream.geometry.drawRange.count, 0);
    assert.equal(warningVisuals.marks.visible, true);
    const lockedTargets = paths.map((p) => p.impact);
    for (const path of paths) {
      const body = legalLavaLanding(ocean, path);
      if (!body) continue;
      assert.equal(
        hazardStep(quest, body.position, body.forward).some((e) => e.damage),
        false,
      );
      setHazardPhase(quest, "breath");
      hazardStep(quest, body.position, body.forward);
      assert.equal(
        quest.hazards.lava.paths.length,
        0,
        "unemitted lava cannot damage a distant landing",
      );
      advanceHazards(quest, body.forward, 1.1);
      assert.deepEqual(
        quest.hazards.lava.paths.map((p) => p.impact),
        lockedTargets,
      );
      if (
        isPositionBlocked(body.position, {
          ...body,
          colliders: bodyContacts(ocean, body),
        })
      )
        continue;
      const hit = hazardStep(quest, body.position, body.forward, 25).find(
        (e) => e.kind === "hazard_hit" && e.source === "lava",
      );
      if (hit) {
        chosen = { seed, body, hit };
        break;
      }
      setHazardPhase(quest, "charging");
    }
    if (chosen) break;
  }
  assert.ok(
    chosen,
    "finite-radius lava must hit a real floor-supported, collision-free body",
  );
  const { body, hit, seed } = chosen,
    player = createPlayer("mechanical_shark", 25),
    lava = quest.hazards.lava;
  assert.equal(hit.damage, 40);
  assert.equal(lava.phase, "active");
  const actualMouthPose = ocean.titan.front.getMouthPose();
  assert.ok(ocean.titan.mouth.distanceTo(actualMouthPose.position) < 1e-8);
  assert.ok(ocean.titan.direction.distanceTo(actualMouthPose.direction) < 1e-8);
  for (const path of lava.paths) {
    assert.equal(path.points.length, 13);
    assert.ok(
      new T.Vector3().copy(path.points[0]).distanceTo(ocean.titan.mouth) < 1e-8,
    );
    assert.ok(
      Math.abs(
        path.impact.y -
          ocean.contactSurface(path.impact.x, path.impact.z) -
          0.12,
      ) < 1e-8,
    );
    assert.equal(path.impactHeight, 4);
  }
  assert.equal(
    titanLavaContact(lava.paths, body.position, body.position, {
      ...body,
      length: 25,
    }),
    true,
  );
  const before = player.health;
  assert.equal(takeDamage(player, hit.damage), true);
  assert.ok(Math.abs(before - player.health - 40 / 1.5) < 1e-8);
  assert.equal(takeDamage(player, hit.damage), false);
  assert.equal(
    hazardStep(quest, body.position, body.forward, 25).some(
      (e) => e.kind === "hazard_hit",
    ),
    false,
  );
  const { stream } = renderHazards(ocean, body.position),
    buffer = stream.geometry.getAttribute("position");
  assert.equal(stream.visible, true);
  assert.ok(stream.geometry.drawRange.count > 0);
  assert.equal(
    lava.sheets,
    lava.paths,
    "one authoritative volume, no decorative ray replica",
  );
  for (const [i, sheet] of lava.sheets.entries()) {
    assert.equal(sheet.type, "molten_sheet");
    assert.ok(
      sheet.width >= 18,
      "an actual broad fan, not a widened narrow ray",
    );
    assert.equal(sheet.tetrahedra.length, sheet.cells.length * 6);
    assert.ok(sheet.flow && sheet.flow.to === 1 && sheet.flow.connectedToMouth);
    const range = stream.userData.pathRanges[i];
    assert.ok(range.vertexCount >= sheet.vertices.length);
    for (const [index, vertex] of sheet.vertices.entries())
      assert.ok(
        new T.Vector3()
          .fromBufferAttribute(buffer, range.firstVertex + index)
          .distanceTo(new T.Vector3().copy(vertex)) < 0.1,
        "rendered closed skin must consume the actual damaging sheet vertices",
      );
  }
  const frozen = structuredClone(quest.state),
    frozenHazards = structuredClone(quest.hazards),
    mouth = ocean.titan.mouth.clone();
  assert.deepEqual(
    quest.step(2, { active: false, position: body.position }),
    [],
  );
  ocean.update(100, body.position, 0.05, false, body.position, true);
  assert.deepEqual(quest.state, frozen);
  assert.deepEqual(quest.hazards, frozenHazards);
  assert.ok(ocean.titan.mouth.distanceTo(mouth) < 1e-8);
  // 真实步进完成喷射，保留cycle与同帧头姿；不能手工跳phase令嘴和尾段瞬移。
  const previousCycle = quest.state.cycles;
  advanceHazards(quest, body.forward, quest.state.remaining);
  assert.equal(quest.state.phase, "cooldown");
  assert.equal(quest.state.cycles, previousCycle + 1);
  assert.equal(
    hazardStep(quest, hazardAway, body.forward).some((e) => e.damage),
    false,
  );
  assert.equal(quest.hazards.lava.emitting, false);
  assert.equal(quest.hazards.lava.lifecycle, "draining");
  assert.ok(quest.hazards.lava.paths.every((p) => !p.flow.connectedToMouth));
  assert.equal(
    hazardStep(quest, body.position, body.forward).find(
      (e) => e.kind === "hazard_hit" && e.source === "lava",
    )?.damage,
    40,
    "Stopped mouth does not make the visible travelling tail or hot landing harmless",
  );
  advanceHazards(quest, body.forward, 4.0);
  assert.equal(quest.hazards.lava.paths.length, 0);
  assert.ok(quest.hazards.lava.pools.length > 0);
  assert.ok(
    quest.hazards.lava.pools.every((p) => !p.harmful && p.temperature < 0.25),
  );
  assert.equal(
    hazardStep(quest, body.position, body.forward).some((e) => e.damage),
    false,
  );
  advanceHazards(quest, body.forward, 0.7);
  assert.equal(quest.hazards.lava.phase, "off");
  assert.deepEqual(quest.hazards.lava.paths, []);
  assert.deepEqual(quest.hazards.lava.pools, []);
  assert.equal(renderHazards(ocean, body.position).stream.visible, false);
  ocean.reset();
  assert.ok(ocean.titan.mouth.distanceTo(restMouth) < 1e-8);
  assert.ok(ocean.titan.direction.distanceTo(restDirection) < 1e-8);
  assert.equal(quest.hazards.lava.phase, "off");
  assert.deepEqual(quest.hazards.lava.paths, []);
  assert.equal(
    renderHazards(ocean, body.position).stream.geometry.drawRange.count,
    0,
  );
  t.diagnostic(
    JSON.stringify({
      seed,
      landing: body.position.toArray(),
      forward: body.forward.toArray(),
      damage: hit.damage,
    }),
  );
});

test("Actual-world off-centre cover blocks the real stream; removing it restarts at the mouth on the same locked landing", (t) => {
  const ocean = world(),
    quest = ocean.titanQuest,
    warning = primeActualLava(ocean, 7),
    lockedSites = warning.map((p) => p.siteId),
    count = ocean.colliders.length;
  assert.equal(warning.length, 1);
  setHazardPhase(quest, "breath");
  advanceHazards(quest, ocean.titan.approachForward, 1.1);
  const complete = structuredClone(quest.hazards.lava.paths);
  assert.deepEqual(
    complete.map((p) => p.siteId),
    lockedSites,
  );
  assert.ok(renderHazards(ocean).stream.visible);
  // 非中心扇面也必须与真实岩壁/当前姿态相容，不能只证明中央导引线可达。
  for (const sheet of complete)
    for (const cell of sheet.cells) {
      const center = new T.Vector3()
          .addVectors(cell.bounds.min, cell.bounds.max)
          .multiplyScalar(0.5),
        padding =
          new T.Vector3()
            .subVectors(cell.bounds.max, cell.bounds.min)
            .length() / 2,
        source = queryStaticColliders(ocean.colliders, center, center, {
          radius: padding,
        }),
        contacts = cell.nearMouth
          ? source.filter((c) => !c.titanBreathIgnore)
          : [
              ...source,
              ...ocean.dynamicContacts(center, center, {
                radius: padding,
                padding: 0,
              }),
            ];
      assert.equal(
        isTitanLavaCellBlocked(cell, contacts),
        false,
        `whole volume cell ${cell.row}/${cell.column}`,
      );
    }
  const blockers = complete.map((sheet, i) => {
    const cell = sheet.cells.find((c) => c.row === 7 && c.column === 1),
      center = new T.Vector3()
        .addVectors(cell.bounds.min, cell.bounds.max)
        .multiplyScalar(0.5);
    assert.ok(
      Math.abs(cell.column - (sheet.columns - 2) / 2) > 2,
      "cover is intentionally away from the centre ray",
    );
    return {
      id: `integration_real_lava_cover_${i}`,
      type: "box",
      x: center.x,
      y: center.y,
      z: center.z,
      center,
      halfSize: new T.Vector3(1.5, 1.5, 1.5),
      rotation: new T.Quaternion(),
    };
  });
  try {
    ocean.colliders.push(...blockers);
    for (const [i, sheet] of complete.entries())
      assert.ok(
        sheet.cells.some((cell) => isTitanLavaCellBlocked(cell, [blockers[i]])),
        "off-centre solid intersects actual sheet volume",
      );
    hazardStep(quest, hazardAway, ocean.titan.approachForward);
    assert.equal(quest.hazards.lava.emitting, false);
    assert.deepEqual(
      quest.hazards.lava.paths,
      [],
      "an obstructed locked salvo must be omitted as a whole, never shortened",
    );
    const blockedVisuals = renderHazards(ocean);
    assert.equal(blockedVisuals.stream.visible, false);
    assert.equal(blockedVisuals.stream.geometry.drawRange.count, 0);
    ocean.colliders.splice(count, blockers.length);
    hazardStep(quest, hazardAway, ocean.titan.approachForward);
    assert.equal(
      quest.hazards.lava.paths.length,
      0,
      "restored source begins at the mouth instead of flashing back as a full sheet",
    );
    advanceHazards(quest, ocean.titan.approachForward, 1.1);
    assert.deepEqual(
      quest.hazards.lava.paths.map((p) => p.siteId),
      lockedSites,
    );
    assert.ok(quest.hazards.lava.paths.every((p) => p.points.length === 13));
    assert.ok(renderHazards(ocean).stream.visible);
    t.diagnostic(
      JSON.stringify({
        completeSites: lockedSites,
        temporaryCovers: blockers.map((b) => ({
          id: b.id,
          center: b.center.toArray(),
        })),
      }),
    );
  } finally {
    ocean.colliders.splice(count);
    ocean.reset();
  }
});

test("Real objective and phased state messages remain bilingual and next seal/relic points project inside the expanded minimap", () => {
  const ocean = world(),
    region = getExpedition("bermuda").region,
    objective = createExpeditionObjective(region),
    player = createPlayer("orca", 25);
  for (const text of [
    message`巨兽正在苏醒 · 撤离洞穴 ${60}秒`,
    message`已逃出 · 洞口封闭中 ${3}秒`,
    "前爪已卸重 · 取走晶核后退开",
    "前爪压护晶核 · 等待睡梦松掌",
  ])
    assert.equal(/[\u3400-\u9fff]/u.test(t(text, [], "en")), false);
  for (const phase of [
    "吐息间歇",
    "岩浆蓄热",
    "岩浆喷发",
    "地面熔池仍炽热 · 绕开余温区域",
  ]) {
    const text = message`巢穴封印 ${2}/3 · ${phase} ${5}秒`;
    assert.equal(/[\u3400-\u9fff]/u.test(t(text, [], "en")), false);
    assert.ok(t(text, [], "zh-CN").includes(phase));
  }
  for (const collected of [false, true]) {
    objective.titanRelicCollected = collected;
    assert.equal(
      /[\u3400-\u9fff]/u.test(
        t(expeditionObjectiveHint(objective, player), [], "en"),
      ),
      false,
    );
  }
  for (const p of [
    ...ocean.titanQuest.records.seals.map((s) => s.point),
    ocean.titanQuest.records.relic,
  ]) {
    const projected = projectMinimapPosition(p, region.world);
    assert.ok(
      projected.x > 0 &&
        projected.x < 120 &&
        projected.y > 0 &&
        projected.y < 120,
    );
  }
});
