import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as T from "three";
import { createTerrainSurface } from "../src/terrain_surface.js";
import { createTitanRestingRock } from "../src/bermuda_titan_resting_rock.js";
import { createBermudaTitanPawRock } from "../src/bermuda_titan_paw_rock.js";

const digest = (array) =>
  createHash("sha256")
    .update(Buffer.from(array.buffer, array.byteOffset, array.byteLength))
    .digest("hex");
const contactsDigest = (contacts) =>
  createHash("sha256").update(JSON.stringify(contacts)).digest("hex");
function nativeFloor() {
  const geometry = new T.BufferGeometry();
  geometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(
      [
        -500, -652, -1740, -100, -638, -1740, -500, -641, -1440, -100, -646,
        -1440,
      ],
      3,
    ),
  );
  geometry.setIndex([0, 2, 1, 1, 2, 3]);
  const mesh = new T.Mesh(geometry, new T.MeshBasicMaterial());
  mesh.userData.terrainContact = true;
  const heightAt = createTerrainSurface(mesh, { fallback: () => -650 });
  return {
    heightAt,
    dispose() {
      heightAt.dispose();
      geometry.dispose();
      mesh.material.dispose();
    },
  };
}
function isSubsequence(source, visible) {
  let next = 0;
  for (let i = 0; i < source.length && next < visible.length; i += 3)
    if (
      source[i] === visible[next] &&
      source[i + 1] === visible[next + 1] &&
      source[i + 2] === visible[next + 2]
    )
      next += 3;
  return next === visible.length;
}
function checkRenderOnly(rock) {
  const full = rock.sourceGeometry,
    visible = rock.mesh.geometry;
  assert.ok(full, "Full physical geometry must remain separately available");
  assert.ok(
    visible.index.count < full.index.count,
    "Redundant seabed faces must not be drawn",
  );
  assert.equal(visible.attributes.position, full.attributes.position);
  assert.equal(visible.attributes.normal, full.attributes.normal);
  assert.ok(
    isSubsequence(full.index.array, visible.index.array),
    "Drawing must preserve each retained source face and its order",
  );
  const stats = rock.renderCull;
  assert.equal(stats.sourceIndexCount, full.index.count);
  assert.equal(stats.renderIndexCount, visible.index.count);
  assert.equal(
    full.index.count - visible.index.count,
    3 * (stats.removedTopTriangles + stats.removedSkirtTriangles),
  );
  assert.ok(stats.removedTopTriangles > 0);
  assert.equal(rock.mesh.material.depthWrite, true);
  assert.equal(rock.mesh.material.depthTest, true);
  assert.equal(rock.mesh.material.polygonOffset, false);
}

test("Legacy resting beds omit only unsupported duplicate floor while preserving raised rock and exact contacts", () => {
  const native = nativeFloor(),
    parent = new T.Group(),
    center = new T.Vector3(-310, 0, -1580),
    topAt = (x, z) =>
      native.heightAt(x, z) + Math.max(0, 4 - Math.hypot(x + 310, z + 1580)),
    underside = (x, z) =>
      Math.hypot(x + 310, z + 1580) < 1.25 ? native.heightAt(x, z) + 6 : null,
    options = {
      center,
      rx: 12,
      rz: 10,
      heightAt: native.heightAt,
      topAt,
      fitted: true,
      id: "fixture",
    };
  let control, rock;
  try {
    control = createTitanRestingRock(new T.Group(), options);
    rock = createTitanRestingRock(parent, { ...options, ceilingAt: underside });
    checkRenderOnly(rock);
    console.log("legacy-render-cull", JSON.stringify(rock.renderCull));
    assert.equal(
      digest(rock.sourceGeometry.attributes.position.array),
      digest(control.mesh.geometry.attributes.position.array),
    );
    assert.equal(
      digest(rock.sourceGeometry.attributes.normal.array),
      digest(control.mesh.geometry.attributes.normal.array),
    );
    assert.equal(
      digest(rock.sourceGeometry.index.array),
      digest(control.mesh.geometry.index.array),
    );
    assert.equal(
      contactsDigest(rock.contacts),
      contactsDigest(control.contacts),
    );
    const p = rock.sourceGeometry.attributes.position,
      s = rock.sourceGeometry.index.array,
      v = rock.mesh.geometry.index.array;
    const drawn = new Set(
      Array.from(
        { length: v.length / 3 },
        (_, i) => `${v[i * 3]}/${v[i * 3 + 1]}/${v[i * 3 + 2]}`,
      ),
    );
    for (let i = 0; i < s.length; i += 3) {
      const ids = [s[i], s[i + 1], s[i + 2]];
      if (
        ids.some(
          (id) =>
            topAt(p.getX(id), p.getZ(id)) -
              native.heightAt(p.getX(id), p.getZ(id)) >
            0.001,
        )
      )
        assert.ok(
          drawn.has(ids.join("/")),
          "Every genuinely raised support or transition face remains",
        );
    }
    for (let x = -321; x <= -299; x += 1.25)
      for (let z = -1589; z <= -1571; z += 1.25)
        assert.equal(rock.topAt(x, z), control.topAt(x, z));
    assert.equal(parent.children.length, 1);
  } finally {
    rock?.dispose();
    control?.dispose();
    native.dispose();
  }
});

test("Independent treasure rock and fully bearing rock keep every original render triangle", () => {
  const native = nativeFloor();
  let independent, bearing;
  try {
    const options = {
      center: new T.Vector3(-310, 0, -1580),
      rx: 8,
      rz: 7,
      heightAt: native.heightAt,
      topAt: (x, z) => native.heightAt(x, z) + 3,
      fitted: true,
      id: "bearing",
    };
    independent = createTitanRestingRock(new T.Group(), options);
    bearing = createTitanRestingRock(new T.Group(), {
      ...options,
      ceilingAt: (x, z) => native.heightAt(x, z) + 6,
    });
    assert.ok(bearing.sourceGeometry);
    assert.equal(bearing.mesh.geometry, bearing.sourceGeometry);
    assert.equal(bearing.renderCull.removedTopTriangles, 0);
    assert.equal(bearing.renderCull.removedSkirtTriangles, 0);
    assert.equal(
      digest(bearing.sourceGeometry.index.array),
      digest(independent.mesh.geometry.index.array),
    );
    assert.equal(
      contactsDigest(bearing.contacts),
      contactsDigest(independent.contacts),
    );
  } finally {
    bearing?.dispose();
    independent?.dispose();
    native.dispose();
  }
});

test("Whole paw rock trims native-floor skin with unchanged physical geometry and the accepted refined contacts", () => {
  const native = nativeFloor(),
    parent = new T.Group(),
    near = new T.Mesh(new T.BufferGeometry(), new T.MeshBasicMaterial()),
    pose = new T.Group();
  let rock;
  near.geometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(
      [
        -500, -610, -1740, -100, -610, -1740, -500, -610, -1440, -100, -610,
        -1440,
      ],
      3,
    ),
  );
  near.geometry.setIndex([0, 2, 1, 1, 2, 3]);
  pose.position.set(-290, -586.2378161544028, -1590);
  pose.rotation.y = -Math.PI / 2;
  pose.scale.setScalar(280);
  pose.updateMatrixWorld(true);
  try {
    rock = createBermudaTitanPawRock(parent, {
      near,
      pose,
      setPose() {},
      heightAt: native.heightAt,
    });
    const g = rock.sourceGeometry ?? rock.mesh.geometry;
    const baseline = {
      positions: digest(g.attributes.position.array),
      normals: digest(g.attributes.normal.array),
      index: digest(g.index.array),
      contacts: contactsDigest(rock.contacts),
      vertices: g.attributes.position.count,
      sourceIndices: g.index.count,
      contactCount: rock.contacts.length,
    };
    console.log("paw-physical-baseline", JSON.stringify(baseline));
    console.log("paw-render-cull", JSON.stringify(rock.renderCull));
    checkRenderOnly(rock);
    assert.deepEqual(baseline, PAW_BASELINE);
    const sourceMesh = new T.Mesh(g, rock.mesh.material);
    sourceMesh.userData.terrainContact = true;
    const physical = createTerrainSurface(sourceMesh, {
      fallback: native.heightAt,
    });
    try {
      for (let x = -465; x < -130; x += 17.25)
        for (let z = -1685; z < -1490; z += 13.75) {
          assert.equal(rock.topAt(x, z), physical(x, z));
          assert.equal(
            rock.floorSurface(x, z),
            Math.max(native.heightAt(x, z), physical(x, z)),
          );
          for (const r of [0, 2, 3.9])
            assert.equal(
              rock.floorSurface.supportHeight(x, z, r),
              Math.max(
                native.heightAt.supportHeight(x, z, r),
                physical.supportHeight(x, z, r),
              ),
            );
        }
    } finally {
      physical.dispose();
    }
    assert.deepEqual(parent.children, [rock.mesh]);
    const sourcePosition = rock.sourceGeometry.attributes.position;
    assert.equal(rock.mesh.geometry.attributes.position, sourcePosition);
    rock.dispose();
    rock.dispose();
    assert.equal(parent.children.length, 0);
    assert.equal(rock.floorSurface.stats.disposed, true);
  } finally {
    rock?.dispose();
    native.dispose();
    near.geometry.dispose();
    near.material.dispose();
  }
});
const PAW_BASELINE = {
  positions: "6c12d1167e67ad3a54100129d39b7c5d81074358585fad28dd2997d12ee0ff1e",
  normals: "780e5c63b453487de097034fcca18bae538a165294c39b84255a6a46aa43d4c7",
  index: "c8b4551c97e2a8a3a0f8c3e51a3f2db9ec6b507c2fd19ea6899510fd7884a565",
  contacts: "e6439cbe2c7d3e93e817debe757029dae42bcdf68e9865fa92c0d29fec162b89",
  vertices: 11102,
  sourceIndices: 66600,
  contactCount: 17504,
};
