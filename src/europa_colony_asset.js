import * as THREE from "three";
import siphon from "./assets/models/europa_siphon_hf_mesh.json" with { type: "json" };
import fan from "./assets/models/europa_fan_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
import { addEuropaColonySurface } from "./europa_environment_geometry.js";
import { decodePackedArray } from "./packed_array.js";

const definitions = {
  siphon: [
    siphon,
    new URL("./assets/models/europa_siphon_hf_color.webp", import.meta.url),
  ],
  fan: [
    fan,
    new URL("./assets/models/europa_fan_hf_color.webp", import.meta.url),
  ],
};
const cache = new Map();
/** Shared geometry/texture with explicit lifetime; each ocean owns its time uniform. */
export function acquireEuropaColony(kind) {
  if (!definitions[kind]) throw Error("Unknown Europa colony");
  if (!cache.has(kind)) {
    const [packed, url] = definitions[kind];
    const geometry = decodeOrganicMesh(packed, null, (_x, _y, _z, c) =>
      c.set(kind === "fan" ? 0x96748f : 0x99a28c),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    if (kind === "siphon") geometry.scale(5, 9, 5);
    else {
      geometry.scale(6.4, 9, 3);
      geometry.rotateY(Math.PI / 2);
    }
    geometry.translate(0, 4.5, 0);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometry.boundingSphere.radius += 0.4;
    const farGeometry = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(geometry.attributes))
      farGeometry.setAttribute(name, attribute);
    farGeometry.setIndex(
      new THREE.BufferAttribute(
        decodePackedArray(packed.lodIndex || packed.index, Uint16Array),
        1,
      ),
    );
    farGeometry.boundingBox = geometry.boundingBox.clone();
    farGeometry.boundingSphere = geometry.boundingSphere.clone();
    const subscribers = new Set();
    let texture;
    const prepare = createMaterialPreparation(
      [
        {
          name: "color",
          url,
          colorSpace: THREE.SRGBColorSpace,
          apply(t) {
            texture = t;
            for (const m of subscribers) {
              m.map = t;
              m.vertexColors = false;
              m.needsUpdate = true;
            }
          },
        },
      ],
      (ready) => {
        for (const m of subscribers) m.userData.texturesReady = ready;
      },
    );
    cache.set(kind, {
      geometry,
      farGeometry,
      prepare,
      subscribers,
      references: 0,
      get texture() {
        return texture;
      },
    });
  }
  const asset = cache.get(kind);
  asset.references++;
  let released = false;
  return {
    geometry: asset.geometry,
    farGeometry: asset.farGeometry,
    prepare: asset.prepare,
    material(time, resources) {
      const m = new THREE.MeshStandardMaterial({
        roughness: kind === "fan" ? 0.8 : 0.87,
        metalness: 0,
        vertexColors: !asset.texture,
        map: asset.texture ?? null,
      });
      m.name = `europa_${kind}_hf_surface`;
      m.userData.texturesReady = !!asset.texture;
      addEuropaColonySurface(m, time, true);
      asset.subscribers.add(m);
      resources.add({
        dispose() {
          asset.subscribers.delete(m);
          m.dispose();
        },
      });
      return m;
    },
    release() {
      if (released) return;
      released = true;
      if (--asset.references) return;
      asset.prepare.dispose();
      asset.geometry.dispose();
      asset.farGeometry.dispose();
      cache.delete(kind);
    },
  };
}

/** Compact near/far instance lists only after meaningful observer movement. */
export function addEuropaColonyLOD(mesh, asset, batches) {
  const far = new THREE.InstancedMesh(
    asset.farGeometry,
    mesh.material,
    mesh.count,
  );
  far.name = mesh.name + "_distant";
  const matrices = mesh.instanceMatrix.array.slice(),
    count = mesh.count;
  far.instanceMatrix.array.set(matrices);
  far.boundingSphere = mesh.boundingSphere.clone();
  far.count = 0;
  mesh.parent.add(far);
  const matrix = new THREE.Matrix4(),
    position = new THREE.Vector3();
  batches.push({ mesh, far, count, matrices, matrix, position });
}

export function updateEuropaColonyLOD(
  batches,
  observer,
  highQuality,
  range = highQuality ? 50 : 34,
) {
  for (const b of batches) {
    let near = 0,
      far = 0;
    for (let i = 0; i < b.count; i++) {
      b.matrix.fromArray(b.matrices, i * 16);
      b.position
        .setFromMatrixPosition(b.matrix)
        .applyMatrix4(b.mesh.matrixWorld);
      // Roots are at seabed/ceiling. Include the entire organism's height.
      const close = b.position.distanceToSquared(observer) < (range + 14) ** 2;
      if (close) b.mesh.setMatrixAt(near++, b.matrix);
      else b.far.setMatrixAt(far++, b.matrix);
    }
    b.mesh.count = near;
    b.far.count = far;
    b.mesh.instanceMatrix.needsUpdate = true;
    b.far.instanceMatrix.needsUpdate = true;
  }
}
