import * as THREE from "three";
import packed from "./assets/models/bermuda_titan_head_hf_mesh.json" with { type: "json" };
import cradleCache from "./assets/models/bermuda_titan_cradle_contacts.json" with { type: "json" };
import { decodePackedArray } from "./packed_array.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

const smooth = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
/** HF交臂在交接处是连体表面；仅共同松臂，肩部权重平滑归零。 */
export function titanFrontWeights(x, y, z) {
  const brace = smooth(-0.04, -0.12, y) * (1 - smooth(-0.18, 0.06, z));
  const head =
    (1 - brace) *
    smooth(-0.075, -0.03, y) *
    (1 - smooth(-0.1, 0.16, z)) *
    (1 - smooth(0.18, 0.3, Math.abs(x)));
  return [1 - brace - head, brace, head];
}
// 双肩独立转动，交叉前臂接缝使用连续权重；头部仍固定在原有索引2。
export const TITAN_ARM_RIG = Object.freeze({
  leftPivot: Object.freeze([-0.3, -0.06, 0.02]),
  rightPivot: Object.freeze([0.3, -0.06, 0.02]),
  pitch: 0.06,
  yaw: 0.12,
  rightYaw: -0.12,
  openPitch: 0,
  openYaw: 0.22,
  openRightYaw: -0.02,
  maximumMotion: 0.22,
  maximumArmMotion: 0.125,
});
// 吸气时整个前胸、下颌和掌共同抬起；只沿前后渐变，避免窄Y权重带受压反折。
export const TITAN_BREATH_LIFT = Object.freeze({
  height: 10.1 / 120,
  frontZ: -0.1,
  rearZ: 0.2,
});
export function titanFrontBreathLift(z, guard) {
  return (
    (1 - guard) *
    TITAN_BREATH_LIFT.height *
    (1 - smooth(TITAN_BREATH_LIFT.frontZ, TITAN_BREATH_LIFT.rearZ, z))
  );
}
export function titanFrontBreathSlope(z, guard) {
  const u = THREE.MathUtils.clamp(
    (z - TITAN_BREATH_LIFT.frontZ) /
      (TITAN_BREATH_LIFT.rearZ - TITAN_BREATH_LIFT.frontZ),
    0,
    1,
  );
  return (
    (-(1 - guard) * TITAN_BREATH_LIFT.height * 6 * u * (1 - u)) /
    (TITAN_BREATH_LIFT.rearZ - TITAN_BREATH_LIFT.frontZ)
  );
}
export const titanArmPose = (guard) => ({
  pitch: THREE.MathUtils.lerp(
    TITAN_ARM_RIG.openPitch,
    TITAN_ARM_RIG.pitch,
    guard,
  ),
  yaw: THREE.MathUtils.lerp(TITAN_ARM_RIG.openYaw, TITAN_ARM_RIG.yaw, guard),
  rightYaw: THREE.MathUtils.lerp(
    TITAN_ARM_RIG.openRightYaw,
    TITAN_ARM_RIG.rightYaw,
    guard,
  ),
});
export function titanEmbraceWeights(x, y, z) {
  const [fixed, arm, head] = titanFrontWeights(x, y, z),
    right = smooth(-0.08, 0.08, x);
  return [fixed, arm * (1 - right), head, arm * right];
}
const contacts = Object.freeze(
  packed.contacts.map((c, index) =>
    Object.freeze({
      ...c,
      index,
      center: Object.freeze([...c.center]),
      half: Object.freeze([...c.half]),
      quaternion: Object.freeze([...c.quaternion]),
    }),
  ),
);

// 离线缓存保留原HF体积与外部，怀中真实水袋用现有精确球连续碰撞覆盖真实子三角。
// 原face与重心参数去重打包；Float64参数及本来就是Float32的原顶点均无精度变化。
function decodeCradleContacts(cache) {
  if (cache.sourceMeshSha256 !== packed.sourceSha256)
    throw Error("Titan cradle contacts require their matching HF source");
  const base = decodePackedArray(cache.baseFloat64, Float64Array),
    faceData = decodePackedArray(cache.facesFloat32, Float32Array),
    patternData = decodePackedArray(cache.patternsFloat64, Float64Array),
    faceSources = decodePackedArray(cache.faceSourcesUint16, Uint16Array),
    faceIds = decodePackedArray(cache.tileFacesUint16, Uint16Array),
    patternIds = decodePackedArray(cache.tilePatternsUint16, Uint16Array),
    identity = Object.freeze([0, 0, 0, 1]),
    points = (data, offset) =>
      Object.freeze(
        Array.from({ length: 3 }, (_, i) =>
          Object.freeze(
            Array.from(data.subarray(offset + i * 3, offset + i * 3 + 3)),
          ),
        ),
      ),
    faces = Array.from({ length: cache.faceCount }, (_, i) =>
      points(faceData, i * 9),
    ),
    patterns = Array.from({ length: cache.patternCount }, (_, i) =>
      points(patternData, i * 9),
    ),
    contacts = Object.freeze(
      Array.from({ length: cache.baseCount }, (_, i) =>
        Object.freeze({
          type: "box",
          index: i,
          center: Object.freeze(Array.from(base.subarray(i * 6, i * 6 + 3))),
          half: Object.freeze(Array.from(base.subarray(i * 6 + 3, i * 6 + 6))),
          quaternion: identity,
        }),
      ),
    ),
    tiles = Object.freeze(
      Array.from({ length: cache.tileCount }, (_, i) =>
        Object.freeze({
          sourceFace: faceSources[faceIds[i]],
          faceVertices: faces[faceIds[i]],
          barycentric: patterns[patternIds[i]],
          padding: cache.padding,
        }),
      ),
    );
  return {
    contacts,
    tiles,
    metadata: Object.freeze({
      originalCount: packed.contacts.length,
      refinedCount: contacts.length,
      surfacePatches: tiles.length,
      faceCount: faces.length,
      padding: cache.padding,
      sourcePackedMeshSha256: cache.sourcePackedMeshSha256,
      roiMin: cache.roiMin,
      roiMax: cache.roiMax,
    }),
  };
}
const cradleRefinement = decodeCradleContacts(cradleCache);
export const TITAN_CRADLE_CONTACT_REFINEMENT = cradleRefinement.metadata;
let cached;
export const TITAN_HEAD_POSE_LIMITS = Object.freeze({
  maxYaw: 0.035,
  minimumPitch: -0.035,
  awarenessPitch: 0.045,
  awarenessLift: 0.008,
});

/** 只细分会在骨权曲率下反折的长瘦面；同位置共享边同步细分，避免UV接缝裂开。 */
function conditionSkin(geometry, farIndex) {
  const fields = Object.fromEntries(
    Object.entries(geometry.attributes).map(([name, a]) => [
      name,
      { source: a, values: Array.from(a.array) },
    ]),
  );
  const positions = fields.position.values,
    variants = [];
  const vector = new THREE.Vector3(),
    delta = new THREE.Vector3(),
    pivot = new THREE.Vector3(0, 0.01, -0.08);
  // 六种头部极值只配护臂端点，另保留原护臂中间态，共30组，四元数预先计算。
  const leans = [
    [0, 0],
    [0, -0.035],
    [-0.035, 0],
    [0.035, 0],
    [-0.035, -0.035],
    [0.035, -0.035],
  ];
  function addVariant(guard, aware, yaw, pitch) {
    const armPose = titanArmPose(guard);
    variants.push({
      guard,
      aware,
      yaw,
      pitch,
      rotation: new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          pitch + aware * TITAN_HEAD_POSE_LIMITS.awarenessPitch,
          yaw,
          0,
          "YXZ",
        ),
      ),
      armRotations: [armPose.yaw, armPose.rightYaw].map((armYaw) =>
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(armPose.pitch, armYaw, 0, "YXZ"),
        ),
      ),
      values: [],
    });
  }
  for (const guard of [0, 1])
    for (const aware of [0, 1])
      for (const [yaw, pitch] of leans) addVariant(guard, aware, yaw, pitch);
  for (const guard of [0.25, 0.5, 0.75])
    for (const aware of [0, 1]) addVariant(guard, aware, 0, 0);
  function poseVertex(id) {
    const p = new THREE.Vector3().fromArray(positions, id * 3),
      weights = titanEmbraceWeights(p.x, p.y, p.z);
    for (const v of variants) {
      vector.copy(p);
      for (const [index, sign] of [
        [1, -1],
        [3, 1],
      ]) {
        const armPivot = new THREE.Vector3(sign * 0.3, -0.06, 0.02),
          rotation = v.armRotations[sign === -1 ? 0 : 1];
        delta
          .copy(p)
          .sub(armPivot)
          .applyQuaternion(rotation)
          .add(armPivot)
          .sub(p);
        vector.addScaledVector(delta, weights[index]);
      }
      if ((v.aware || v.yaw || v.pitch) && weights[2]) {
        delta.copy(p).sub(pivot).applyQuaternion(v.rotation).add(pivot);
        delta.y += v.aware * TITAN_HEAD_POSE_LIMITS.awarenessLift;
        delta.sub(p);
        vector.addScaledVector(delta, weights[2]);
      }
      vector.y += titanFrontBreathLift(vector.z, v.guard);
      vector.toArray(v.values, id * 3);
    }
  }
  for (let i = 0; i < positions.length / 3; i++) poseVertex(i);
  const cross = (array, a, b, c) => {
    const ax = array[b * 3] - array[a * 3],
      ay = array[b * 3 + 1] - array[a * 3 + 1],
      az = array[b * 3 + 2] - array[a * 3 + 2],
      bx = array[c * 3] - array[a * 3],
      by = array[c * 3 + 1] - array[a * 3 + 1],
      bz = array[c * 3 + 2] - array[a * 3 + 2];
    return [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
  };
  const bad = (a, b, c) => {
    const n = cross(positions, a, b, c),
      area = Math.hypot(...n);
    if (area < 2e-8) return false;
    return variants.some((v) => {
      const p = cross(v.values, a, b, c);
      return (
        n[0] * p[0] + n[1] * p[1] + n[2] * p[2] <= 0 ||
        Math.hypot(...p) < area * 0.2
      );
    });
  };
  const pointKey = (id) =>
      positions
        .slice(id * 3, id * 3 + 3)
        .map((v) => Math.round(v * 1e8))
        .join(","),
    edgeKey = (a, b) => {
      const ka = pointKey(a),
        kb = pointKey(b);
      return ka < kb ? ka + "/" + kb : kb + "/" + ka;
    };
  const midpointCache = new Map();
  function midpoint(a, b) {
    const key = a < b ? a + "/" + b : b + "/" + a;
    if (midpointCache.has(key)) return midpointCache.get(key);
    const id = positions.length / 3;
    if (id >= 65535)
      throw Error("Titan rig conditioning exceeds UInt16 budget");
    for (const [name, { source, values }] of Object.entries(fields)) {
      if (name === "skinIndex") values.push(0, 1, 2, 3);
      else if (name === "skinWeight") values.push(0, 0, 0, 0);
      else
        for (let k = 0; k < source.itemSize; k++)
          values.push(
            (values[a * source.itemSize + k] +
              values[b * source.itemSize + k]) /
              2,
          );
    }
    const p = new THREE.Vector3().fromArray(positions, id * 3),
      w = titanEmbraceWeights(p.x, p.y, p.z);
    fields.skinWeight.values.splice(id * 4, 4, w[0], w[1], w[2], w[3]);
    const normal = fields.normal.values;
    vector
      .fromArray(normal, id * 3)
      .normalize()
      .multiplyScalar(32767)
      .toArray(normal, id * 3);
    poseVertex(id);
    midpointCache.set(key, id);
    return id;
  }
  let near = Array.from(geometry.index.array),
    far = Array.from(farIndex),
    iterations = 0;
  for (; iterations < 16; iterations++) {
    const marked = new Set();
    for (const indices of [near, far])
      for (let i = 0; i < indices.length; i += 3) {
        const ids = indices.slice(i, i + 3);
        if (!bad(...ids)) continue;
        let edge = 0,
          longest = -1;
        for (let k = 0; k < 3; k++) {
          const a = ids[k],
            b = ids[(k + 1) % 3],
            d =
              (positions[a * 3] - positions[b * 3]) ** 2 +
              (positions[a * 3 + 1] - positions[b * 3 + 1]) ** 2 +
              (positions[a * 3 + 2] - positions[b * 3 + 2]) ** 2;
          if (d > longest) {
            longest = d;
            edge = k;
          }
        }
        marked.add(edgeKey(ids[edge], ids[(edge + 1) % 3]));
      }
    if (!marked.size) break;
    function split(a, b, c, out) {
      for (const [x, y, z] of [
        [a, b, c],
        [b, c, a],
        [c, a, b],
      ])
        if (marked.has(edgeKey(x, y))) {
          const m = midpoint(x, y);
          split(x, m, z, out);
          split(m, y, z, out);
          return;
        }
      out.push(a, b, c);
    }
    const refine = (indices) => {
      const out = [];
      for (let i = 0; i < indices.length; i += 3)
        split(indices[i], indices[i + 1], indices[i + 2], out);
      return out;
    };
    near = refine(near);
    far = refine(far);
  }
  if (iterations === 16)
    throw Error("Titan skin conditioning did not converge");
  for (const [name, { source, values }] of Object.entries(fields))
    geometry.setAttribute(
      name,
      new THREE.BufferAttribute(
        new source.array.constructor(values),
        source.itemSize,
        source.normalized,
      ),
    );
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(near), 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.rigConditioning = {
    variants: variants.length,
    iterations,
    addedVertices: positions.length / 3 - packed.vertices,
    nearTriangles: near.length / 3,
    farTriangles: far.length / 3,
  };
  return new Uint16Array(far);
}

/** 原始PBR/近远实体/骨权只解码一次；实例保留各自姿态与发光参数。 */
export function acquireBermudaTitanHeadAsset() {
  if (!cached) {
    const geometry = decodeOrganicMesh(
      packed,
      (x, y, z, ids, weights, offset) => {
        const w = titanEmbraceWeights(x, y, z);
        ids.set([0, 1, 2, 3], offset);
        weights.set([w[0], w[1], w[2], w[3]], offset);
      },
      (_x, _y, _z, c) => c.set(0x627579),
    );
    const farIndex = conditionSkin(
      geometry,
      decodePackedArray(packed.farIndex, Uint16Array),
    );
    const farGeometry = new THREE.BufferGeometry();
    for (const name of [
      "position",
      "normal",
      "color",
      "skinIndex",
      "skinWeight",
    ])
      farGeometry.setAttribute(name, geometry.getAttribute(name));
    farGeometry.setIndex(new THREE.BufferAttribute(farIndex, 1));
    farGeometry.boundingBox = geometry.boundingBox.clone();
    farGeometry.boundingSphere = geometry.boundingSphere.clone();
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    material.name = "bermuda_titan_head_hf_original_pbr";
    material.userData.sourceSha256 = packed.sourceSha256;
    const farMaterial = material.clone();
    farMaterial.name = "bermuda_titan_head_hf_distant_vertex_color";
    const asset = {
      geometry,
      farGeometry,
      material,
      farMaterial,
      references: 0,
    };
    asset.prepare = createMaterialPreparation(
      [
        {
          name: "original_color",
          url: new URL(
            "./assets/models/bermuda_titan_head_hf_color.webp",
            import.meta.url,
          ),
          colorSpace: THREE.SRGBColorSpace,
          apply(texture) {
            material.map = texture;
            material.color.fromArray(packed.pbr.baseColor);
            material.vertexColors = false;
            material.needsUpdate = true;
          },
        },
        {
          name: "original_physical",
          url: new URL(
            "./assets/models/bermuda_titan_head_hf_metallic_roughness.webp",
            import.meta.url,
          ),
          colorSpace: THREE.NoColorSpace,
          apply(texture) {
            material.roughnessMap = material.metalnessMap = texture;
            material.roughness = packed.pbr.roughness;
            material.metalness = packed.pbr.metalness;
            material.needsUpdate = true;
          },
        },
      ],
      (ready) => {
        material.userData.texturesReady = ready;
      },
    );
    cached = asset;
  }
  const asset = cached;
  asset.references++;
  let released = false;
  return {
    ...asset,
    contacts,
    restContacts: contacts,
    cradleContacts: cradleRefinement.contacts,
    cradleSurfaceTiles: cradleRefinement.tiles,
    cradleContactRefinement: cradleRefinement.metadata,
    metadata: packed,
    release() {
      if (released) return;
      released = true;
      if (--asset.references) return;
      asset.prepare.dispose();
      asset.geometry.dispose();
      asset.farGeometry.dispose();
      asset.material.dispose();
      asset.farMaterial.dispose();
      if (cached === asset) cached = undefined;
    },
  };
}
