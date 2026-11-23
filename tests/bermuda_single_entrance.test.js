import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as T from "three";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import { BERMUDA_WORLD } from "../src/bermuda_config.js";
import { BERMUDA_TITAN_NAVIGATION } from "../src/bermuda_cave_config.js";
import { bermudaSeabedHeight } from "../src/bermuda_terrain.js";
import { bodyRadius, isPositionBlocked } from "../src/collision.js";
import { bodyTerrainFloor } from "../src/terrain_contact.js";
import {
  castIndexedSegment,
  resolveIndexedMotion,
} from "../src/static_collider_grid.js";

let ocean, constructionMs;
const world = () => {
  if (!ocean) {
    const started = performance.now();
    ocean = createBermudaOcean(new T.Group());
    constructionMs = performance.now() - started;
  }
  return ocean;
};
after(() => ocean?.dispose());
const vec = (p) =>
  Array.isArray(p) ? new T.Vector3(...p) : new T.Vector3().copy(p);
const hash = (array) =>
  createHash("sha256")
    .update(JSON.stringify(Array.from(array)))
    .digest("hex");

function options(length, forward, from, to) {
  const w = world(),
    radius = bodyRadius(length);
  return {
    staticColliders: w.colliders,
    dynamicColliders: w.dynamicContacts(from, to, {
      radius,
      padding: length * 0.52,
    }),
    radius,
    length: (length * 0.52) / 0.42,
    forward,
    floorHeight: (x, z) =>
      bodyTerrainFloor(x, z, {
        heightAt: w.contactSurface,
        radius,
        length: (length * 0.52) / 0.42,
        margin: 0.4 + length * 0.008,
        forward,
      }),
    bounds: {
      minX: -495,
      maxX: 495,
      minZ: -1755,
      maxZ: 135,
      minY: -735,
      maxY: 0,
    },
  };
}
function swim(points, length, label) {
  let current = points[0].clone(),
    distance = 0;
  for (let i = 1; i < points.length; i++) {
    const start = points[i - 1],
      end = points[i],
      direction = end.clone().sub(start).normalize(),
      steps = Math.ceil(start.distanceTo(end));
    for (let k = 1; k <= steps; k++) {
      const next = start.clone().lerp(end, k / steps),
        result = resolveIndexedMotion(
          current,
          next,
          options(length, direction, current, next),
        );
      assert.ok(
        vec(result.position).distanceTo(next) < 0.025,
        `${label}/${i}/${k}: ${JSON.stringify({ target: next.toArray(), actual: result.position, ids: result.contacts.map((c) => c.collider?.id || c.id) })}`,
      );
      assert.ok(current.distanceTo(next) <= 1.001, "No navigation teleport");
      distance += current.distanceTo(next);
      current.copy(next);
    }
  }
  return distance;
}

test("The lair now has one true northern aperture and a monotone descending winding route for 25/30/35m adults", () => {
  const w = world(),
    caves = w.caves;
  assert.deepEqual(
    caves.exits.map((e) => e.id),
    ["north"],
  );
  assert.deepEqual(
    caves.records[0].portals.map((p) => p.id),
    ["north"],
  );
  assert.deepEqual(
    caves.escapeRoutes.map((p) => p.id),
    ["north"],
  );
  assert.deepEqual(
    [
      BERMUDA_WORLD.minX,
      BERMUDA_WORLD.maxX,
      BERMUDA_WORLD.minZ,
      BERMUDA_WORLD.maxZ,
    ],
    [-500, 500, -1760, 140],
  );
  const inward = BERMUDA_TITAN_NAVIGATION.route.map(vec).reverse();
  assert.ok(inward[0].y - inward.at(-1).y >= 100);
  for (let i = 1; i < inward.length; i++)
    assert.ok(inward[i].y <= inward[i - 1].y);
  assert.ok(inward.some((p) => p.x > -25) && inward.some((p) => p.x < -120));
  const outside = inward[0].clone().add(new T.Vector3(0, 0, 55)),
    complete = [outside, ...inward];
  for (const length of [25, 30, 35]) {
    const distance = swim(complete, length, `enter/${length}`);
    swim([...complete].reverse(), length, `leave/${length}`);
    assert.ok(distance > 350);
    const exit = caves.exits[0],
      body = { length, radius: bodyRadius(length), forward: exit.outward },
      centre = exit.origin.clone().setY(-500),
      extent = length * 0.52 + exit.bodyMargin,
      before = centre.clone().addScaledVector(exit.outward, extent - 1),
      after = centre.clone().addScaledVector(exit.outward, extent + 1);
    assert.equal(caves.checkEscape(before, after, body)?.id, "north");
    assert.equal(caves.isEscapeSafe(after, body, "north"), true);
  }
});

test("South and rear ends remain actual solid rock before sealing and after reset; the down-gate blocks an upper shortcut", () => {
  const w = world(),
    caves = w.caves,
    southInside = new T.Vector3(-145, -580, -1675),
    southOutside = new T.Vector3(-145, -580, -1720),
    rearY = w.contactSurface(-465, -1620) + 50,
    rearInside = new T.Vector3(-440, rearY, -1620),
    rearOutside = new T.Vector3(-485, rearY, -1620);
  for (let reset = 0; reset < 2; reset++) {
    const south = castIndexedSegment(southInside, southOutside, {
      staticColliders: caves.colliders,
      radius: 0.2,
    });
    assert.ok(south?.collider.id.startsWith("kaiju_lair_south_end_"));
    const rear = castIndexedSegment(rearInside, rearOutside, {
      staticColliders: caves.colliders,
      radius: 0.2,
    });
    assert.ok(rear?.collider.id.startsWith("kaiju_lair_shell_annex_cap_"));
    assert.equal(
      caves.checkEscape(southInside, southOutside, {
        length: 35,
        forward: new T.Vector3(0, 0, -1),
      }),
      null,
    );
    assert.equal(
      caves.isEscapeSafe(
        southOutside,
        { length: 35, forward: new T.Vector3(0, 0, -1) },
        "south",
      ),
      false,
    );
    caves.resetSealing();
  }
  const high = castIndexedSegment(
    new T.Vector3(-20, -540, -1470),
    new T.Vector3(-20, -540, -1520),
    { staticColliders: caves.colliders, radius: 1 },
  );
  assert.ok(high?.collider.id.includes("descending_gate"));
  assert.equal(
    castIndexedSegment(
      new T.Vector3(-20, -590, -1510),
      new T.Vector3(-20, -590, -1520),
      { staticColliders: caves.colliders, radius: bodyRadius(35) },
    ),
    null,
  );
});

test("The layered entrance shares a single rock mesh, retains the two accepted other caves, and preserves the titan support floor", (t) => {
  const w = world(),
    main = w.caves.records[0],
    entrance = main.entrance;
  assert.equal(entrance.layers.length, 2);
  assert.equal(
    w.caves.root.getObjectsByProperty("name", "kaiju_lair_layered_entrance")
      .length,
    1,
  );
  assert.ok(entrance.geometry.index.count > 1000);
  assert.ok(entrance.contacts.length > 0);
  assert.ok(
    entrance.contacts.length <= 1500,
    "Two entrance ribs must not repeat the 110,991-contact overfit",
  );
  assert.equal(
    w.caves.records[0].roofBaseY,
    -603.0633544921875,
    "The original hall/annex roof datum cannot fall when only the northern entrance is raised",
  );
  const rocks = w.caves.props.detailBatches.find(
    (batch) => batch.kind === "rock",
  );
  t.diagnostic(
    JSON.stringify({
      caveContacts: w.caves.colliders.length,
      constructionMs,
      roofBaseY: w.caves.records[0].roofBaseY,
      entranceContacts: entrance.contacts.length,
      layers: entrance.layers,
      entranceTriangles: entrance.geometry.index.count / 3,
      addedRockNearTriangles:
        (rocks.rows.filter((r) => r.caveRework).length *
          rocks.asset.geometry.index.count) /
        3,
      addedRockFarTriangles:
        (rocks.rows.filter((r) => r.caveRework).length *
          rocks.asset.farGeometry.index.count) /
        3,
      permanentSouthContacts: w.caves.colliders.filter((c) =>
        c.id.startsWith("kaiju_lair_south_end_"),
      ).length,
    }),
  );
  const expected = {
    luminous_grotto: [
      "575ccb4eb51694c27466d853d01828e2e64e66ffb8bf25bf8f3ca39c13e98d40",
      "1df93d1d549ae105a0acaba751c1b8bff0758f86a488ba2ed8513b192d724eb5",
    ],
    fossil_passage: [
      "77b2326b592288bd33663359579704299dd392a6f53c3e0e12572c8cd8d5d101",
      "1df93d1d549ae105a0acaba751c1b8bff0758f86a488ba2ed8513b192d724eb5",
    ],
  };
  for (const r of w.caves.records.slice(1)) {
    assert.equal(
      hash(r.shell.geometry.attributes.position.array),
      expected[r.id][0],
    );
    assert.equal(hash(r.shell.geometry.index.array), expected[r.id][1]);
  }
  for (const [x, z, y] of [
    [-205, -1590, -636.6333847593282],
    [-136, -1598, -613.2985836232523],
    [-125, -1518, -641.543982195291],
    [-110, -1590, -621.7274230743118],
  ])
    assert.equal(bermudaSeabedHeight(x, z), y);
  for (const [x, , z] of BERMUDA_TITAN_NAVIGATION.route)
    assert.ok(
      Math.abs(w.contactSurface(x, z) - bermudaSeabedHeight(x, z)) < 0.3,
    );
});

test("Every entrance slab covers actual extruded rock and keeps any water-side padding below 1.5m", () => {
  const entrance = world().caves.records[0].entrance,
    geometry = entrance.geometry,
    positions = geometry.attributes.position;
  for (const [layerIndex, layer] of entrance.layers.entries()) {
    const triangles = [],
      frontZ = layer.z - layer.depth / 2;
    for (let i = 0; i < geometry.index.count; i += 3) {
      const vertices = [0, 1, 2].map((n) =>
        new T.Vector3().fromBufferAttribute(
          positions,
          geometry.index.getX(i + n),
        ),
      );
      if (vertices.every((p) => Math.abs(p.z - frontZ) < 0.001))
        triangles.push(new T.Triangle(...vertices.map((p) => p.setZ(0))));
    }
    assert.ok(triangles.length >= 80);
    const contacts = entrance.contacts.filter((c) =>
        c.id.startsWith(`kaiju_lair_entry_rib_${layerIndex}_`),
      ),
      closest = new T.Vector3();
    for (const contact of contacts)
      for (const sx of [-1, 1])
        for (const sy of [-1, 1])
          for (const sz of [-1, 1]) {
            const point = new T.Vector3(
              contact.x + sx * contact.halfSize.x,
              contact.y + sy * contact.halfSize.y,
              0,
            );
            let best = Infinity;
            for (const triangle of triangles) {
              triangle.closestPointToPoint(point, closest);
              best = Math.min(best, closest.distanceTo(point));
            }
            const dz = Math.max(
              0,
              Math.abs(contact.z + sz * contact.halfSize.z - layer.z) -
                layer.depth / 2,
            );
            assert.ok(
              Math.hypot(best, dz) <= 1.5,
              `${contact.id}: actual material padding ${Math.hypot(best, dz)}`,
            );
          }
    for (const triangle of triangles) {
      const middle = triangle.getMidpoint(new T.Vector3());
      assert.ok(
        castIndexedSegment(
          new T.Vector3(middle.x, middle.y, frontZ - 1),
          new T.Vector3(middle.x, middle.y, frontZ + layer.depth + 1),
          { staticColliders: contacts, radius: 0.01 },
        ),
        "Actual rock material must not have contact holes",
      );
    }
  }
});

test("The added HF rocks intersect their actual carved hosts in both distance meshes", () => {
  const w = world(),
    main = w.caves.records[0],
    batch = w.caves.props.detailBatches.find((b) => b.kind === "rock"),
    material = new T.MeshBasicMaterial({ side: T.DoubleSide }),
    ray = new T.Raycaster();
  w.root.updateMatrixWorld(true);
  try {
    for (const row of batch.rows.filter((r) => r.caveRework)) {
      const host =
          row.mountId === "entrance"
            ? main.entrance.mesh
            : main.partitions.find((p) => p.id === row.mountId).mesh,
        wall = new T.Mesh(host.geometry, material),
        normal = row.normal,
        u = new T.Vector3()
          .crossVectors(
            normal,
            Math.abs(normal.y) > 0.9
              ? new T.Vector3(1, 0, 0)
              : new T.Vector3(0, 1, 0),
          )
          .normalize(),
        v = new T.Vector3().crossVectors(normal, u).normalize();
      wall.matrixAutoUpdate = false;
      wall.matrix.copy(host.matrixWorld);
      wall.updateMatrixWorld(true);
      for (const geometry of [batch.asset.geometry, batch.asset.farGeometry]) {
        const rock = new T.Mesh(geometry, material);
        rock.matrixAutoUpdate = false;
        rock.matrix.copy(row.matrix);
        rock.updateMatrixWorld(true);
        let embeddedRays = 0;
        for (const a of [-0.15, 0, 0.15])
          for (const b of [-0.15, 0, 0.15]) {
            const start = row.position
              .clone()
              .addScaledVector(normal, row.height * 3)
              .addScaledVector(u, a * row.width)
              .addScaledVector(v, b * row.width);
            ray.set(start, normal.clone().negate());
            ray.far = row.height * 6;
            const ground = ray.intersectObject(wall)[0],
              skin = ray.intersectObject(rock);
            if (
              ground &&
              skin.length &&
              skin[0].distance < ground.distance &&
              skin.at(-1).distance > ground.distance + 0.1
            )
              embeddedRays++;
          }
        assert.ok(
          embeddedRays >= 2,
          `${row.mountId}/${row.position.toArray()}: actual HF skin must cross its rock host, got ${embeddedRays} rays`,
        );
      }
    }
  } finally {
    material.dispose();
  }
});

test("The rear shadow is real roof rock, clears exposed whole-body skin and opaquely hides the allowed posterior continuation", () => {
  const w = world(),
    overhang = w.caves.records[0].partitions.find(
      (p) => p.id === "rear_shadow_overhang",
    ),
    material = new T.MeshBasicMaterial({ side: T.DoubleSide }),
    wall = new T.Mesh(overhang.mesh.geometry, material),
    camera = new T.PerspectiveCamera(65, 1280 / 724, 0.1, 3000),
    ray = new T.Raycaster(),
    point = new T.Vector3();
  w.root.updateMatrixWorld(true);
  wall.matrixAutoUpdate = false;
  wall.matrix.copy(overhang.mesh.matrixWorld);
  wall.updateMatrixWorld(true);
  try {
    const position = wall.geometry.attributes.position,
      index = wall.geometry.index,
      vertexColor = wall.geometry.attributes.color,
      stone = overhang.mesh.material;
    assert.ok(
      index.count / 3 < 15000,
      `A single roof rock cannot add ${index.count / 3} triangles`,
    );
    let albedo = 0;
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(wall.matrixWorld);
      const roof = w.caves.records[0].annex.roofAt(point.x, point.z);
      assert.notEqual(
        roof,
        null,
        "The whole rock must remain under its actual host roof",
      );
      assert.ok(
        point.y <= roof + 1.65,
        `Rock cannot protrude above the rear roof: ${point.toArray()} / ${roof}`,
      );
      albedo +=
        (vertexColor.getX(i) * stone.color.r +
          vertexColor.getY(i) * stone.color.g +
          vertexColor.getZ(i) * stone.color.b) /
        3;
    }
    assert.ok(
      albedo / position.count > 0.025,
      "Vertex and material tint must not multiply the rock back to near-black",
    );
    assert.equal(
      stone.fog,
      false,
      "The closed den must not revert to the blue false-exit treatment",
    );
    let roofFaces = 0;
    for (let i = 0; i < index.count; i += 3) {
      const triangle = new T.Triangle(
        ...[0, 1, 2].map((j) =>
          new T.Vector3().fromBufferAttribute(position, index.getX(i + j)),
        ),
      );
      if (triangle.getNormal(new T.Vector3()).y <= 0.1) continue;
      const centre = triangle.getMidpoint(new T.Vector3()),
        roof = w.caves.records[0].annex.roofAt(centre.x, centre.z);
      assert.ok(
        centre.y >= roof + 0.6 && centre.y <= roof + 1.65,
        "Upper rock skin must embed into the real roof, without a water seam or exterior panel",
      );
      roofFaces++;
    }
    assert.ok(roofFaces > 100);
    let measured = 0,
      highest = -Infinity,
      exposedBelowRock = 0,
      hiddenPosterior = 0,
      minimumExposedGap = Infinity;
    const views = [
      new T.Vector3(-97, -583, -1648),
      new T.Vector3(-60, -485, -1528),
      new T.Vector3(-85, -548, -1530),
    ];
    // 当前模型是一个完整蒙皮身体；同一后躯空间按真实岩体分类，不能再读取旧bust的后段别名或套用其整体高度。
    for (const body of [w.titan.near, w.titan.far])
      for (const id of new Set(body.geometry.index.array)) {
        body.getVertexPosition(id, point).applyMatrix4(body.matrixWorld);
        if (
          point.x < -385 ||
          point.x > -355 ||
          point.z < -1675 ||
          point.z > -1565
        )
          continue;
        measured++;
        highest = Math.max(highest, point.y);
        ray.set(new T.Vector3(point.x, 100, point.z), new T.Vector3(0, -1, 0));
        ray.far = 1200;
        const hits = ray.intersectObject(wall, false),
          levels = [];
        for (const hit of hits)
          if (!levels.some((y) => Math.abs(y - hit.point.y) < 1e-5))
            levels.push(hit.point.y);
        if (levels.length < 2) continue;
        const underside = Math.min(...levels),
          top = Math.max(...levels);
        if (point.y < underside) {
          const gap = underside - point.y;
          assert.ok(
            gap > 0.1,
            `Exposed whole skin must clear the actual lower rock face: ${gap}`,
          );
          minimumExposedGap = Math.min(minimumExposedGap, gap);
          exposedBelowRock++;
          continue;
        }
        assert.ok(
          point.y < top - 0.1,
          "The hidden posterior cannot protrude above its opaque host",
        );
        assert.ok(
          isPositionBlocked(point, {
            radius: 0.001,
            colliders: overhang.contacts,
          }),
          "Every buried posterior point remains inside the same real solid contacts",
        );
        for (const eye of views) {
          const delta = point.clone().sub(eye),
            distance = delta.length();
          ray.set(eye, delta.normalize());
          ray.far = distance;
          const cover = ray.intersectObject(wall, false)[0];
          assert.ok(
            cover && cover.distance < distance - 0.0001,
            "The allowed rear continuation must be opaquely covered from actual near/far cave views",
          );
        }
        hiddenPosterior++;
      }
    assert.ok(measured > 100);
    assert.ok(
      exposedBelowRock > 20,
      "Actual visible body remains below the rock underside",
    );
    assert.ok(
      hiddenPosterior > 100,
      "The whole posterior intentionally continues into the opaque rear den",
    );
    ray.far = Infinity;
    camera.position.set(-97, -583, -1648);
    camera.lookAt(-198, -603, -1590);
    camera.updateMatrixWorld(true);
    for (const [x, y] of [
      [900, 150],
      [920, 300],
    ]) {
      ray.setFromCamera(
        new T.Vector2((x / 1280) * 2 - 1, 1 - ((y - 76) / 724) * 2),
        camera,
      );
      assert.ok(
        ray.intersectObject(wall).length,
        `${x}/${y}: the old blue wedge must meet a real rock surface`,
      );
    }
    camera.aspect = 1280 / 800;
    camera.updateProjectionMatrix();
    camera.position.set(-85, -435, -1220);
    camera.lookAt(-85, -470, -1400);
    camera.updateMatrixWorld(true);
    for (const [x, y] of [
      [240, 260],
      [120, 350],
    ]) {
      ray.setFromCamera(
        new T.Vector2((x / 1280) * 2 - 1, 1 - (y / 800) * 2),
        camera,
      );
      assert.equal(
        ray.intersectObject(wall).length,
        0,
        "The former floating entry black block cannot protrude from the external cave shell",
      );
    }
    const a = new T.Vector3(),
      b = new T.Vector3(),
      c = new T.Vector3(),
      normal = new T.Vector3(),
      centre = new T.Vector3(),
      triangle = new T.Triangle(),
      closest = new T.Vector3();
    const nearestSurface = (p) => {
      let distance = Infinity;
      for (let j = 0; j < index.count; j += 3) {
        triangle.a.fromBufferAttribute(position, index.getX(j));
        triangle.b.fromBufferAttribute(position, index.getX(j + 1));
        triangle.c.fromBufferAttribute(position, index.getX(j + 2));
        triangle.closestPointToPoint(p, closest);
        distance = Math.min(distance, closest.distanceTo(p));
      }
      return distance;
    };
    let covered = 0,
      maxAdvance = 0,
      maxNormalAdvance = 0;
    const stride = Math.max(3, Math.floor(index.count / 90 / 3) * 3);
    for (let i = 0; i < index.count; i += stride) {
      a.fromBufferAttribute(position, index.getX(i));
      b.fromBufferAttribute(position, index.getX(i + 1));
      c.fromBufferAttribute(position, index.getX(i + 2));
      normal.crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
      if (normal.y > 0.1) continue;
      centre
        .copy(a)
        .add(b)
        .add(c)
        .multiplyScalar(1 / 3);
      const from = centre.clone().addScaledVector(normal, 4),
        to = centre.clone().addScaledVector(normal, -4);
      ray.set(from, normal.clone().negate());
      ray.far = 8;
      const visible = ray.intersectObject(wall)[0];
      if (!visible || visible.face.normal.dot(ray.ray.direction) >= 0) continue;
      const hit = castIndexedSegment(from, to, {
        staticColliders: overhang.contacts,
        radius: 0.02,
      });
      assert.ok(hit, "Every sampled visible rock boundary must remain solid");
      const normalAdvance = visible.distance - hit.distance,
        // 与主壳相同的2m真实面包络：凹层旁的离轴近面不能被误当成远处法线水域。
        advance =
          normalAdvance > 2
            ? Math.min(normalAdvance, nearestSurface(hit.point))
            : normalAdvance;
      assert.ok(
        advance <= 2,
        JSON.stringify({
          face: i / 3,
          intrusion: advance,
          normalAdvance,
          point: hit.point,
          collider: hit.collider.id,
        }),
      );
      assert.ok(
        hit.distance <= visible.distance + 0.05,
        "A solid cannot stop after the visible rock",
      );
      maxAdvance = Math.max(maxAdvance, advance);
      maxNormalAdvance = Math.max(maxNormalAdvance, normalAdvance);
      covered++;
    }
    assert.ok(covered > 20);
    console.log(
      JSON.stringify({
        rearRock: {
          contacts: overhang.contacts.length,
          triangles: index.count / 3,
          roofFit: overhang.roofFit,
          roofFaces,
          albedo: albedo / position.count,
          checkedBoundaries: covered,
          maxAdvance,
          maxNormalAdvance,
          measuredWholeVertices: measured,
          highestWholeVertex: highest,
          exposedBelowRock,
          hiddenPosterior,
          minimumExposedGap,
        },
      }),
    );
  } finally {
    material.dispose();
  }
});

test("The overhead gate terminates at its host roof without inverted columns or a detached lower panel", (t) => {
  const w = world(),
    main = w.caves.records[0],
    gate = main.partitions.find((p) => p.id === "descending_gate"),
    position = gate.geometry.attributes.position,
    index = gate.geometry.index,
    base = gate.bottomY,
    point = new T.Vector3(),
    material = new T.MeshBasicMaterial({ side: T.DoubleSide }),
    wall = new T.Mesh(gate.geometry, material),
    shell = new T.Mesh(main.shell.geometry, material),
    camera = new T.PerspectiveCamera(60, 1280 / 800, 0.1, 3000),
    ray = new T.Raycaster();
  w.root.updateMatrixWorld(true);
  for (const [clone, source] of [
    [wall, gate.mesh],
    [shell, main.shell],
  ]) {
    clone.matrixAutoUpdate = false;
    clone.matrix.copy(source.matrixWorld);
    clone.updateMatrixWorld(true);
  }
  try {
    assert.equal(base, -565);
    assert.ok(gate.contacts.length > 0);
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(wall.matrixWorld);
      assert.ok(
        point.y >= base - 0.0001,
        `A roof below the gate base must not create a descending column: ${point.toArray()}`,
      );
    }
    for (const contact of gate.contacts) {
      let bottom = Infinity,
        top = -Infinity;
      for (const sx of [-1, 1])
        for (const sy of [-1, 1])
          for (const sz of [-1, 1]) {
            point
              .set(
                sx * contact.halfSize.x,
                sy * contact.halfSize.y,
                sz * contact.halfSize.z,
              )
              .applyQuaternion(contact.rotation)
              .add(contact);
            bottom = Math.min(bottom, point.y);
            top = Math.max(top, point.y);
          }
      assert.ok(
        bottom >= base - 0.040001,
        `${contact.id} must stop at the same base, with only its existing 4cm contact padding: ${bottom}`,
      );
      assert.ok(
        top > base + 0.04,
        "A collapsed roof-only column must not retain an invisible box",
      );
    }

    // The real Gate04 side camera identified these two pixels on the inverted
    // right-hand columns. The original hollow shell must now be first visible.
    camera.position.set(-25, -578, -1526);
    camera.lookAt(15, -565, -1498);
    camera.updateMatrixWorld(true);
    for (const [x, y] of [
      [450, 650],
      [480, 600],
    ]) {
      ray.setFromCamera(
        new T.Vector2((x / 1280) * 2 - 1, 1 - (y / 800) * 2),
        camera,
      );
      assert.equal(
        ray.intersectObject(wall, false).length,
        0,
        `${x}/${y}: the former detached lower gate face must be absent`,
      );
      assert.equal(
        ray.intersectObjects([wall, shell], false)[0]?.object,
        shell,
        `${x}/${y}: removing a false column must leave the real host shell closed`,
      );
    }

    const boundary = new T.Box3().setFromObject(wall).expandByScalar(8),
      triangles = [],
      gateTriangles = [],
      a = new T.Vector3(),
      b = new T.Vector3(),
      c = new T.Vector3(),
      bounds = new T.Box3(),
      closest = new T.Vector3();
    for (const mesh of [wall, shell]) {
      const p = mesh.geometry.attributes.position,
        ids = mesh.geometry.index;
      for (let j = 0; j < ids.count; j += 3) {
        a.fromBufferAttribute(p, ids.getX(j)).applyMatrix4(mesh.matrixWorld);
        b.fromBufferAttribute(p, ids.getX(j + 1)).applyMatrix4(
          mesh.matrixWorld,
        );
        c.fromBufferAttribute(p, ids.getX(j + 2)).applyMatrix4(
          mesh.matrixWorld,
        );
        bounds.setFromPoints([a, b, c]);
        if (!bounds.intersectsBox(boundary)) continue;
        const face = new T.Triangle(a.clone(), b.clone(), c.clone()),
          row = {
            triangle: face,
            bounds: bounds.clone(),
            normal: face.getNormal(new T.Vector3()),
            centre: face.getMidpoint(new T.Vector3()),
          };
        triangles.push(row);
        if (mesh === wall) gateTriangles.push(row);
      }
    }
    const nearestSurface = (p) => {
      let distance = Infinity;
      for (const row of triangles) {
        if (row.bounds.distanceToPoint(p) > distance) continue;
        row.triangle.closestPointToPoint(p, closest);
        distance = Math.min(distance, closest.distanceTo(p));
      }
      return distance;
    };
    const contacts = w.caves.colliders.filter(
        (contact) =>
          contact.id.startsWith("kaiju_lair_shell_") ||
          contact.id.startsWith("kaiju_lair_partition_descending_gate_"),
      ),
      samples = new Set(),
      taper = gateTriangles.filter((row) => row.centre.x > 30),
      stride = Math.max(1, Math.floor(gateTriangles.length / 72)),
      taperStride = Math.max(1, Math.floor(taper.length / 24));
    for (let i = 0; i < gateTriangles.length; i += stride)
      samples.add(gateTriangles[i]);
    for (let i = 0; i < taper.length; i += taperStride) samples.add(taper[i]);
    const hostRay = new T.Raycaster(),
      hostNormal = new T.Vector3(),
      hostNormalMatrix = new T.Matrix3().getNormalMatrix(shell.matrixWorld);
    let covered = 0,
      embeddedStarts = 0,
      firstEmbeddedStart = null,
      maxAdvance = 0,
      maxNormalAdvance = 0;
    for (const row of samples) {
      if (row.normal.lengthSq() < 0.5) continue;
      const from = row.centre.clone().addScaledVector(row.normal, 4),
        to = row.centre.clone().addScaledVector(row.normal, -4);
      if (!main.contains(from, 0)) {
        hostRay.set(from, row.normal.clone().negate());
        hostRay.far = 2000;
        const host = hostRay.intersectObject(shell, false)[0];
        if (
          host &&
          hostNormal
            .copy(host.face.normal)
            .applyNormalMatrix(hostNormalMatrix)
            .dot(hostRay.ray.direction) > 1e-7
        ) {
          // Outside the cavity AND the actual first host face is an exit from
          // rock. A gate face embedded in that solid is not a water boundary.
          // A genuine external water start first enters rock, so it is kept.
          embeddedStarts++;
          firstEmbeddedStart ??= {
            from: from.toArray(),
            hostPoint: host.point.toArray(),
            hostFace: host.faceIndex,
            firstHostFaceIsExit: true,
          };
          continue;
        }
      }
      ray.set(from, row.normal.clone().negate());
      ray.far = 8;
      const visible = ray.intersectObjects([wall, shell], false)[0];
      if (!visible || visible.face.normal.dot(ray.ray.direction) >= 0) continue;
      const hit = castIndexedSegment(from, to, {
        staticColliders: contacts,
        radius: 0.02,
      });
      assert.ok(hit, "The remaining visible gate/host boundary must be solid");
      const normalAdvance = visible.distance - hit.distance,
        advance =
          normalAdvance > 2
            ? Math.min(normalAdvance, nearestSurface(hit.point))
            : normalAdvance;
      assert.ok(
        advance <= 2,
        JSON.stringify({
          gateBoundary: row.centre.toArray(),
          intrusion: advance,
          normalAdvance,
          point: hit.point,
          collider: hit.collider.id,
        }),
      );
      assert.ok(
        hit.distance <= visible.distance + 0.05,
        "Contact cannot begin after a visible rock boundary",
      );
      maxAdvance = Math.max(maxAdvance, advance);
      maxNormalAdvance = Math.max(maxNormalAdvance, normalAdvance);
      covered++;
    }
    assert.ok(covered > 30);
    t.diagnostic(
      JSON.stringify({
        descendingGate: {
          contacts: gate.contacts.length,
          triangles: index.count / 3,
          checkedBoundaries: covered,
          embeddedStarts,
          firstEmbeddedStart,
          maxAdvance,
          maxNormalAdvance,
        },
      }),
    );
  } finally {
    material.dispose();
  }
});
