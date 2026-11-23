import * as THREE from "three";
import {
  acquireBermudaTitanWholeAsset,
  TITAN_WHOLE_WRIST_PIVOT,
  TITAN_WHOLE_WRIST_PITCH,
  TITAN_WHOLE_MAX_MOTION,
} from "./bermuda_titan_whole_asset.js";
import { createStaticColliderGrid } from "./static_collider_grid.js";

// 真实三角片的最小包围球，圆钝/锐角分支都完整包含同一张可见皮肤。
function enclosingSphere(points, padding, scratch) {
  const u = scratch.u.copy(points[1]).sub(points[0]),
    v = scratch.v.copy(points[2]).sub(points[0]),
    n = scratch.n.crossVectors(u, v),
    edges = scratch.edges;
  edges[0] = u.lengthSq();
  edges[1] = v.lengthSq();
  edges[2] = points[1].distanceToSquared(points[2]);
  const longest = edges.indexOf(Math.max(...edges)),
    first = longest === 2 ? 1 : 0,
    second = longest === 0 ? 1 : 2,
    center = scratch.center
      .copy(points[first])
      .add(points[second])
      .multiplyScalar(0.5);
  if (
    edges.reduce((a, b) => a + b, 0) > 2 * edges[longest] + 1e-16 &&
    n.lengthSq() > 1e-20
  ) {
    center.copy(points[0]);
    center.addScaledVector(
      scratch.crossA.crossVectors(v, n),
      edges[0] / (2 * n.lengthSq()),
    );
    center.addScaledVector(
      scratch.crossB.crossVectors(n, u),
      edges[1] / (2 * n.lengthSq()),
    );
  }
  return (
    Math.max(
      points[0].distanceTo(center),
      points[1].distanceTo(center),
      points[2].distanceTo(center),
    ) + padding
  );
}

/** 单一原HF整身；仅原负X真前足绕真实腕根卸重，不再拼接bust或抬整块前躯。 */
export function createBermudaTitanWhole(
  parent,
  {
    width = 280,
    position = null,
    rotation = null,
    contactCache,
    inspectionOnly = false,
  } = {},
) {
  if (!(width > 0)) throw Error("The whole titan requires a positive width");
  if (!contactCache && !inspectionOnly)
    throw Error("The whole titan requires its verified derived contact cache");
  const asset = acquireBermudaTitanWholeAsset(),
    root = new THREE.Group(),
    fixed = new THREE.Bone(),
    paw = new THREE.Bone(),
    nearMaterial = asset.material.clone(),
    farMaterial = asset.farMaterial.clone(),
    awarenessUniform = { value: 0 },
    chargeUniform = { value: 0 },
    near = new THREE.SkinnedMesh(asset.geometry, nearMaterial),
    far = new THREE.SkinnedMesh(asset.farGeometry, farMaterial);
  root.name = "bermuda_original_whole_sleeping_titan";
  root.scale.setScalar(width);
  if (position) root.position.copy(position);
  if (rotation) root.quaternion.copy(rotation);
  parent.add(root);
  fixed.name = "titan_fixed_head_neck_trunk_and_three_feet";
  paw.name = "titan_true_front_wrist";
  paw.position.fromArray(TITAN_WHOLE_WRIST_PIVOT);
  fixed.add(paw);
  near.add(fixed);
  root.add(near, far);
  far.visible = false;
  near.name = "bermuda_whole_hf_near";
  far.name = "bermuda_whole_hf_far";
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton([fixed, paw]);
  near.bind(skeleton);
  far.bind(skeleton, near.bindMatrix.clone());
  for (const mesh of [near, far]) {
    mesh.boundingBox = mesh.geometry.boundingBox
      .clone()
      .expandByScalar(TITAN_WHOLE_MAX_MOTION);
    mesh.boundingSphere = mesh.geometry.boundingSphere.clone();
    mesh.boundingSphere.radius += TITAN_WHOLE_MAX_MOTION;
  }
  for (const material of [nearMaterial, farMaterial]) {
    material.emissive.set(0xff5b0b);
    material.onBeforeCompile = (shader) => {
      shader.uniforms.titanAwareness = awarenessUniform;
      shader.uniforms.titanCharge = chargeUniform;
      shader.vertexShader =
        "attribute float titanAwakeMask; attribute float titanMouthMask; varying vec2 titanResponse;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\ntitanResponse=vec2(titanAwakeMask,titanMouthMask);",
        );
      shader.fragmentShader =
        "uniform float titanAwareness; uniform float titanCharge; varying vec2 titanResponse;\n" +
        shader.fragmentShader.replace(
          "#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\ntotalEmissiveRadiance*=titanResponse.x*titanAwareness*.38+titanResponse.y*titanCharge*.65;",
        );
    };
    material.customProgramCacheKey = () =>
      "bermuda_whole_original_pbr_awareness_v1";
  }
  let disposed = false,
    guard = 1,
    version = 0;
  const posedFaces = new Map(),
    posed = new Map(),
    faceRows = [],
    patchRows = [],
    staticContacts = [],
    dynamicRestContacts = [];
  // 每个实例只复用临时算术量；缓存接触和父面顶点始终保持独立不可变快照。
  const contactScratch = {
    points: Array.from({ length: 3 }, () => new THREE.Vector3()),
    u: new THREE.Vector3(),
    v: new THREE.Vector3(),
    n: new THREE.Vector3(),
    center: new THREE.Vector3(),
    crossA: new THREE.Vector3(),
    crossB: new THREE.Vector3(),
    edges: [0, 0, 0],
  };
  // 缓存schema在构造时校核，不容许把旧bust或旧顶点序号当成新整身。
  if (contactCache) {
    if (contactCache.indexSpace !== "compact")
      throw Error(
        "Whole-titan contact indices must explicitly use the verified compact mesh",
      );
    for (const source of contactCache.faces) {
      const ids = source.indices ?? source;
      if (
        ids.length !== 3 ||
        ids.some(
          (i) =>
            !Number.isInteger(i) ||
            i < 0 ||
            i >= asset.geometry.attributes.position.count,
        )
      )
        throw Error("Invalid whole-titan parent face");
      faceRows.push({ ids, moving: ids.some((i) => asset.weights[i] !== 0) });
    }
    for (const [index, source] of contactCache.patches.entries()) {
      const face = source[0],
        bary = source.slice(1);
      if (!faceRows[face] || bary.length !== 9)
        throw Error("Invalid whole-titan surface patch");
      patchRows.push({ index, face, bary, moving: faceRows[face].moving });
    }
  }
  const padding = contactCache?.padding ?? 0.0001;
  // 最大腕位移先包住所有动面顶点和其包围球；远处查询不触发逐姿态29k索引构造。
  const dynamicBounds = new THREE.Box3();
  for (const row of faceRows)
    if (row.moving)
      for (const id of row.ids)
        dynamicBounds.expandByPoint(
          new THREE.Vector3().fromBufferAttribute(
            asset.geometry.attributes.position,
            id,
          ),
        );
  if (!dynamicBounds.isEmpty())
    dynamicBounds.expandByScalar(
      TITAN_WHOLE_MAX_MOTION +
        (contactCache?.header?.limits?.maximumMovingMebRadiusBoundMetres ?? 1) /
          width +
        1e-6,
    );
  function parentPoints(id) {
    const row = faceRows[id],
      key = row.moving ? version : -1,
      old = posedFaces.get(id);
    if (old?.key === key) return old.points;
    const points = row.ids.map((i) =>
      near.getVertexPosition(i, new THREE.Vector3()),
    );
    posedFaces.set(id, { key, points });
    return points;
  }
  function getPosedContact(index) {
    const row = patchRows[index];
    if (!row) return null;
    const key = row.moving ? version : -1,
      old = posed.get(index);
    if (old?.key === key) return old.data;
    const parent = parentPoints(row.face),
      points = contactScratch.points;
    for (let k = 0; k < 3; k++)
      points[k]
        .set(0, 0, 0)
        .addScaledVector(parent[0], row.bary[k * 3])
        .addScaledVector(parent[1], row.bary[k * 3 + 1])
        .addScaledVector(parent[2], row.bary[k * 3 + 2]);
    const radius = enclosingSphere(points, padding, contactScratch),
      data = {
        type: "sphere",
        id: `sleeping_titan_whole_${index}`,
        index,
        x: contactScratch.center.x,
        y: contactScratch.center.y,
        z: contactScratch.center.z,
        radius,
        titanGuardArm: row.moving,
        dynamic: row.moving,
      };
    posed.set(index, { key, data });
    return data;
  }
  function syncPlacement() {
    root.updateMatrixWorld(true);
    skeleton.update();
    posedFaces.clear();
    posed.clear();
    staticContacts.length = 0;
    dynamicRestContacts.length = 0;
    for (const row of patchRows)
      (row.moving ? dynamicRestContacts : staticContacts).push(
        getPosedContact(row.index),
      );
    reference = null;
  }
  function setGuard(value) {
    const next = THREE.MathUtils.clamp(value, 0, 1);
    if (guard === next) return;
    guard = next;
    paw.rotation.x = TITAN_WHOLE_WRIST_PITCH * (1 - guard);
    version++;
    root.updateMatrixWorld(true);
    skeleton.update();
  }
  let reference = null;
  const pivot = new THREE.Vector3(...TITAN_WHOLE_WRIST_PIVOT);
  let weightedRadius = 0;
  for (let i = 0; i < asset.weights.length; i++)
    if (asset.weights[i])
      weightedRadius = Math.max(
        weightedRadius,
        asset.weights[i] *
          new THREE.Vector3()
            .fromBufferAttribute(asset.geometry.attributes.position, i)
            .distanceTo(pivot),
      );
  syncPlacement();
  function queryDynamicContacts(
    start,
    end = start,
    { radius = 0, padding: queryPadding = 0, segment = false } = {},
  ) {
    if (disposed || !dynamicRestContacts.length) return [];
    const broadMargin = queryPadding + Math.sqrt(3) * radius + 1e-7;
    if (
      Math.max(start.x, end.x) + broadMargin < dynamicBounds.min.x ||
      Math.min(start.x, end.x) - broadMargin > dynamicBounds.max.x ||
      Math.max(start.z, end.z) + broadMargin < dynamicBounds.min.z ||
      Math.min(start.z, end.z) - broadMargin > dynamicBounds.max.z ||
      (Number.isFinite(start.y) &&
        Number.isFinite(end.y) &&
        (Math.max(start.y, end.y) + broadMargin < dynamicBounds.min.y ||
          Math.min(start.y, end.y) - broadMargin > dynamicBounds.max.y))
    )
      return [];
    let delta = reference
      ? 2 *
        Math.sin(
          (Math.abs(guard - reference.guard) * TITAN_WHOLE_WRIST_PITCH) / 2,
        ) *
        weightedRadius
      : Infinity;
    if (!reference || delta > 0.006) {
      const contacts = dynamicRestContacts.map((c) => getPosedContact(c.index));
      let maxRadius = 0;
      for (const c of contacts) maxRadius = Math.max(maxRadius, c.radius);
      reference = {
        guard,
        contacts,
        maxRadius,
        grid: createStaticColliderGrid(contacts, { cellSize: 0.02 }),
      };
      delta = 0;
    }
    if (delta) delta += 1e-6;
    const extra = Math.min(
        reference.maxRadius + 2 * delta,
        delta + 2 * Math.sqrt(delta * (reference.maxRadius + delta)),
      ),
      margin = queryPadding + Math.sqrt(3) * radius + 1e-7,
      useY = Number.isFinite(start.y) && Number.isFinite(end.y),
      bounds = {
        minX: Math.min(start.x, end.x) - margin,
        maxX: Math.max(start.x, end.x) + margin,
        minY: useY ? Math.min(start.y, end.y) - margin : -Infinity,
        maxY: useY ? Math.max(start.y, end.y) + margin : Infinity,
        minZ: Math.min(start.z, end.z) - margin,
        maxZ: Math.max(start.z, end.z) + margin,
      },
      dx = end.x - start.x,
      dy = end.y - start.y,
      dz = end.z - start.z,
      lengthSq = dx * dx + dy * dy + dz * dz,
      candidates = reference.grid.query(start, end, {
        radius,
        padding: queryPadding + extra + 1e-7,
      }),
      result = [];
    for (const old of candidates) {
      if (segment && useY) {
        const t =
            lengthSq > 0
              ? THREE.MathUtils.clamp(
                  ((old.x - start.x) * dx +
                    (old.y - start.y) * dy +
                    (old.z - start.z) * dz) /
                    lengthSq,
                  0,
                  1,
                )
              : 0,
          reach = old.radius + Math.sqrt(3) * extra + margin;
        if (
          (old.x - start.x - t * dx) ** 2 +
            (old.y - start.y - t * dy) ** 2 +
            (old.z - start.z - t * dz) ** 2 >
          reach * reach
        )
          continue;
      }
      const c = getPosedContact(old.index);
      if (
        c.x + c.radius < bounds.minX ||
        c.x - c.radius > bounds.maxX ||
        c.y + c.radius < bounds.minY ||
        c.y - c.radius > bounds.maxY ||
        c.z + c.radius < bounds.minZ ||
        c.z - c.radius > bounds.maxZ
      )
        continue;
      result.push(c);
    }
    return result;
  }
  // 共用贴图可由在线重试稍后就绪；现有更新循环只在标识变化时同步私有材质。
  function syncMaterialSources() {
    if (disposed) return;
    for (const [material, source] of [
      [nearMaterial, asset.material],
      [farMaterial, asset.farMaterial],
    ]) {
      let changed = false;
      for (const key of [
        "map",
        "roughnessMap",
        "metalnessMap",
        "roughness",
        "metalness",
        "vertexColors",
      ]) {
        if (material[key] !== source[key]) {
          material[key] = source[key];
          changed = true;
        }
      }
      if (!material.color.equals(source.color)) {
        material.color.copy(source.color);
        changed = true;
      }
      if (changed) material.needsUpdate = true;
    }
  }
  const prepare = async (options) => {
    if (disposed) return false;
    const ready = await asset.prepare(options);
    if (disposed) return false;
    syncMaterialSources();
    return ready;
  };
  root.userData.prepareMaterials = prepare;
  return {
    root,
    near,
    far,
    skeleton,
    bones: { fixed, paw },
    asset,
    width,
    staticContacts,
    dynamicRestContacts,
    dynamicBounds,
    get guardAmount() {
      return guard;
    },
    get poseVersion() {
      return version;
    },
    setGuard,
    setAwareness(value) {
      awarenessUniform.value = THREE.MathUtils.clamp(value, 0, 1);
    },
    setCharge(value) {
      chargeUniform.value = THREE.MathUtils.clamp(value, 0, 1);
    },
    setBreathLean() {},
    syncPlacement,
    getPosedContact,
    queryDynamicContacts,
    getMouthPose() {
      root.updateWorldMatrix(true, false);
      return {
        position: asset.mouthLocal.clone().applyMatrix4(root.matrixWorld),
        direction: asset.mouthDirection
          .clone()
          .transformDirection(root.matrixWorld),
        apertureRadius: asset.apertureRadius * width,
      };
    },
    prepare,
    update(_elapsed, { distant = false } = {}) {
      if (disposed) return;
      syncMaterialSources();
      near.visible = !distant;
      far.visible = distant;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      reference = null;
      posed.clear();
      posedFaces.clear();
      staticContacts.length = 0;
      dynamicRestContacts.length = 0;
      root.removeFromParent();
      root.clear();
      skeleton.dispose();
      nearMaterial.dispose();
      farMaterial.dispose();
      asset.release();
    },
  };
}
