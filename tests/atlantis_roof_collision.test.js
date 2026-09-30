import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { cityArchitecture } from "../src/atlantis_architecture.js";
import { bodyRadius, castSegment, resolveMotion } from "../src/collision.js";
import { castIndexedSegment } from "../src/static_collider_grid.js";

// 这些路径来自已发布场景的穿顶复现，不以碰撞快照替代真实网格与游动判定。
const CASES = [
  ["courtyard", 0, 0, 9, 18, false],
  ["courtyard", 0, 10, 9, 13, true],
  ["villa", 0, 6, 12, 19, true],
  ["villa", 0, -3.5, 12, 19, true],
  ["stoa", 0, 0, 17, 26, true],
  ["stoa", 0, 11.3, 18, 26, true],
  ["stoa", 0, -11.8, 20.5, 26, true],
  ["tower", 3, 0, 35, 46, true],
  ["gateway", 0, 6, 40, 48, true],
  ["temple", 0, 0, 42, 52, false],
  ...[-31, 31].map((x) => ["temple", x, 0, 43, 52, true]),
  ...[-40, 40].flatMap((x) =>
    [-24, 24].map((z) => ["temple", x, z, 43, 52, true]),
  ),
  ["rotunda", 8, 0, 20, 26, true],
  ["rotunda", 15.5, 8, 21, 25, false],
  ["rotunda", 3, 0, 29, 39, true],
  ["rotunda", 12, 0, 26, 34, true],
];

for (const [kind, x, z, low, high, solid] of CASES) {
  test(`${kind} roof at ${x},${z} agrees with visible ${solid ? "masonry" : "opening"}`, (t) => {
    const kit = cityArchitecture(kind);
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    t.after(() => material.dispose());
    const meshes = kit.parts.map(
      ({ geometry }) => new THREE.Mesh(geometry, material),
    );
    for (const reverse of [false, true]) {
      const start = new THREE.Vector3(x, reverse ? high : low, z);
      const end = new THREE.Vector3(x, reverse ? low : high, z);
      const direction = end.clone().sub(start).normalize();
      const ray = new THREE.Raycaster(
        start,
        direction,
        0,
        start.distanceTo(end),
      );
      const visual = ray.intersectObjects(meshes, false)[0];
      const contact = castSegment(start, end, kit.colliders);
      assert.equal(!!visual, solid, "visible surface");
      assert.equal(!!contact, solid, "structural contact");
      assert.deepEqual(
        castIndexedSegment(start, end, { staticColliders: kit.colliders }),
        contact,
        "indexed and complete queries agree",
      );
      if (solid)
        assert.ok(
          Math.abs(visual.distance - contact.distance) < 1.1,
          "contact follows the rendered surface within curved-roof tolerance",
        );
      for (const steps of [1, 60]) {
        let position = start.clone(),
          blocked = false;
        for (let step = 1; step <= steps; step++) {
          const desired = start.clone().lerp(end, step / steps);
          const result = resolveMotion(position, desired, {
            colliders: kit.colliders,
            length: 3,
            radius: bodyRadius(3),
            forward: direction,
          });
          blocked ||= result.blocked;
          assert.equal(result.stuck, false, "contact must not trap the body");
          position = new THREE.Vector3(
            result.position.x,
            result.position.y,
            result.position.z,
          );
          if (blocked) break;
        }
        assert.equal(blocked, solid, `continuous body, ${steps} steps`);
        if (!solid) assert.ok(position.distanceTo(end) < 0.001);
      }
    }
  });
}

test("Elevated rotunda disk follows the rendered polygon around the whole rim", (t) => {
  const kit = cityArchitecture("rotunda");
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  t.after(() => material.dispose());
  const meshes = kit.parts.map(
    ({ geometry }) => new THREE.Mesh(geometry, material),
  );
  for (let i = 0; i < 192; i++) {
    const angle = ((i + 0.31) * Math.PI * 2) / 192;
    const start = new THREE.Vector3(
      Math.cos(angle) * 18,
      23,
      Math.sin(angle) * 18,
    );
    const end = new THREE.Vector3(
      Math.cos(angle) * 14,
      23,
      Math.sin(angle) * 14,
    );
    const ray = new THREE.Raycaster(
      start,
      end.clone().sub(start).normalize(),
      0,
      4,
    );
    const visual = ray.intersectObjects(meshes, false)[0];
    const hit = castSegment(
      start,
      end,
      kit.colliders.filter((c) => c.kind === "city_disk"),
    );
    const combined = castSegment(start, end, kit.colliders);
    assert.ok(visual && hit && combined, `Solid rim at angle ${angle}`);
    // 旧穹顶曲面近似在盘沿下方略有包络；独立圆盘必须精确，组合体也不能有大幅外扩。
    assert.ok(
      Math.abs(visual.distance - combined.distance) < 0.5,
      "Combined rim clearance",
    );
    assert.ok(
      Math.abs(visual.distance - hit.distance) < 0.00001,
      `Polygon contact at angle ${angle}`,
    );
  }
});
