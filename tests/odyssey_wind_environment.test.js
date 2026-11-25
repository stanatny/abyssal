import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  isPositionBlocked,
  bodyRadius,
  resolveMotion,
  castBodySegment,
  castSegment,
} from "../src/collision.js";
import {
  createOdysseyWindEnvironment,
  createOdysseyWindGateColliders,
} from "../src/odyssey_wind_environment.js";

const gate = {
  id: "test_gate",
  center: [0, -80, -300],
  normal: [0, 0, -1],
  width: 60,
  height: 55,
  throat: 8,
};
import { createTideLayout, TIDE_PORTS } from "../src/odyssey_tide_layout.js";
import { makeTideVariant, traceTideGate } from "../src/odyssey_tide_rules.js";
import { odysseySeabedHeight, ODYSSEY_WORLD } from "../src/odyssey_config.js";
import {
  FITTED_WIND_GATES,
  HOMEWARD_FINISH,
  HOMEWARD_PATH,
} from "../src/odyssey_wind_trial.js";
import { createOdysseyOcean } from "../src/odyssey_ocean.js";
import { POLYPHEMUS_SITE } from "../src/odyssey_polyphemus_site.js";
import { buildPolyphemusHF } from "../src/polyphemus_hf_asset.js";
const floor = () => -140;

test("bronze frame and HF supports preserve the declared aperture for grown whole bodies", () => {
  const colliders = createOdysseyWindGateColliders(gate, floor);
  assert.equal(colliders.length, 10);
  for (const length of [25, 30]) {
    for (const side of [-1, 1]) {
      const forward = new THREE.Vector3(0, 0, side);
      for (const x of [-23, 0, 23]) {
        const start = new THREE.Vector3(x, -80, -300 - 50 * side);
        const end = new THREE.Vector3(x, -80, -300 + 50 * side);
        assert.equal(
          isPositionBlocked(start, {
            colliders,
            length,
            forward,
            radius: bodyRadius(length),
          }),
          false,
        );
        const result = resolveMotion(start, end, {
          colliders,
          length,
          forward,
          radius: bodyRadius(length),
        });
        assert.equal(result.blocked, false);
        assert.ok(
          new THREE.Vector3(
            result.position.x,
            result.position.y,
            result.position.z,
          ).distanceTo(end) < 0.01,
        );
      }
    }
  }
  assert.equal(
    isPositionBlocked(new THREE.Vector3(33, -80, -300), {
      colliders,
      radius: 1,
      length: 0,
    }),
    true,
  );
});

test("rotated gates retain true hole access and reject supports that meet their aperture", () => {
  const turned = { ...gate, normal: [1, 0, 0] };
  const colliders = createOdysseyWindGateColliders(turned, floor);
  const result = resolveMotion(
    new THREE.Vector3(-50, -80, -300),
    new THREE.Vector3(50, -80, -300),
    {
      colliders,
      length: 30,
      forward: new THREE.Vector3(1, 0, 0),
      radius: bodyRadius(30),
    },
  );
  assert.equal(result.blocked, false);
  assert.throws(
    () => createOdysseyWindGateColliders(gate, () => -95),
    /intrudes/,
  );
});

test("explicit trial water freezes at pause and clears all owned resources", () => {
  const environment = createOdysseyWindEnvironment({
    gateDefs: [gate],
    heightAt: floor,
    homewardPath: [
      [0, -80, -500],
      [0, -60, -300],
      [0, -40, -100],
    ],
  });
  const parent = new THREE.Group();
  parent.add(environment.group);
  const phases = {
    gates: {
      test_gate: {
        defeated: true,
        variant: makeTideVariant(),
        rotations: [2, 1, 0, 3],
        testRotations: [2, 1, 0, 3],
        testing: true,
      },
    },
    homewardAvailable: false,
  };
  environment.update(1, 1, phases);
  const flow = environment.group.getObjectByName(
    "test_gate_actual_direction_water",
  );
  const matrix = flow.instanceMatrix.array.slice();
  const vane = environment.group.getObjectByName("test_gate_wind_vane");
  const rotation = vane.rotation.z;
  assert.equal(flow.material.color.getHex(), 0x92e3df);
  assert.equal(flow.visible, true);
  environment.update(0, 100, phases);
  assert.deepEqual(flow.instanceMatrix.array, matrix);
  assert.equal(vane.rotation.z, rotation);
  environment.update(1, 101, {
    gates: {
      test_gate: {
        defeated: true,
        variant: makeTideVariant(),
        rotations: [2, 1, 0, 3],
        testing: false,
        solved: true,
        stabilized: true,
        result: "solved",
      },
    },
    homewardAvailable: true,
  });
  assert.equal(
    environment.group.getObjectByName("aeolus_homeward_current").visible,
    true,
  );
  let disposed = 0;
  let disposedInstances = 0;
  let instanceCount = 0;
  const seen = new Set();
  environment.group.traverse((node) => {
    if (node.isInstancedMesh) {
      instanceCount++;
      node.addEventListener("dispose", () => disposedInstances++);
    }
    if (node.geometry && !seen.has(node.geometry)) {
      seen.add(node.geometry);
      node.geometry.addEventListener("dispose", () => disposed++);
    }
  });
  environment.dispose();
  environment.dispose();
  assert.equal(parent.children.length, 0);
  assert.equal(environment.group.children.length, 0);
  assert.equal(environment.state.disposed, true);
  assert.equal(disposed, seen.size);
  assert.equal(instanceCount, 3);
  assert.equal(disposedInstances, instanceCount);
});

test("a late generated monument cannot attach after environment disposal", async () => {
  let resolve;
  const pending = new Promise((done) => (resolve = done));
  const environment = createOdysseyWindEnvironment({
    heightAt: () => -400,
    monument: { position: [0, 50, -300] },
    loadMonument: () => pending,
  });
  await Promise.resolve();
  environment.dispose();
  resolve({ vertices: 0 });
  await environment.prepareMonument();
  await Promise.resolve();
  assert.equal(environment.group.children.length, 0);
});

test("Aeolus uses the actual generated textured full statue and a uniformly normalized mesh", async () => {
  const { default: data } = await import(
    "../src/assets/models/aeolus_hf_mesh.json",
    { with: { type: "json" } }
  );
  assert.equal(data.source, "Microsoft TRELLIS.2-4B");
  assert.equal(
    data.sourceSha256,
    "134aa34de9f591e6bfca9a147cf2067e317a615e36ebc79827e2b7d9aa615865",
  );
  assert.ok(data.triangles >= 22000 && data.triangles <= 30000);
  assert.ok(data.vertices <= 65535);
  assert.equal(data.min[1], -0.5);
  assert.equal(data.max[1], 0.5);
  const environment = createOdysseyWindEnvironment({
    heightAt: () => -250,
    monument: { position: [0, 98, 0], height: 180, textureUrl: false },
  });
  await environment.prepareMonument();
  assert.equal(environment.state.monument, "ready");
  const statue = environment.group.getObjectByName(
    "aeolus_hf_wind_keeper_monument",
  );
  assert.ok(statue);
  assert.equal(statue.scale.x, 180);
  assert.equal(statue.scale.y, 180);
  assert.equal(statue.scale.z, 180);
  statue.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(statue);
  assert.ok(Math.abs(bounds.min.y + 200) < 0.001);
  assert.ok(Math.abs(bounds.max.y + 20) < 0.001);
  for (const value of statue.geometry.attributes.normal.array)
    assert.ok(Number.isFinite(value));
  environment.dispose();
});

test("failed gate construction releases earlier private instances and buffers", () => {
  const original = THREE.InstancedMesh.prototype.dispose;
  let released = 0;
  THREE.InstancedMesh.prototype.dispose = function () {
    released++;
    return original.call(this);
  };
  try {
    assert.throws(
      () =>
        createOdysseyWindEnvironment({
          gateDefs: [
            gate,
            { ...gate, id: "bad_gate", center: [100, -130, -300] },
          ],
          heightAt: floor,
        }),
      /intrudes/,
    );
    assert.equal(released, 2);
  } finally {
    THREE.InstancedMesh.prototype.dispose = original;
  }
});

test("a failed monument loader exposes its actual error instead of reporting readiness", async () => {
  const environment = createOdysseyWindEnvironment({
    heightAt: () => -250,
    monument: { position: [0, 98, 0], height: 180 },
    loadMonument: () =>
      Promise.reject(new Error("Synthetic monument loader failure")),
  });
  assert.equal(await environment.prepare(), false);
  assert.equal(environment.state.monument, "error");
  assert.equal(
    environment.state.lastError,
    "Synthetic monument loader failure",
  );
  assert.equal(
    environment.group.getObjectByName("aeolus_hf_wind_keeper_monument"),
    undefined,
  );
  environment.dispose();
});

test("the shared board layout matches viewer directions and front contact geometry for 25/30m bodies", () => {
  for (const normal of [
    [0, 0, -1],
    [1, 0, 0],
  ]) {
    const definition = { ...gate, normal };
    const layout = createTideLayout(definition, floor);
    const environment = createOdysseyWindEnvironment({
      gateDefs: [definition],
      heightAt: floor,
    });
    try {
      environment.group.updateMatrixWorld(true);
      const up = new THREE.Vector3(0, 1, 0),
        right = new THREE.Vector3(...layout.right),
        front = new THREE.Vector3(...layout.front);
      assert.deepEqual(TIDE_PORTS, [
        [0, 1, 0],
        [1, 0, 0],
        [0, -1, 0],
        [-1, 0, 0],
      ]);
      assert.ok(
        new THREE.Vector3(...layout.rotors[1].position)
          .sub(new THREE.Vector3(...layout.rotors[0].position))
          .dot(right) > 47.99,
      );
      assert.ok(
        new THREE.Vector3(...layout.rotors[0].position)
          .sub(new THREE.Vector3(...layout.rotors[2].position))
          .dot(up) > 35.99,
      );
      for (const control of [...layout.rotors, layout.master]) {
        const visible = environment.group.getObjectByName(
          control.index === undefined
            ? `${definition.id}_master_contact_knob`
            : `${definition.id}_rotor_${control.index}_contact_anchor`,
        );
        const knob = new THREE.Vector3(...control.position);
        assert.ok(
          visible.getWorldPosition(new THREE.Vector3()).distanceTo(knob) < 1e-7,
        );
        for (const length of [25, 30]) {
          const forward = front.clone().negate();
          const end = knob.clone().addScaledVector(front, length * 0.42 + 1);
          const start = end.clone().addScaledVector(front, 12);
          assert.equal(
            castBodySegment(start, end, {
              length,
              forward,
              radius: bodyRadius(length),
              colliders: environment.colliders,
            }),
            null,
          );
          const result = resolveMotion(start, end, {
            length,
            forward,
            radius: bodyRadius(length),
            colliders: environment.colliders,
          });
          assert.equal(result.blocked, false);
          const nose = new THREE.Vector3(
            result.position.x,
            result.position.y,
            result.position.z,
          ).addScaledVector(forward, length * 0.42);
          assert.ok(nose.distanceTo(knob) < 3.5);
          assert.equal(castSegment(end, knob, environment.colliders, 0), null);
        }
      }
    } finally {
      environment.dispose();
    }
  }
});

test("pipe selection is observable but never reveals correctness before an explicit test", () => {
  const e = createOdysseyWindEnvironment({ gateDefs: [gate], heightAt: floor });
  try {
    const s = {
      defeated: true,
      variant: makeTideVariant(),
      rotations: [2, 1, 0, 3],
    };
    e.update(0.45, 0, { gates: { test_gate: s } });
    const flow = e.group.getObjectByName("test_gate_actual_direction_water"),
      frame = e.group.getObjectByName("test_gate_wind_channels");
    assert.equal(flow.visible, false);
    const emission = frame.material.emissiveIntensity;
    for (let i = 0; i < 4; i++) {
      const rotor = e.group.getObjectByName(
        `test_gate_rotor_${i}_moving_channel`,
      );
      assert.ok(
        Math.abs(Math.sin(rotor.rotation.z + (s.rotations[i] * Math.PI) / 2)) <
          1e-7,
      );
      assert.equal(
        e.group.getObjectByName(`test_gate_guardian_lock_${i}`).visible,
        false,
      );
    }
    e.update(0.45, 1, {
      gates: { test_gate: { ...s, rotations: [0, 0, 0, 0] } },
    });
    assert.equal(flow.visible, false);
    assert.equal(frame.material.emissiveIntensity, emission);
    assert.equal(
      e.group.getObjectByName("test_gate_solved_water_crown").visible,
      false,
    );
    e.update(0.01, 2, {
      gates: { test_gate: { ...s, testing: true, testRotations: s.rotations } },
    });
    assert.equal(flow.visible, true);
  } finally {
    e.dispose();
  }
});

test("a failed actual test drains at the selected pipe endpoint, resets and permits the same test again", () => {
  const e = createOdysseyWindEnvironment({ gateDefs: [gate], heightAt: floor });
  try {
    const s = {
      defeated: true,
      variant: makeTideVariant(),
      rotations: [0, 0, 0, 0],
      testRotations: [0, 0, 0, 0],
      testing: true,
    };
    const trace = traceTideGate(s.variant, s.rotations);
    e.update(1, 1, { gates: { test_gate: s } });
    const flow = e.group.getObjectByName("test_gate_actual_direction_water");
    const failed = { ...s, testing: false, result: "failed", lastTrace: trace };
    e.update(0.1, 2, { gates: { test_gate: failed } });
    assert.equal(flow.visible, true);
    assert.equal(flow.material.color.getHex(), 0xd6a16d);
    const matrix = new THREE.Matrix4();
    flow.getMatrixAt(0, matrix);
    const start = new THREE.Vector3().setFromMatrixPosition(matrix);
    e.update(0.4, 3, { gates: { test_gate: failed } });
    flow.getMatrixAt(0, matrix);
    assert.ok(
      new THREE.Vector3().setFromMatrixPosition(matrix).y < start.y - 6,
    );
    e.update(3, 4, { gates: { test_gate: failed } });
    assert.equal(flow.visible, false);
    e.update(0.1, 5, { gates: { test_gate: s } });
    e.update(0.1, 6, { gates: { test_gate: failed } });
    assert.equal(flow.visible, true);
  } finally {
    e.dispose();
  }
});

test("Aeolus rises four supported 54m stages, opens its real gate afterwards and resets every contact", async () => {
  const e = createOdysseyWindEnvironment({
    heightAt: () => -250,
    monument: {
      position: [0, 106, 0],
      height: 180,
      riseDistance: 216,
      textureUrl: false,
    },
  });
  await e.prepareMonument();
  try {
    const statue = e.state.monumentMesh;
    const dynamic = e.dynamicColliders;
    const staticSnapshot = JSON.stringify(e.colliders);
    const bands = dynamic.filter((c) =>
      c.id.startsWith("aeolus_actual_statue_band_"),
    );
    const initial = bands.map((c) => c.y);
    const solved = (count) => ({
      gates: Object.fromEntries(
        Array.from({ length: count }, (_, i) => [i, { solved: true }]),
      ),
      homewardAvailable: count === 4,
    });
    const gate = e.state.monumentGate;
    const checkSupports = () => {
      const underside = e.state.monumentPlatformCollider.y - 3;
      for (const id of [
        "aeolus_monument_west_pier",
        "aeolus_monument_east_pier",
      ]) {
        const c = dynamic.find((c) => c.id === id);
        assert.ok(c);
        assert.ok(Math.abs(c.y + c.halfSize.y - underside) < 1e-8);
        assert.ok(
          Math.abs(c.y - c.halfSize.y - e.state.monumentFoundationBottom) <
            1e-8,
        );
        const mesh = e.group.getObjectByName(id);
        assert.equal(mesh.position.y, c.y);
        assert.equal(mesh.scale.y, c.halfSize.y * 2);
      }
      for (const c of e.state.monumentSupportColliders) {
        assert.ok(c.halfSize.y > 0);
        assert.ok(dynamic.includes(c));
        assert.equal(e.colliders.includes(c), false);
      }
      assert.ok(dynamic.length <= 36);
      assert.equal(e.dynamicColliders, dynamic);
      assert.equal(JSON.stringify(e.colliders), staticSnapshot);
      assert.ok(
        e.state.monumentMasonryCount > 0 &&
          e.state.monumentMasonryCount <= 2400,
      );
    };
    assert.equal(statue.position.y, -110);
    assert.equal(bands.length, 24);
    checkSupports();
    e.update(3, 3, solved(1));
    assert.equal(statue.position.y, -83);
    checkSupports();
    const water = e.group.getObjectByName("aeolus_step_rising_water");
    const matrices = water.instanceMatrix.array.slice();
    const contacts = JSON.stringify(dynamic);
    e.update(0, 900, solved(1));
    assert.equal(statue.position.y, -83);
    assert.deepEqual(water.instanceMatrix.array, matrices);
    assert.equal(JSON.stringify(dynamic), contacts);
    e.update(3, 6, solved(1));
    assert.equal(statue.position.y, -56);
    for (let i = 0; i < bands.length; i++)
      assert.equal(bands[i].y - initial[i], 54);
    for (let count = 2; count <= 4; count++) {
      e.update(3, count * 6 - 3, solved(count));
      checkSupports();
      assert.equal(e.state.homewardReady, false);
      e.update(3, count * 6, solved(count));
      assert.equal(statue.position.y, -110 + 54 * count);
      assert.equal(e.state.monumentStep, count);
      checkSupports();
    }
    assert.equal(water.visible, false);
    assert.equal(gate.progress, 0);
    assert.equal(e.state.homewardReady, false);
    assert.equal(e.state.monumentFinalMinY, 16);
    assert.equal(e.state.monumentPlinthFinalMinY, 10);
    const actual = new THREE.Box3().setFromObject(statue);
    assert.ok(actual.min.y > 15.99);
    const gateStart = new THREE.Vector3(0, -45, -80),
      gateEnd = new THREE.Vector3(0, -45, 20);
    assert.ok(
      castBodySegment(gateStart, gateEnd, {
        colliders: dynamic,
        length: 30,
        radius: bodyRadius(30),
        forward: new THREE.Vector3(0, 0, 1),
      }),
    );
    e.update(1.1, 25.1, solved(4));
    assert.ok(gate.progress > 0.49 && gate.progress < 0.51);
    assert.equal(e.state.homewardReady, false);
    const paused = JSON.stringify(gate.colliders);
    e.update(0, 100, solved(4));
    assert.equal(JSON.stringify(gate.colliders), paused);
    e.update(1.1, 26.2, solved(4));
    assert.equal(e.state.homewardReady, true);
    assert.equal(gate.open, true);
    assert.ok(gate.angle > Math.PI / 2);
    assert.equal(
      castBodySegment(gateStart, gateEnd, {
        colliders: dynamic,
        length: 30,
        radius: bodyRadius(30),
        forward: new THREE.Vector3(0, 0, 1),
      }),
      null,
    );
    e.update(0, 27, { gates: {}, homewardAvailable: false });
    assert.equal(statue.position.y, -110);
    assert.equal(e.state.monumentPlatformCollider.y, -203);
    assert.deepEqual(
      bands.map((c) => c.y),
      initial,
    );
    assert.equal(gate.progress, 0);
    assert.equal(e.state.homewardReady, false);
    checkSupports();
  } finally {
    e.dispose();
  }
  assert.equal(e.dynamicColliders.length, 0);
});

test("the current ocean has reachable adult knobs, a fully submerged fitted statue and a clear homeward corridor", async () => {
  const ocean = createOdysseyOcean(new THREE.Group());
  await ocean.windEnvironment.prepareMonument();
  try {
    const e = ocean.windEnvironment;
    assert.deepEqual(e.state.monumentPosition, [-160, -110, -600]);
    assert.ok(e.state.monumentFloorClearance > 19);
    const bounds = new THREE.Box3().setFromObject(e.state.monumentMesh);
    assert.ok(bounds.max.y <= -19.99);
    const all = [...ocean.colliders, ...e.dynamicColliders];
    for (const definition of FITTED_WIND_GATES) {
      const layout = createTideLayout(definition, odysseySeabedHeight);
      for (const control of [...layout.rotors, layout.master])
        for (const length of [25, 30]) {
          const knob = new THREE.Vector3(...control.position),
            front = new THREE.Vector3(...layout.front),
            forward = front.clone().negate();
          const end = knob.clone().addScaledVector(front, length * 0.42 + 1),
            start = end.clone().addScaledVector(front, 10);
          const result = resolveMotion(start, end, {
            colliders: all,
            length,
            forward,
            radius: bodyRadius(length),
            heightAt: ocean.contactSurface,
          });
          assert.equal(
            result.blocked,
            false,
            `${definition.id} ${control.id} ${length}: ${result.collider?.id}`,
          );
          assert.equal(
            castBodySegment(start, end, {
              colliders: all,
              length,
              forward,
              radius: bodyRadius(length),
            }),
            null,
            `${control.id} actual scenery`,
          );
          assert.equal(
            castSegment(end, knob, all, 0),
            null,
            `${control.id} control sight`,
          );
          for (let t = 0; t <= 1; t += 0.1) {
            const p = start.clone().lerp(end, t);
            for (const offset of [-length * 0.42, 0, length * 0.42])
              for (const dx of [-bodyRadius(length), 0, bodyRadius(length)]) {
                const point = p.clone().addScaledVector(forward, offset);
                assert.ok(
                  point.y - bodyRadius(length) >
                    ocean.contactSurface(point.x + dx, point.z) + 0.25,
                  `${control.id} adult terrain`,
                );
              }
          }
        }
    }
    e.update(24, 24, {
      gates: Object.fromEntries(
        Array.from({ length: 4 }, (_, i) => [i, { solved: true }]),
      ),
      homewardAvailable: true,
    });
    assert.equal(e.state.homewardReady, false);
    e.update(2.2, 26.2, {
      gates: Object.fromEntries(
        Array.from({ length: 4 }, (_, i) => [i, { solved: true }]),
      ),
      homewardAvailable: true,
    });
    assert.equal(e.state.homewardReady, true);
    for (let i = 1; i < HOMEWARD_PATH.length; i++)
      assert.equal(
        castSegment(
          new THREE.Vector3(...HOMEWARD_PATH[i - 1]),
          new THREE.Vector3(...HOMEWARD_PATH[i]),
          [...e.colliders, ...e.dynamicColliders],
          5,
        ),
        null,
        `homeward span${i}`,
      );
  } finally {
    ocean.dispose();
  }
});

test("the emerged plinth sits inside a real supporting step and clears the actual four-metre sea", async () => {
  const e = createOdysseyWindEnvironment({
    finish: HOMEWARD_FINISH,
    heightAt: odysseySeabedHeight,
  });
  await e.prepareMonument();
  try {
    e.update(26.2, 26.2, {
      gates: Object.fromEntries(
        Array.from({ length: 4 }, (_, i) => [i, { solved: true }]),
      ),
      homewardAvailable: true,
    });
    const plinth = e.group.getObjectByName("aeolus_moving_marble_plinth");
    const contact = e.state.monumentPlatformCollider;
    assert.deepEqual(plinth.scale.toArray(), [112, 6, 72]);
    assert.deepEqual(contact.halfSize.toArray(), [56, 3, 36]);
    assert.deepEqual(e.state.monumentFoundationSize, [120, 76]);
    assert.equal(ODYSSEY_WORLD.surfaceY, 4);
    const crest = ODYSSEY_WORLD.surfaceY + 0.12 + 0.18;
    assert.equal(crest, 4.3);
    assert.ok(e.state.monumentFinalMinY > crest);
    const underside = contact.y - contact.halfSize.y;
    assert.equal(underside, 10);
    assert.ok(underside - crest > 5.6);
    for (const id of [
      "aeolus_monument_west_pier",
      "aeolus_monument_east_pier",
    ]) {
      const c = e.state.monumentSupportColliders.find((c) => c.id === id);
      assert.equal(c.y + c.halfSize.y, underside);
      assert.equal(c.halfSize.z, 38);
    }
    const pos = e.state.monumentMesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++)
      if (pos.getY(i) <= -0.44) {
        assert.ok(Math.abs(pos.getX(i) * 180) < contact.halfSize.x);
        assert.ok(Math.abs(pos.getZ(i) * 180) < contact.halfSize.z);
      }
    const waterlineMaterial = e.group.getObjectByName(
      "aeolus_monument_west_pier",
    ).material;
    const shader = {
      vertexShader: "#include <common>\n#include <begin_vertex>",
      fragmentShader:
        "#include <common>\n#include <color_fragment>\n#include <normal_fragment_maps>",
    };
    waterlineMaterial.onBeforeCompile(shader, {});
    assert.match(shader.vertexShader, /vAeolusStoneHeight = \(modelMatrix/);
    assert.match(shader.fragmentShader, /smoothstep\(3\.40, 5\.40/);
    assert.match(
      waterlineMaterial.customProgramCacheKey(),
      /aeolus_wet_line_4$/,
    );
  } finally {
    e.dispose();
  }
});

test("the finite wall-contact foam follows the real wave callback, fades outward, pauses and resets", async () => {
  const wave = (x, z, t) =>
    ODYSSEY_WORLD.surfaceY +
    Math.sin(x * 0.055 + t * 0.3) * 0.12 +
    Math.sin(x * 0.021 - t * 0.17 + z * 0.013) * 0.18;
  const e = createOdysseyWindEnvironment({
    finish: HOMEWARD_FINISH,
    heightAt: odysseySeabedHeight,
    waterHeightAt: wave,
  });
  await e.prepareMonument();
  try {
    const foam = e.group.getObjectByName("aeolus_actual_wall_waterline_foam");
    assert.equal(foam.visible, false);
    assert.equal(foam.geometry.attributes.position.count, 64);
    assert.equal(foam.geometry.attributes.color.itemSize, 4);
    assert.equal(foam.material.depthWrite, false);
    const geometry = foam.geometry,
      material = foam.material;
    const trial = {
      gates: Object.fromEntries(
        Array.from({ length: 4 }, (_, i) => [i, { solved: true }]),
      ),
      homewardAvailable: true,
    };
    e.update(26.2, 26.2, trial);
    assert.equal(foam.visible, true);
    const p = geometry.attributes.position,
      c = geometry.attributes.color;
    for (let i = 0; i < p.count; i++) {
      assert.ok(
        Math.abs(p.getY(i) - wave(p.getX(i), p.getZ(i), 26.2) - 0.08) < 1e-5,
      );
      if (i % 2 === 0) {
        const dx = Math.abs(p.getX(i) + 160),
          dz = Math.abs(p.getZ(i) + 600);
        assert.ok(Math.abs(dx - 60) < 1e-5 || Math.abs(dz - 38) < 1e-5);
        assert.ok(c.getW(i) > 0.5);
      } else assert.equal(c.getW(i), 0);
    }
    const snapshot = p.array.slice();
    e.update(0, 900, trial);
    assert.deepEqual(p.array, snapshot);
    e.update(0.5, 26.7, trial);
    assert.notDeepEqual(p.array, snapshot);
    assert.equal(foam.geometry, geometry);
    assert.equal(foam.material, material);
    e.update(0, 27, { gates: {} });
    assert.equal(foam.visible, false);
    let disposedGeometry = 0,
      disposedMaterial = 0;
    geometry.addEventListener("dispose", () => disposedGeometry++);
    material.addEventListener("dispose", () => disposedMaterial++);
    e.dispose();
    e.dispose();
    assert.equal(disposedGeometry, 1);
    assert.equal(disposedMaterial, 1);
  } finally {
    e.dispose();
  }
});

test("Polyphemus uses one actual grounded full-footprint dais and removes the obsolete Ladon column", () => {
  const e = createOdysseyWindEnvironment({
    gateDefs: [{ ...FITTED_WIND_GATES[0], guardian: "polyphemus" }],
    heightAt: odysseySeabedHeight,
  });
  try {
    const site = POLYPHEMUS_SITE,
      platform = e.colliders.find((c) => c.id === "polyphemus_grounded_dais");
    assert.ok(platform);
    assert.equal(platform.y + platform.halfSize.y, site.top);
    assert.ok(Math.abs(platform.y - platform.halfSize.y - site.bottom) < 1e-7);
    assert.equal(platform.halfSize.x * 2, site.width);
    assert.equal(platform.halfSize.z * 2, site.depth);
    for (let dx = -site.width / 2; dx <= site.width / 2; dx += 2)
      for (let dz = -site.depth / 2; dz <= site.depth / 2; dz += 2)
        assert.ok(
          site.top - odysseySeabedHeight(site.x + dx, site.z + dz) >= 3.99,
        );
    assert.equal(
      e.group.getObjectByName("ladon_hf_central_guard_column"),
      undefined,
    );
  } finally {
    e.dispose();
  }
});

test("the entire living posed giant stays separated from its west puzzle board and grown control approaches", () => {
  const definition = FITTED_WIND_GATES.find((g) => g.guardian === "polyphemus");
  const e = createOdysseyWindEnvironment({
    gateDefs: [definition],
    heightAt: odysseySeabedHeight,
  });
  const root = new THREE.Group(),
    motions = [];
  buildPolyphemusHF(root, motions);
  root.scale.setScalar(POLYPHEMUS_SITE.height);
  root.position.set(...POLYPHEMUS_SITE.home);
  const mesh = root.userData.hfRig.mesh;
  const layout = e.layouts.get(definition.id);
  try {
    for (const phase of ["patrol", "windup", "attack", "recover"])
      for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
        root.userData.setPolyphemusCombat({
          phase,
          ability: "boulder_throw",
          progress,
        });
        for (const motion of motions) motion(progress * 4 + 1);
        root.updateMatrixWorld(true);
        mesh.skeleton.update();
        mesh.computeBoundingBox();
        const actual = mesh.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
        for (const control of [...layout.rotors, layout.master]) {
          const p = new THREE.Vector3(...control.position);
          assert.ok(
            actual.distanceToPoint(p) > 30,
            `${phase}/${progress}: control clear of actual giant`,
          );
        }
        for (const c of e.colliders.filter(
          (c) => c.kind === "odyssey_tide_support",
        )) {
          const support = new THREE.Box3(
            new THREE.Vector3(
              c.x - c.halfSize.x,
              c.y - c.halfSize.y,
              c.z - c.halfSize.z,
            ),
            new THREE.Vector3(
              c.x + c.halfSize.x,
              c.y + c.halfSize.y,
              c.z + c.halfSize.z,
            ),
          );
          assert.equal(
            actual.intersectsBox(support),
            false,
            `${phase}/${progress}: ${c.id} against real posed body`,
          );
        }
      }
  } finally {
    root.userData.disposeLocalMotion();
    e.dispose();
  }
});
