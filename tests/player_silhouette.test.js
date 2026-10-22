import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import {
  createSilhouetteProxyPool,
  silhouetteCandidates,
} from "../src/player_silhouette.js";

test("all four silhouette skins follow actual animated vertices without owning or editing the source", () => {
  const material = new THREE.MeshBasicMaterial();
  const pool = createSilhouetteProxyPool(() => material);
  for (const kind of ["orca", "squid", "zombie_shark", "mechanical_shark"]) {
    const root = createCreature(kind, 12);
    root.position.set(14, -24, -18);
    root.rotation.set(0.3, 1.1, -0.2);
    let geometryDisposals = 0;
    root.traverse((o) => {
      o.geometry?.addEventListener("dispose", () => geometryDisposals++);
    });
    for (let i = 0; i < 24; i++) {
      root.userData.animate(i / 12, i < 12 ? 0.8 : 2.4);
      root.updateMatrixWorld(true);
      root.traverse((o) => o.skeleton?.update());
      const sourceMeshes = [];
      root.traverseVisible((o) => {
        if (o.isMesh && !o.userData.noShadow && !o.material.transparent)
          sourceMeshes.push(o);
      });
      const scene = pool.populate([root]);
      scene.updateMatrixWorld(true);
      assert.equal(scene.children.length, sourceMeshes.length, kind);
      for (let j = 0; j < scene.children.length; j++) {
        const proxy = scene.children[j],
          source = sourceMeshes[j];
        assert.equal(proxy.geometry, source.geometry);
        assert.equal(proxy.skeleton, source.skeleton);
        assert.equal(proxy.morphTargetInfluences, source.morphTargetInfluences);
        assert.deepEqual(
          proxy.matrixWorld.elements,
          source.matrixWorld.elements,
        );
        assert.notEqual(source.material, material);
        for (const m of Array.isArray(source.material)
          ? source.material
          : [source.material])
          assert.equal(m.opacity, 1);
        for (const index of [0, 5, 150]) {
          if (index >= source.geometry.attributes.position.count) continue;
          const actual = source
              .getVertexPosition(index, new THREE.Vector3())
              .applyMatrix4(source.matrixWorld),
            outlined = proxy
              .getVertexPosition(index, new THREE.Vector3())
              .applyMatrix4(proxy.matrixWorld);
          assert.ok(actual.distanceTo(outlined) < 1e-6, kind);
        }
      }
    }
    pool.populate([]);
    assert.equal(geometryDisposals, 0);
    root.userData.disposeLocalMotion?.();
  }
  pool.dispose();
  material.dispose();
});

test("proxy visibility respects hidden attachments and transparent effects", () => {
  const root = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial(),
  );
  const hidden = body.clone();
  hidden.visible = false;
  const effect = body.clone();
  effect.material = new THREE.MeshBasicMaterial({ transparent: true });
  root.add(body, hidden, effect);
  root.updateMatrixWorld(true);
  const mat = new THREE.MeshBasicMaterial();
  const pool = createSilhouetteProxyPool(() => mat);
  assert.equal(pool.populate([root]).children.length, 1);
  body.visible = false;
  assert.equal(pool.populate([root]).children.length, 0);
  pool.dispose();
  assert.equal(root.children.length, 3);
  body.geometry.dispose();
  body.material.dispose();
  effect.material.dispose();
  mat.dispose();
});

test("bounded near-camera candidate selection ignores dead, hidden and remote creatures", () => {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 2, 10);
  const avatar = new THREE.Group();
  avatar.scale.setScalar(6);
  const make = (x, y, z, length = 20) => {
    const mesh = new THREE.Group();
    mesh.position.set(x, y, z);
    mesh.userData.length = length;
    return { mesh, alive: true };
  };
  const near = make(0, 0, 5),
    side = make(80, 0, 5),
    distant = make(0, 0, -200),
    hidden = make(0, 0, 5),
    dead = make(0, 0, 5),
    small = make(0, 0, 5, 2);
  hidden.mesh.visible = false;
  dead.alive = false;
  const entities = [near, side, distant, hidden, dead, small];
  const result = [];
  assert.deepEqual(silhouetteCandidates(camera, avatar, entities, [], result), [
    near.mesh,
  ]);
  assert.equal(entities[0], near);
  assert.deepEqual(camera.position.toArray(), [0, 2, 10]);
  assert.deepEqual(avatar.position.toArray(), [0, 0, 0]);
  const many = Array.from({ length: 12 }, (_, i) => make(0, 0, i));
  assert.equal(
    silhouetteCandidates(camera, avatar, many, [], result).length,
    4,
  );
});
