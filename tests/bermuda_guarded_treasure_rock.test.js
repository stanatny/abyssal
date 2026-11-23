import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createBermudaGuardedTreasureRock } from "../src/bermuda_guarded_treasure_rock.js";
import { createBermudaTitanRelic } from "../src/bermuda_titan_relic.js";
import { bermudaSeabedHeight } from "../src/bermuda_terrain.js";
import { bodyTerrainFloor } from "../src/terrain_contact.js";
import { bodyRadius } from "../src/collision.js";
import { queryStaticColliders } from "../src/static_collider_grid.js";

const origin = new T.Vector3(-205, -580.643157043976, -1590),
  root = new T.Group(),
  rock = createBermudaGuardedTreasureRock(root, {
    heightAt: bermudaSeabedHeight,
    frontOrigin: origin,
  });
after(() => rock.dispose());

// 从三角片中减去真实轴盒；剩余面积必须为零，不能只抽查顶点/中心就宣称表面全包。
function outsideBox(polygon, box) {
  let inside = polygon;
  const outside = [];
  for (const [axis, edge, sign] of [
    ["x", box.x - box.halfSize.x, 1],
    ["x", box.x + box.halfSize.x, -1],
    ["y", box.y - box.halfSize.y, 1],
    ["y", box.y + box.halfSize.y, -1],
    ["z", box.z - box.halfSize.z, 1],
    ["z", box.z + box.halfSize.z, -1],
  ]) {
    const kept = [],
      removed = [];
    for (let i = 0; i < inside.length; i++) {
      const a = inside[i],
        b = inside[(i + 1) % inside.length],
        da = sign * (a[axis] - edge),
        db = sign * (b[axis] - edge),
        ia = da >= -1e-9,
        ib = db >= -1e-9;
      (ia ? kept : removed).push(a);
      if (ia !== ib) {
        const cut = a.clone().lerp(b, da / (da - db));
        kept.push(cut);
        removed.push(cut);
      }
    }
    if (removed.length >= 3) outside.push(removed);
    inside = kept;
    if (inside.length < 3) break;
  }
  return outside;
}
function polygonArea(p) {
  let area = 0;
  for (let i = 1; i < p.length - 1; i++)
    area +=
      p[i]
        .clone()
        .sub(p[0])
        .cross(p[i + 1].clone().sub(p[0]))
        .length() / 2;
  return area;
}

test("Every actual stone top triangle remains fully covered by indexed contacts after reducing only its top pad", (t) => {
  rock.mesh.updateWorldMatrix(true, false);
  const g = rock.mesh.geometry,
    p = g.attributes.position,
    idx = g.index;
  let checked = 0;
  for (let face = 0; face < idx.count; face += 3) {
    const triangle = [0, 1, 2].map((k) =>
      new T.Vector3()
        .fromBufferAttribute(p, idx.getX(face + k))
        .applyMatrix4(rock.mesh.matrixWorld),
    );
    if (
      triangle[1]
        .clone()
        .sub(triangle[0])
        .cross(triangle[2].clone().sub(triangle[0])).y <= 1e-12
    )
      continue;
    const bounds = new T.Box3().setFromPoints(triangle),
      contacts = queryStaticColliders(rock.contacts, bounds.min, bounds.max);
    let remaining = [triangle];
    for (const c of contacts)
      remaining = remaining.flatMap((poly) => outsideBox(poly, c));
    assert.ok(
      remaining.reduce((sum, poly) => sum + polygonArea(poly), 0) < 1e-8,
      `Actual top triangle ${face / 3} escaped its indexed solid cover`,
    );
    checked++;
  }
  assert.ok(checked > 500);
  const c = queryStaticColliders(
    rock.contacts,
    new T.Vector3(-150, rock.topY, -1590),
  ).find(
    (c) =>
      Math.abs(c.y + c.halfSize.y - rock.floorSurface(-150, -1590) - 0.05) <
      1e-6,
  );
  assert.ok(
    c,
    "The flat real platform is covered by exactly five centimetres of top pad",
  );
  t.diagnostic(
    JSON.stringify({
      checkedTopTriangles: checked,
      contacts: rock.contacts.length,
    }),
  );
});

test("The guarded crystal rests on an actual fixed stone top that joins the existing seabed", () => {
  const gem = createBermudaTitanRelic();
  try {
    gem.root.position.set(origin.x + 40.8, origin.y - 28.92, origin.z);
    gem.root.rotation.y = -Math.PI / 2;
    gem.root.updateWorldMatrix(true, true);
    const mesh = gem.root.children[0],
      p = mesh.geometry.attributes.position,
      point = new T.Vector3();
    let clearance = Infinity;
    for (let i = 0; i < p.count; i++) {
      point.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
      clearance = Math.min(
        clearance,
        point.y - rock.floorSurface(point.x, point.z),
      );
    }
    assert.ok(
      clearance >= 0 && clearance <= 0.101,
      `Crystal gap: ${clearance}`,
    );
    assert.ok(rock.topY - bermudaSeabedHeight(origin.x + 40.8, origin.z) > 4);
    assert.ok(Math.abs(rock.floorSurface(-150, -1590) - rock.topY) < 0.0001);
    for (const [x, z] of [
      [-100, -1590],
      [-125, -1555],
      [-95, -1550],
      [-200, -1625],
    ])
      assert.ok(
        Math.abs(rock.floorSurface(x, z) - bermudaSeabedHeight(x, z)) < 2,
        "The ramp perimeter returns to existing ground rather than ending as a raised panel",
      );
  } finally {
    gem.dispose();
  }
});

test("The complete 30m floor envelope can follow a forward-only slow left turn and the north return", () => {
  const length = 30,
    radius = bodyRadius(length),
    turnRadius = 5 / 1.15,
    start = new T.Vector3(origin.x + 60, origin.y - 24.56, origin.z),
    samples = [];
  for (let i = 0; i <= 40; i++) {
    const theta = (i * Math.PI) / 80,
      position = start
        .clone()
        .add(
          new T.Vector3(
            -turnRadius * Math.sin(theta),
            0,
            turnRadius * (1 - Math.cos(theta)),
          ),
        ),
      forward = new T.Vector3(-Math.cos(theta), 0, Math.sin(theta));
    samples.push({ position, forward });
  }
  const turnEnd = samples.at(-1).position;
  for (let distance = 1; distance <= 42; distance++)
    samples.push({
      position: turnEnd.clone().add(new T.Vector3(0, 0, distance)),
      forward: new T.Vector3(0, 0, 1),
    });
  let minClearance = Infinity;
  for (const { position, forward } of samples) {
    const floor = bodyTerrainFloor(position.x, position.z, {
      heightAt: rock.floorSurface,
      radius,
      length: (length * 0.52) / 0.42,
      forward,
      margin: 0.4,
    });
    minClearance = Math.min(minClearance, position.y - floor);
    assert.ok(
      position.y > floor + 0.05,
      `The actual stone triangles must leave the full visible-body floor envelope clear: ${position.toArray()} / ${floor}`,
    );
  }
  assert.ok(minClearance > 1.5);
  assert.ok(rock.turnBay.radius * 2 >= 40);
  // This test proves ground support only. The HF skin/body gate is independently
  // verified at the same positions; it is never inferred from a guard flag.
});

test("The stone contacts stay inside or within the unchanged two-metre actual surface envelope", (t) => {
  const point = new T.Vector3();
  let checked = 0;
  for (const contact of rock.contacts)
    for (const sx of [-1, 0, 1])
      for (const sy of [-1, 0, 1])
        for (const sz of [-1, 0, 1]) {
          point
            .set(
              sx * contact.halfSize.x,
              sy * contact.halfSize.y,
              sz * contact.halfSize.z,
            )
            .applyQuaternion(contact.rotation)
            .add(contact);
          // supportHeight uses actual rock triangles plus an exact radius-two
          // spherical support, not a vertical roof difference or a proxy box.
          assert.ok(
            point.y <= rock.floorSurface.supportHeight(point.x, point.z, 2),
            `Water-side contact exceeds the true two-metre stone envelope: ${contact.id} ${point.toArray()}`,
          );
          checked++;
        }
  t.diagnostic(
    JSON.stringify({
      contacts: rock.contacts.length,
      triangles: rock.mesh.geometry.index.count / 3,
      checkedContactPoints: checked,
      topY: rock.topY,
    }),
  );
});
