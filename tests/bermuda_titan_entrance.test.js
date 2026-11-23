import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as T from "three";
import {
  createBermudaCaves,
  createBermudaTitanEntrance,
} from "../src/bermuda_caves.js";
import { createBermudaTerrainMesh } from "../src/bermuda_terrain_mesh.js";
import { bermudaSeabedHeight } from "../src/bermuda_terrain.js";
import { createTerrainSurface } from "../src/terrain_surface.js";
import { bodyOffsets, bodyRadius } from "../src/collision.js";
import { bodyTerrainFloor } from "../src/terrain_contact.js";
import {
  castIndexedSegment,
  resolveIndexedMotion,
} from "../src/static_collider_grid.js";
import {
  BERMUDA_TITAN_ENTRANCE,
  BERMUDA_TITAN_REAR_ANNEX,
  BERMUDA_TITAN_NAVIGATION,
} from "../src/bermuda_cave_config.js";

let fixture;
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
function geometryTriangles(geometry) {
  const p = geometry.attributes.position,
    index = geometry.index,
    result = [];
  for (let i = 0; i < index.count; i += 3)
    result.push(
      new T.Triangle(
        ...[0, 1, 2].map((j) =>
          new T.Vector3().fromBufferAttribute(p, index.getX(i + j)),
        ),
      ),
    );
  return result;
}
function world() {
  if (fixture) return fixture;
  const terrain = new T.Mesh(
    createBermudaTerrainMesh(),
    new T.MeshBasicMaterial({ side: T.DoubleSide }),
  );
  terrain.updateMatrixWorld(true);
  const heightAt = createTerrainSurface(terrain, {
      fallback: bermudaSeabedHeight,
    }),
    entrance = createBermudaTitanEntrance({ x: -85 }, heightAt);
  fixture = { terrain, heightAt, entrance };
  return fixture;
}
after(() => {
  if (!fixture) return;
  fixture.caves?.dispose();
  fixture.entrance.geometry.dispose();
  fixture.terrain.geometry.dispose();
  fixture.terrain.material.dispose();
});

test("The actual northern fault arches have tall open water and unequal fractured crowns", () => {
  const { entrance, heightAt } = world(),
    material = new T.MeshBasicMaterial({ side: T.DoubleSide }),
    mesh = new T.Mesh(entrance.geometry, material),
    ray = new T.Raycaster();
  mesh.updateMatrixWorld(true);
  try {
    assert.equal(entrance.layers.length, 2);
    assert.ok(entrance.contacts.length < 1500);
    assert.ok(entrance.geometry.index.count / 3 <= 1000);
    for (const layer of entrance.layers) {
      for (const dx of [-25, -15, 0, 15, 25]) {
        const x = -85 + dx,
          floor = heightAt(x, layer.z);
        ray.set(new T.Vector3(x, floor + 0.1, layer.z), new T.Vector3(0, 1, 0));
        const hit = ray.intersectObject(mesh)[0];
        assert.ok(hit, "A real roof must exist above each advertised opening");
        assert.ok(
          hit.point.y - floor >= 150,
          `Opening clearance ${dx}: ${hit.point.y - floor}`,
        );
        assert.ok(Math.abs(hit.point.y - layer.roofAt(x, layer.z)) < 0.001);
      }
      assert.ok(layer.roofAt(-85, layer.z) - heightAt(-85, layer.z) > 165);
    }
    const p = entrance.geometry.attributes.position,
      left = [],
      right = [];
    for (let i = 0; i < p.count; i++)
      (p.getX(i) < -85 ? left : right).push(p.getY(i));
    assert.ok(Math.abs(Math.max(...left) - Math.max(...right)) > 8);
    assert.notEqual(entrance.layers[0].height, entrance.layers[1].height);
  } finally {
    material.dispose();
  }
});

test("Entrance solids cover the real rock and remain within 1.5m of its rendered surface", () => {
  const { entrance } = world(),
    triangles = geometryTriangles(entrance.geometry),
    nearest = new T.Vector3();
  for (const contact of entrance.contacts)
    for (const sx of [-1, 1])
      for (const sy of [-1, 1])
        for (const sz of [-1, 1]) {
          const point = new T.Vector3(
            contact.x + sx * contact.halfSize.x,
            contact.y + sy * contact.halfSize.y,
            contact.z + sz * contact.halfSize.z,
          );
          let distance = Infinity;
          for (const triangle of triangles) {
            triangle.closestPointToPoint(point, nearest);
            distance = Math.min(distance, point.distanceTo(nearest));
          }
          assert.ok(distance < 1.5, `${contact.id}: ${distance}`);
        }
  for (const layer of entrance.layers) {
    const front = layer.z - layer.depth / 2,
      contacts = entrance.contacts.filter(
        (c) => Math.abs(c.z - layer.z) < 0.01,
      );
    for (const triangle of triangles)
      if (
        [triangle.a, triangle.b, triangle.c].every(
          (p) => Math.abs(p.z - front) < 0.001,
        )
      ) {
        const p = triangle.getMidpoint(new T.Vector3());
        assert.ok(
          castIndexedSegment(
            p.clone().setZ(front - 0.1),
            p.clone().setZ(front + layer.depth + 0.1),
            { staticColliders: contacts, radius: 0.001 },
          ),
          "A rendered cross-section triangle cannot have a contact hole",
        );
      }
  }
});

test("25/30m whole shared bodies cross the raised real entrance in both directions", () => {
  const f = world(),
    caves = (f.caves ??= createBermudaCaves(new T.Group(), {
      heightAt: f.heightAt,
    })),
    main = caves.records[0],
    triangles = geometryTriangles(main.shell.geometry)
      .filter((tri) => [tri.a, tri.b, tri.c].some((p) => p.z >= -1465.4))
      .concat(geometryTriangles(main.entrance.geometry)),
    closest = new T.Vector3();
  assert.equal(main.frameAt(1).ceilingY - main.frameAt(1).floorY, 174);
  assert.equal(caves.exits.length, 1);
  assert.equal(caves.exits[0].id, "north");
  assert.deepEqual(BERMUDA_TITAN_NAVIGATION.route.at(-1), [-85, -500, -1415]);
  assert.equal(BERMUDA_TITAN_REAR_ANNEX.portalStartRow, 3);
  assert.equal(BERMUDA_TITAN_REAR_ANNEX.innerWidth, 164);
  assert.equal(BERMUDA_TITAN_ENTRANCE.innerRoofLift, 49);
  const routes = [
    [
      new T.Vector3(-85, -480, -1355),
      new T.Vector3(-85, -500, -1415),
      new T.Vector3(-35, -550, -1455),
    ],
    [
      new T.Vector3(-85, -395, -1355),
      new T.Vector3(-85, -395, -1415),
      new T.Vector3(-85, -410, -1433),
    ],
  ];
  for (const length of [25, 30])
    for (const base of routes)
      for (const route of [base, [...base].reverse()]) {
        let current = route[0].clone();
        for (let i = 1; i < route.length; i++) {
          const from = route[i - 1],
            to = route[i],
            forward = to.clone().sub(from).normalize(),
            count = Math.ceil(from.distanceTo(to)),
            radius = bodyRadius(length),
            physicalLength = (length * 0.52) / 0.42;
          for (let k = 1; k <= count; k++) {
            const target = from.clone().lerp(to, k / count),
              result = resolveIndexedMotion(current, target, {
                staticColliders: caves.colliders,
                radius,
                length: physicalLength,
                forward,
                floorHeight: (x, z) =>
                  bodyTerrainFloor(x, z, {
                    heightAt: f.heightAt,
                    length: physicalLength,
                    radius,
                    forward,
                    margin: 0.4 + length * 0.008,
                  }),
              });
            assert.ok(
              new T.Vector3().copy(result.position).distanceTo(target) < 0.025,
              JSON.stringify({ length, target: target.toArray(), result }),
            );
            for (const offset of bodyOffsets({
              length: physicalLength,
              radius,
              forward,
            })) {
              const center = target
                .clone()
                .add(new T.Vector3(offset.x, offset.y, offset.z));
              for (const triangle of triangles) {
                triangle.closestPointToPoint(center, closest);
                assert.ok(
                  center.distanceToSquared(closest) > radius * radius,
                  `Actual rendered roof/wall intersects a ${length}m body`,
                );
              }
            }
            current.copy(target);
          }
        }
      }
});

test("The newly raised northern shell retains real coverage within the existing 2m surface envelope", (t) => {
  const f = world(),
    caves = (f.caves ??= createBermudaCaves(new T.Group(), {
      heightAt: f.heightAt,
    })),
    main = caves.records[0],
    shell = main.shell,
    triangles = geometryTriangles(shell.geometry),
    contacts = caves.colliders.filter((c) =>
      c.id.startsWith("kaiju_lair_shell_"),
    ),
    material = shell.material,
    audit = new T.MeshBasicMaterial({ side: T.DoubleSide }),
    ray = new T.Raycaster(),
    nearest = new T.Vector3();
  shell.material = audit;
  shell.updateMatrixWorld(true);
  let checked = 0,
    maximum = -Infinity;
  try {
    for (const triangle of triangles) {
      const point = triangle.getMidpoint(new T.Vector3()),
        normal = triangle.getNormal(new T.Vector3());
      if (
        point.z < -1465.4 ||
        normal.y > -0.2 ||
        point.y < f.heightAt(point.x, point.z) + 20
      )
        continue;
      const end = point.clone().addScaledVector(normal, -18),
        direction = normal.clone().negate(),
        start = new T.Vector3();
      let visible;
      for (const distance of [12, 6, 3, 2.25, 1, 0.25, 0.02, 0.001]) {
        start.copy(point).addScaledVector(normal, distance);
        ray.set(start, direction);
        ray.far = distance + 18;
        const hit = ray.intersectObject(shell, false)[0];
        if (hit && hit.face.normal.dot(direction) < 0) {
          visible = hit;
          break;
        }
      }
      assert.ok(
        visible,
        "A northern inward roof face must remain visible from the water",
      );
      const hit = castIndexedSegment(start, end, {
        staticColliders: contacts,
        radius: 0.02,
      });
      assert.ok(hit, "The raised visible roof must have solid contacts");
      assert.ok(
        hit.distance <= visible.distance + 0.04,
        "The body cannot cross visible rock before the contact",
      );
      let intrusion = visible.distance - hit.distance;
      if (intrusion > 2) {
        let distance = Infinity;
        for (const surface of triangles) {
          surface.closestPointToPoint(new T.Vector3().copy(hit.point), nearest);
          distance = Math.min(distance, nearest.distanceTo(hit.point));
        }
        intrusion = Math.min(intrusion, distance);
      }
      maximum = Math.max(maximum, intrusion);
      assert.ok(
        intrusion <= 2,
        JSON.stringify({
          collider: hit.collider.id,
          intrusion,
          point: point.toArray(),
        }),
      );
      checked++;
    }
    assert.ok(checked >= 100);
    t.diagnostic(
      JSON.stringify({
        checkedNorthernRoofFaces: checked,
        maximumSurfaceEnvelope: maximum,
      }),
    );
  } finally {
    shell.material = material;
    audit.dispose();
  }
});

test("The widened inner den, unchanged side caves and advertised routes retain their reviewed geometry", () => {
  const f = world(),
    caves = (f.caves ??= createBermudaCaves(new T.Group(), {
      heightAt: f.heightAt,
    })),
    main = caves.records[0],
    coordinates = (g, cut) =>
      geometryTriangles(g)
        .filter((t) => !cut || [t.a, t.b, t.c].every((p) => p.z <= cut))
        .map((t) => [t.a.toArray(), t.b.toArray(), t.c.toArray()]),
    deep = coordinates(main.shell.geometry, -1465.4);
  // Western-junction clearance is independently checked against actual adult
  // skin and complete-world motion in bermuda_titan_annex_access.test.js.
  assert.equal(deep.length, 8898);
  assert.equal(
    hash(deep),
    "0121d622958427810fd1b2d7537fd7d44e44732ffeb264aad37cc2ed6d40f776",
  );
  const expected = [
    "f68f3cf9d2b1264f61d3c39a012e58d45883e75808803e72d2f66dbab4b96073",
    "47fac3ce67442ce92cc9681023a06cf6fef43ddd610d426c10db78ee3e4267f4",
  ];
  for (const [i, record] of caves.records.slice(1).entries())
    assert.equal(hash(coordinates(record.shell.geometry)), expected[i]);
  for (const route of main.routes) {
    assert.deepEqual(
      route.points[0].toArray(),
      route.id === "lower" ? [-110, -600, -1590] : [-110, -596, -1590],
    );
    assert.deepEqual(
      route.points.at(-1).toArray(),
      route.id === "lower" ? [-85, -500, -1415] : [-85, -496, -1415],
    );
  }
});

test("Only the entrance receives bounded albedo-preserving fill with owned material disposal", () => {
  const f = world(),
    caves = (f.caves ??= createBermudaCaves(new T.Group(), {
      heightAt: f.heightAt,
    })),
    main = caves.records[0],
    material = main.entrance.mesh.material,
    shader = {
      uniforms: {},
      vertexShader: T.ShaderLib.standard.vertexShader,
      fragmentShader: T.ShaderLib.standard.fragmentShader,
    },
    original = main.shell.material;
  assert.equal(material.name, "bermuda_lair_entry_wet_stone");
  assert.notEqual(material, original);
  assert.equal(material.fog, true);
  assert.equal(material.vertexColors, true);
  assert.equal(material.transparent, false);
  assert.equal(material.side, original.side);
  assert.equal(material.map, original.map);
  assert.equal(material.roughness, 0.9);
  assert.equal(material.emissive.getHex(), 0);
  material.onBeforeCompile(shader, {});
  assert.match(
    shader.fragmentShader,
    /totalEmissiveRadiance \+= diffuseColor\.rgb \* entranceFill/,
  );
  assert.match(shader.fragmentShader, /0\.16 \+ 0\.08 \* broad/);
  assert.match(shader.fragmentShader, /1\.0 - 0\.25 \* strata/);
  assert.match(shader.fragmentShader, /detailGradient/);
  assert.match(shader.vertexShader, /vSurfaceDetail = mat3/);
  const originalShader = {
    uniforms: {},
    vertexShader: T.ShaderLib.standard.vertexShader,
    fragmentShader: T.ShaderLib.standard.fragmentShader,
  };
  original.onBeforeCompile(originalShader, {});
  assert.doesNotMatch(originalShader.fragmentShader, /entranceFill/);
  assert.notEqual(
    material.customProgramCacheKey(),
    original.customProgramCacheKey(),
  );
  assert.equal(caves.root.getObjectsByProperty("isPointLight", true).length, 0);
  let disposal = 0;
  material.addEventListener("dispose", () => disposal++);
  caves.dispose();
  caves.dispose();
  assert.equal(disposal, 1);
  f.caves = null;
});
