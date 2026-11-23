import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import { BERMUDA_WORLD as W } from "../src/bermuda_config.js";
import { BERMUDA_TITAN_LAYOUT } from "../src/bermuda_cave_config.js";
import { bodyRadius, isPositionBlocked } from "../src/collision.js";
import { bodyTerrainFloor, clipTerrainCamera } from "../src/terrain_contact.js";
import { createTerrainSurface } from "../src/terrain_surface.js";
import {
  resolveIndexedMotion,
  castIndexedSegment,
} from "../src/static_collider_grid.js";
import { oceanCurrentRoutes } from "../src/ocean_current_rules.js";

const constructionStart = performance.now();
const scene = new T.Scene(),
  ocean = createBermudaOcean(scene),
  caves = ocean.root.userData.deepCaves;
after(() => ocean.dispose());
console.log(
  JSON.stringify({
    caveConstructionMs: performance.now() - constructionStart,
    contacts: caves.colliders.length,
    materialFit: caves.records[0].materialFit,
  }),
);

function movementOptions(
  length,
  heading,
  colliders = ocean.colliders,
  previous = null,
  desired = previous,
) {
  return {
    staticColliders: colliders,
    dynamicColliders:
      colliders === ocean.colliders && previous
        ? ocean.dynamicContacts?.(previous, desired, {
            radius: bodyRadius(length),
            padding: length * 0.52,
          }) || []
        : [],
    radius: bodyRadius(length),
    length,
    forward: heading,
    floorHeight: (x, z) =>
      bodyTerrainFloor(x, z, {
        heightAt: ocean.contactSurface,
        radius: bodyRadius(length),
        length: (length * 0.52) / 0.42,
        margin: 0.4 + length * 0.008,
        forward: heading,
      }),
    bounds: {
      minX: W.minX + 5,
      maxX: W.maxX - 5,
      minZ: W.minZ + 5,
      maxZ: W.maxZ - 5,
      minY: -W.maxDepth + bodyRadius(length),
      maxY: W.surfaceY - length * 0.15,
    },
  };
}

function walk(
  points,
  length,
  label,
  stepSize = 1,
  colliders = ocean.colliders,
) {
  let position = points[0].clone(),
    steps = 0,
    distance = 0;
  for (let segment = 1; segment < points.length; segment++) {
    const a = points[segment - 1],
      b = points[segment],
      delta = b.clone().sub(a),
      d = delta.length();
    if (d < 1e-7) continue;
    const forward = delta.clone().divideScalar(d),
      count = Math.ceil(d / stepSize);
    for (let step = 1; step <= count; step++) {
      const desired = a.clone().lerp(b, step / count),
        previous = position.clone(),
        result = resolveIndexedMotion(
          previous,
          desired,
          movementOptions(length, forward, colliders, previous, desired),
        ),
        failure = JSON.stringify({
          label,
          length,
          segment,
          step,
          from: previous.toArray(),
          desired: desired.toArray(),
          actual: result.position,
          contacts: result.contacts.map((c) => c.collider?.id),
        });
      assert.equal(result.stuck, false, failure);
      assert.equal(result.blocked, false, failure);
      position.set(result.position.x, result.position.y, result.position.z);
      assert.ok(
        position.distanceTo(desired) < 0.08,
        `route projection displaced the swimmer: ${failure}`,
      );
      assert.ok(
        position.distanceTo(previous) <= stepSize + 0.08,
        `continuous bounded movement: ${failure}`,
      );
      distance += position.distanceTo(previous);
      steps++;
    }
  }
  return { label, length, steps, distance };
}

function stagedRoute(points) {
  const start = points[0].clone(),
    end = points.at(-1).clone(),
    entering = points[1].clone().sub(start).setY(0).normalize(),
    leaving = end.clone().sub(points.at(-2)).setY(0).normalize(),
    before = start.clone().addScaledVector(entering, -20),
    beyond = end.clone().addScaledVector(leaving, 20);
  before.y = Math.max(start.y, ocean.contactSurface(before.x, before.z) + 26);
  beyond.y = Math.max(end.y, ocean.contactSurface(beyond.x, beyond.z) + 26);
  return [before, ...points.map((p) => p.clone()), beyond];
}

for (const record of caves.records)
  for (const route of record.routes)
    for (const length of record.id === "kaiju_lair" ? [3, 25, 30, 35] : [3, 32])
      for (const reverse of [false, true])
        test(`${record.id} ${route.id}: ${length} m whole body traverses the complete route ${reverse ? "southbound" : "northbound"}`, () => {
          const points =
            record.id === "kaiju_lair"
              ? [
                  ...route.points.map((p) => p.clone()),
                  route.points
                    .at(-1)
                    .clone()
                    .add(new T.Vector3(0, 0, 25)),
                ]
              : stagedRoute(route.points);
          if (reverse) points.reverse();
          const metrics = walk(
            points,
            length,
            `${record.id}/${route.id}/${reverse}`,
          );
          assert.ok(
            metrics.distance > record.depth + 30,
            "both outside approaches are part of the route",
          );
        });

test("A 32 m adult completes the main lair's advertised turn and a separate 60 m diameter turn, then retreats through its entry", () => {
  const main = caves.records.find((r) => r.theme === "kaiju_lair"),
    upper = main.routes.find((r) => r.id === "upper"),
    centre = main.room.center.clone();
  for (const reverse of [false, true]) {
    const authored = main.turnPath.map((p) => p.clone());
    if (reverse) authored.reverse();
    walk(
      [centre, ...authored, centre],
      32,
      `main advertised turn/${reverse}`,
      0.8,
    );
    const circle = Array.from({ length: 73 }, (_, i) => {
      const angle = ((reverse ? -1 : 1) * i * Math.PI * 2) / 72 - Math.PI / 2;
      return centre
        .clone()
        .add(new T.Vector3(Math.cos(angle) * 30, 0, Math.sin(angle) * 30));
    });
    const nearest = upper.points.reduce(
      (best, p, i, all) =>
        p.distanceTo(centre) < all[best].distanceTo(centre) ? i : best,
      0,
    );
    const approach = [
      upper.points
        .at(-1)
        .clone()
        .add(new T.Vector3(0, 0, 25)),
      ...upper.points
        .slice(nearest)
        .reverse()
        .map((p) => p.clone()),
      centre.clone(),
    ];
    const path = [
      ...approach,
      ...circle,
      centre,
      ...approach.slice().reverse(),
    ];
    const metrics = walk(
      path,
      32,
      `main independent large turn and retreat/${reverse}`,
      0.8,
    );
    assert.ok(
      metrics.distance > 300,
      "full turn and entry retreat remain continuous",
    );
  }
});

test("The western treasure branch permits complete adult entry and retreat above the actual floor", () => {
  const main = caves.records.find((r) => r.theme === "kaiju_lair"),
    points = main.branches
      .find((branch) => branch.id === "treasure")
      .points.map((p) => p.clone());
  assert.ok(main.contains(points.at(-1), 10), "treasure lies in real water");
  for (const length of [30, 32])
    for (const reverse of [false, true])
      walk(
        reverse ? points.slice().reverse() : points,
        length,
        `western treasure/${length}/${reverse}`,
      );
});

test("All three seal positions stay in real water with adult body clearance in every axis", () => {
  const main = caves.records.find((r) => r.theme === "kaiju_lair");
  for (const seal of BERMUDA_TITAN_LAYOUT.seals) {
    const position = new T.Vector3(
      seal.x,
      ocean.contactSurface(seal.x, seal.z) + seal.floorOffset,
      seal.z,
    );
    assert.ok(main.contains(position, 10), `${seal.id}: actual inner water`);
    for (const forward of [
      { x: 1, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: -1, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: -1 },
    ])
      assert.equal(
        isPositionBlocked(position, {
          colliders: ocean.colliders,
          radius: bodyRadius(32),
          length: 32,
          forward,
        }),
        false,
        `${seal.id}: 32 m body ${JSON.stringify(forward)}`,
      );
  }
});

test("Actual transformed HF bone faces retain individual physical coverage and bounded low-foot support", () => {
  assert.equal(caves.props.skeletons.length, 2);
  for (const row of caves.props.skeletons) {
    const contacts = ocean.colliders.filter((c) =>
        c.id.startsWith(`${row.site.id}_hf_bone_`),
      ),
      geometry = row.mesh.geometry,
      point = new T.Vector3(),
      vertex = new T.Vector3();
    assert.ok(contacts.length > 500, "real separated bone-segment contacts");
    for (let face = 0; face < geometry.index.count; face += 111) {
      point.set(0, 0, 0);
      for (let i = 0; i < 3; i++)
        point.add(
          vertex.fromBufferAttribute(
            geometry.attributes.position,
            geometry.index.getX(face + i),
          ),
        );
      point.multiplyScalar(1 / 3).applyMatrix4(row.matrix);
      assert.ok(
        isPositionBlocked(point, { colliders: contacts, radius: 0.03 }),
        `${row.site.id}: actual HF face ${face / 3}`,
      );
    }
    assert.ok(
      row.maximumFootGap < 4,
      "low bone segments follow the local slope",
    );
    assert.ok(
      row.footSupports.every((support) => support.height < 5.5),
      "bounded local rocks support the scattered low bone ends",
    );
  }
});

test("Visible near and distant support rocks touch the actual scattered low bone vertices", () => {
  const rocks = caves.props.detailBatches.find((b) => b.kind === "rock"),
    material = new T.MeshBasicMaterial({ side: T.DoubleSide }),
    ray = new T.Raycaster(),
    vertex = new T.Vector3();
  try {
    for (const row of caves.props.skeletons)
      for (const support of row.footSupports) {
        let lowest = Infinity;
        for (const geometry of [row.mesh.geometry, row.farMesh.geometry]) {
          const ids = geometry.index
            ? [...new Set(geometry.index.array)]
            : Array.from(
                { length: geometry.attributes.position.count },
                (_, i) => i,
              );
          for (const id of ids) {
            vertex
              .fromBufferAttribute(geometry.attributes.position, id)
              .applyMatrix4(row.matrix);
            if (
              Math.hypot(
                vertex.x - support.position.x,
                vertex.z - support.position.z,
              ) < 1e-5
            )
              lowest = Math.min(lowest, vertex.y);
          }
        }
        assert.ok(
          Number.isFinite(lowest),
          "support belongs to an actual low bone vertex",
        );
        for (const geometry of [
          rocks.asset.geometry,
          rocks.asset.farGeometry,
        ]) {
          const mesh = new T.Mesh(geometry, material);
          mesh.matrixAutoUpdate = false;
          mesh.matrix.copy(support.matrix);
          mesh.updateMatrixWorld(true);
          ray.set(
            new T.Vector3(support.position.x, lowest + 20, support.position.z),
            new T.Vector3(0, -1, 0),
          );
          const hit = ray.intersectObject(mesh)[0];
          assert.ok(hit, "visible HF rock supports the low bone segment");
          assert.ok(
            hit.point.y >= lowest - 0.02,
            "no floating gap above a support",
          );
          assert.ok(
            hit.point.y - lowest < 1.5,
            "bone remains visible above local sediment rock",
          );
        }
      }
  } finally {
    material.dispose();
  }
});

test("Actual cave shell contacts stop a 32 m full body at roofs and side walls and permit retreat", () => {
  for (const record of caves.records)
    for (const t of [0.25, 0.5, 0.75]) {
      const frame = record.frameAt(t),
        inside = record.interiorAt(t, 0, 0.65),
        shellContacts = ocean.colliders.filter((c) =>
          c.id.startsWith(`${record.id}_shell_`),
        );
      for (const side of [-1, 0, 1]) {
        const direction =
            side === 0
              ? new T.Vector3(0, 1, 0)
              : new T.Vector3(side, 0, 0).applyAxisAngle(
                  new T.Vector3(0, 1, 0),
                  record.yaw,
                ),
          target = inside
            .clone()
            .addScaledVector(
              direction,
              side === 0 ? frame.ceilingY - inside.y + 25 : record.width,
            );
        // 用正常游动的小步首次触墙，不能把一次三百米请求沿整面斜墙滑到旧礁门后再直线返回。
        const steps = Math.ceil(inside.distanceTo(target));
        let position = inside.clone(),
          hit = null;
        for (let step = 1; step <= steps; step++) {
          hit = resolveIndexedMotion(
            position,
            inside.clone().lerp(target, step / steps),
            movementOptions(32, direction, shellContacts),
          );
          position.set(hit.position.x, hit.position.y, hit.position.z);
          if (hit.blocked || hit.stuck) break;
        }
        assert.ok(
          hit.blocked,
          `${record.id}/${t}/${side}: visible solid must stop the body`,
        );
        assert.equal(hit.stuck, false, `${record.id}/${t}/${side}`);
        assert.ok(
          hit.contacts.some((c) =>
            c.collider?.id.startsWith(`${record.id}_shell_`),
          ),
          `${record.id}/${t}/${side}: actual shell collision`,
        );
        walk(
          [position, inside],
          32,
          `${record.id}/${t}/${side}: free retreat`,
          1,
          shellContacts,
        );
      }
    }
});

test("Every meaningful inward roof face is physically covered within a 2 m actual-surface envelope", (t) => {
  const failures = [];
  for (const record of caves.records) {
    const shell = record.shell,
      p = shell.geometry.attributes.position,
      index = shell.geometry.index,
      contacts = ocean.colliders.filter((c) =>
        c.id.startsWith(`${record.id}_shell_`),
      ),
      a = new T.Vector3(),
      b = new T.Vector3(),
      c = new T.Vector3(),
      normal = new T.Vector3(),
      centre = new T.Vector3(),
      ray = new T.Raycaster(),
      visibleMaterial = shell.material,
      auditMaterial = new T.MeshBasicMaterial({ side: T.DoubleSide });
    shell.updateMatrixWorld(true);
    const triangles = Array.from(
        { length: index.count / 3 },
        (_, i) =>
          new T.Triangle(
            ...[0, 1, 2].map((j) =>
              new T.Vector3()
                .fromBufferAttribute(p, index.getX(i * 3 + j))
                .applyMatrix4(shell.matrixWorld),
            ),
          ),
      ),
      closest = new T.Vector3();
    const nearestSurfaceDistance = (point) => {
      const probe = new T.Vector3().copy(point);
      let distance = Infinity;
      for (const triangle of triangles) {
        triangle.closestPointToPoint(probe, closest);
        distance = Math.min(distance, closest.distanceTo(probe));
      }
      return distance;
    };
    shell.material = auditMaterial;
    let cleaned = false;
    const cleanAudit = () => {
      if (cleaned) return;
      cleaned = true;
      shell.material = visibleMaterial;
      auditMaterial.dispose();
    };
    t.after(cleanAudit);
    let checked = 0,
      missing = 0,
      maxIntrusion = -Infinity,
      maxNormalIntrusion = -Infinity,
      worst = null;
    for (let i = 0; i < index.count; i += 3) {
      a.fromBufferAttribute(p, index.getX(i)).applyMatrix4(shell.matrixWorld);
      b.fromBufferAttribute(p, index.getX(i + 1)).applyMatrix4(
        shell.matrixWorld,
      );
      c.fromBufferAttribute(p, index.getX(i + 2)).applyMatrix4(
        shell.matrixWorld,
      );
      normal.crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
      centre
        .copy(a)
        .add(b)
        .add(c)
        .multiplyScalar(1 / 3);
      if (
        normal.y > -0.2 ||
        centre.y < ocean.contactSurface(centre.x, centre.z) + 20
      )
        continue;
      checked++;
      const start = centre.clone(),
        end = centre.clone().addScaledVector(normal, -18),
        direction = normal.clone().negate();
      let visible = null;
      // 接枝凹面可能先遇另一片真实岩面；基准必须是第一片可见面，而非默认远处采样面。
      for (const standOff of [12, 6, 3, 2.25, 1, 0.25, 0.02, 0.001]) {
        start.copy(centre).addScaledVector(normal, standOff);
        ray.set(start, direction);
        ray.far = standOff + 18;
        const first = ray.intersectObject(shell, false)[0];
        if (first && first.face.normal.dot(direction) < 0) {
          visible = first;
          break;
        }
      }
      assert.ok(
        visible,
        JSON.stringify({
          id: record.id,
          face: i / 3,
          centre: centre.toArray(),
          normal: normal.toArray(),
          hits: ray
            .intersectObject(shell, false)
            .slice(0, 3)
            .map((h) => ({
              d: h.distance,
              face: h.faceIndex,
              dot: h.face.normal.dot(direction),
            })),
        }),
      );
      const hit = castIndexedSegment(start, end, {
        staticColliders: contacts,
        radius: 0.02,
      });
      if (!hit) {
        missing++;
        continue;
      }
      const normalIntrusion = visible.distance - hit.distance;
      maxNormalIntrusion = Math.max(maxNormalIntrusion, normalIntrusion);
      // 凹角旁另一真实岩面可能离命中点更近；保留2米实体包络，不把离轴墙面误算作远处水体。
      const intrusion =
        normalIntrusion > 2
          ? Math.min(normalIntrusion, nearestSurfaceDistance(hit.point))
          : normalIntrusion;
      if (intrusion > maxIntrusion) {
        maxIntrusion = intrusion;
        worst = {
          face: i / 3,
          point: centre.toArray(),
          normal: normal.toArray(),
          collider: hit.collider.id,
          boxCenter: [hit.collider.x, hit.collider.y, hit.collider.z],
          boxHalf: hit.collider.halfSize.toArray(),
          intrusion,
          visibleDistance: visible.distance,
          visibleFace: visible.faceIndex,
          normalIntrusion,
        };
      }
      if (hit.distance > visible.distance + 0.04) missing++;
    }
    cleanAudit();
    console.log(
      JSON.stringify({
        roof: record.id,
        checked,
        missing,
        maxIntrusion,
        maxNormalIntrusion,
        worst,
      }),
    );
    if (checked <= 100 || missing !== 0 || maxIntrusion > 2)
      failures.push({ id: record.id, checked, missing, maxIntrusion, worst });
  }
  assert.deepEqual(
    failures,
    [],
    "Every checked roof face requires coverage and at most 2 m Euclidean intrusion from the actual shell",
  );
});

test("Cave roofs never replace the interior's lowest terrain, including a fresh support index", () => {
  const rebuilt = createTerrainSurface(ocean.root, {
    fallback() {
      throw new Error("Interior missed the final terrain mesh");
    },
  });
  try {
    for (const record of caves.records) {
      record.root.traverse((n) =>
        assert.notEqual(
          n.userData.terrainContact,
          true,
          `${record.id}: roof/wall must stay separate from ground`,
        ),
      );
      for (const t of [0.1, 0.3, 0.5, 0.7, 0.9])
        for (const across of [-0.3, 0, 0.3]) {
          const p = record.interiorAt(t, across, 0.4),
            floor = ocean.contactSurface(p.x, p.z);
          assert.ok(
            Math.abs(rebuilt(p.x, p.z) - floor) < 1e-6,
            `${record.id}/${t}/${across}: unchanged lowest support`,
          );
          assert.ok(
            p.y - floor > 10,
            `${record.id}/${t}/${across}: actual internal water column`,
          );
        }
    }
  } finally {
    rebuilt.dispose();
  }
});

test("The four accepted reef gates and four current centre lines retain their adult passages with the final cave contacts", () => {
  for (const arch of ocean.root.userData.outerBiomes.arches)
    for (const reverse of [false, true]) {
      const relocated = arch.id === "outer_gate_south_deep",
        run = relocated ? 38 : 60,
        points = Array.from({ length: 61 }, (_, i) => {
          const offset = (reverse ? -1 : 1) * (run - (i * run) / 30),
            yaw = arch.yaw ?? 0,
            x = arch.x + Math.sin(yaw) * offset,
            z = arch.z + Math.cos(yaw) * offset;
          return new T.Vector3(x, ocean.contactSurface(x, z) + 24, z);
        });
      for (const length of relocated ? [3, 32] : [32]) {
        walk(
          points,
          length,
          `existing gate/${arch.id}/${reverse}/${length}`,
          1,
        );
        if (!relocated) continue;
        for (let i = 0; i < points.length; i += 5) {
          const p = points[i],
            next = points[Math.min(i + 1, points.length - 1)],
            previous = points[Math.max(0, i - 1)],
            forward = next.clone().sub(previous).normalize(),
            ratio = length / 6,
            juvenile = Math.max(0.4, Math.min(1, ratio)),
            offset = new T.Vector3(
              0,
              4.8 * juvenile + ratio * 1.4,
              13 * juvenile + ratio * 4,
            ).applyEuler(
              new T.Euler(
                Math.asin(forward.y) * 0.35,
                Math.atan2(-forward.x, -forward.z),
                0,
                "YXZ",
              ),
            ),
            desired = p.clone().add(offset),
            hit = castIndexedSegment(p, desired, {
              staticColliders: ocean.colliders,
              radius: 0.6,
            });
          if (hit)
            desired
              .copy(hit.point)
              .addScaledVector(new T.Vector3().copy(hit.normal), 0.04);
          desired.copy(clipTerrainCamera(p, desired, ocean.contactSurface));
          assert.ok(
            desired.x > W.minX + 0.6 &&
              desired.x < W.maxX - 0.6 &&
              desired.z > W.minZ + 0.6 &&
              desired.z < W.maxZ - 0.6,
            "full default touch follow-camera stays in-world at the actual gate approach",
          );
          assert.equal(
            isPositionBlocked(desired, {
              colliders: ocean.colliders,
              radius: 0.6,
            }),
            false,
            "real shortened follow-camera remains outside solids",
          );
          assert.ok(
            desired.y > ocean.contactSurface(desired.x, desired.z) + 0.6,
            "camera remains above actual terrain",
          );
        }
      }
    }
  for (const route of oceanCurrentRoutes("bermuda"))
    walk(route.points, 32, `existing current/${route.id}`, 2.4);
});

test("Formal exits require continuous complete-body crossing and retain safe outside waiting space", () => {
  assert.deepEqual(
    caves.exits.map((e) => e.id),
    ["north"],
  );
  for (const exit of caves.exits) {
    const body = { length: 32, radius: bodyRadius(32), forward: exit.outward },
      extent = 32 * 0.52 + exit.bodyMargin,
      origin = exit.origin.clone().setY(exit.origin.y + 40),
      before = origin.clone().addScaledVector(exit.outward, extent - 1),
      after = origin.clone().addScaledVector(exit.outward, extent + 1),
      crossed = caves.checkEscape(before, after, body);
    assert.equal(crossed?.id, exit.id);
    assert.ok(Math.abs(crossed.crossing - 0.5) < 1e-6);
    assert.equal(caves.isEscapeSafe(after, body, exit.id), true);
    assert.equal(caves.isEscapeSafe(before, body, exit.id), false);
    assert.equal(
      caves.checkEscape(
        origin.clone().addScaledVector(exit.outward, -1),
        origin.clone().addScaledVector(exit.outward, 1),
        body,
      ),
      null,
      "centre crossing alone is insufficient",
    );
    assert.equal(
      caves.checkEscape(
        origin.clone().addScaledVector(exit.outward, -20),
        after,
        body,
      ),
      null,
      "teleport cannot prove a physical exit",
    );
    const sideBefore = before.clone().add(new T.Vector3(exit.width, 0, 0)),
      sideAfter = after.clone().add(new T.Vector3(exit.width, 0, 0));
    assert.equal(
      caves.checkEscape(sideBefore, sideAfter, body),
      null,
      "outside the aperture is not a doorway",
    );
  }
  for (const exit of caves.exits) {
    const position = exit.origin
        .clone()
        .add(new T.Vector3(0, 40, 0))
        .addScaledVector(exit.outward, 10),
      body = {
        length: 32,
        radius: bodyRadius(32),
        previousForward: exit.outward,
        forward: new T.Vector3(1, 0, 0),
      },
      crossed = caves.checkEscape(position, position, body);
    assert.equal(
      crossed?.id,
      exit.id,
      "turning the still-inside tail clear of the plane is a real complete-body crossing",
    );
    assert.ok(crossed.crossing > 0 && crossed.crossing < 1);
    assert.equal(caves.isEscapeSafe(position, body, exit.id), true);
  }
});

test("The sole actual north door seals only at landing, invalidate warmed world indices, reopen and leave safe exterior bodies clear", (t) => {
  const count = ocean.colliders.length,
    ownCount = caves.colliders.length;
  caves.bindWorldColliders(ocean.colliders, ocean.dynamicContacts);
  t.after(() => caves.resetSealing());
  const rays = caves.exits.map((exit) => {
    const p = exit.origin.clone().setY(exit.origin.y + 40);
    return {
      exit,
      inside: p.clone().addScaledVector(exit.outward, -12),
      outside: p.clone().addScaledVector(exit.outward, 12),
    };
  });
  for (const ray of rays)
    assert.equal(
      castIndexedSegment(ray.inside, ray.outside, {
        staticColliders: ocean.colliders,
        radius: 0.3,
      }),
      null,
      "initial opening is really clear",
    );
  caves.setSealing(0.5);
  assert.equal(caves.isSealed, false);
  assert.equal(ocean.colliders.length, count);
  assert.equal(caves.setSealing(1), true);
  assert.equal(caves.isSealed, true);
  assert.equal(ocean.colliders.length, count + caves.doorContacts.length);
  assert.equal(caves.colliders.length, ownCount + caves.doorContacts.length);
  caves.seal();
  assert.equal(
    ocean.colliders.length,
    count + caves.doorContacts.length,
    "repeated seal does not append twice",
  );
  for (const { exit, inside, outside } of rays) {
    const hit = castIndexedSegment(inside, outside, {
      staticColliders: ocean.colliders,
      radius: 0.3,
    });
    assert.ok(hit?.collider.id.startsWith("kaiju_lair_seal_"));
    const safe = exit.origin
        .clone()
        .setY(exit.origin.y + 40)
        .addScaledVector(exit.outward, 25),
      body = { length: 32, radius: bodyRadius(32), forward: exit.outward };
    assert.equal(
      isPositionBlocked(safe, { ...body, colliders: caves.doorContacts }),
      false,
      "final stones stay inside the portal",
    );
    assert.equal(caves.isEscapeSafe(safe, body, exit.id), true);
  }
  caves.resetSealing();
  caves.resetSealing();
  assert.equal(ocean.colliders.length, count);
  assert.equal(caves.colliders.length, ownCount);
  assert.equal(caves.isSealed, false);
  for (const ray of rays)
    assert.equal(
      castIndexedSegment(ray.inside, ray.outside, {
        staticColliders: ocean.colliders,
        radius: 0.3,
      }),
      null,
      "reset invalidates the closed-door static index",
    );
});

test("The single winding escape corridor after the native dock departure carry adults around actual screens within a 60 second cruise-and-turn budget", () => {
  const oldPose = { ...ocean.titanQuest.state };
  try {
    for (const awareness of [0.15, 1]) {
      ocean.titan.setPose({
        ...oldPose,
        relicHeld: true,
        sleeping: false,
        awareness,
        guardAmount: 0,
      });
      for (const route of caves.getEscapeRoutes()) {
        const points = [...route.points, route.outsideSafe];
        // 完整停靠离场/缓升前缀由真实A键与俯仰单独验收；不把折线瞬间转向冒充原生操控。
        walk(
          points.slice(3),
          32,
          `escape/${route.id}/after-native-departure`,
          1,
        );
        assert.deepEqual(
          caves.escapeRoutes
            .find((row) => row.id === route.id)
            .points.map((p) => p.toArray()),
          route.points.map((p) => p.toArray()),
          "exported routes follow the live approach setter",
        );
        assert.ok(
          route.cost / 12 + route.turnAllowance < 60,
          `${route.id}: ${route.cost} m plus turning allowance`,
        );
        const forward = points.at(-1).clone().sub(points.at(-2)).normalize();
        assert.equal(
          caves.isEscapeSafe(
            points.at(-1),
            { length: 32, radius: bodyRadius(32), forward },
            route.id,
          ),
          true,
        );
      }
      const main = caves.records[0];
      assert.ok(
        main.contains(
          new T.Vector3(-330, ocean.contactSurface(-330, -1610) + 30, -1610),
        ),
        "annex remains inside the actual quest volume",
      );
    }
  } finally {
    ocean.titan.setPose(oldPose);
  }
});
