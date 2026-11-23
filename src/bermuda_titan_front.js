import * as THREE from "three";
import {
  acquireBermudaTitanHeadAsset,
  titanFrontWeights,
  titanEmbraceWeights,
  TITAN_ARM_RIG,
  titanArmPose,
  TITAN_HEAD_POSE_LIMITS,
  TITAN_BREATH_LIFT,
  titanFrontBreathLift,
} from "./bermuda_titan_head_asset.js";
import { createStaticColliderGrid } from "./static_collider_grid.js";

export const TITAN_FRONT_HEAD_PIVOT = Object.freeze([0, 0.01, -0.08]);
export const TITAN_FRONT_MOUTH = Object.freeze([0, -0.027, -0.38]);
export const TITAN_FRONT_EYELIDS = Object.freeze([
  Object.freeze(
    [
      [-0.084, 0.067, -0.275956991],
      [-0.075, 0.066, -0.291612722],
      [-0.065, 0.067, -0.299160213],
    ].map(Object.freeze),
  ),
  Object.freeze(
    [
      [0.035, 0.077, -0.295749881],
      [0.047, 0.077, -0.291727332],
      [0.059, 0.078, -0.284968703],
    ].map(Object.freeze),
  ),
]);
// 最终宝心与停靠点由同一真实实体的世界集成验收；本工厂不创建假宝物。
const corners = (c) => {
  const points = [];
  for (const x of [-1, 1])
    for (const y of [-1, 1])
      for (const z of [-1, 1])
        points.push(
          new THREE.Vector3(
            c.center[0] + x * c.half[0],
            c.center[1] + y * c.half[1],
            c.center[2] + z * c.half[2],
          ),
        );
  return points;
};

// 原LBS包围盒的整个体积经Y剪切后的解析外包；切向OBB不把前高后低的胸侧水体包成直墙。
function fitBreathingBox(box, guard) {
  const height = (1 - guard) * TITAN_BREATH_LIFT.height,
    span = box.max.z - box.min.z,
    slope =
      span > 1e-12
        ? (titanFrontBreathLift(box.max.z, guard) -
            titanFrontBreathLift(box.min.z, guard)) /
          span
        : 0,
    rotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      -Math.atan(slope),
    ),
    inverse = rotation.clone().conjugate(),
    fade = TITAN_BREATH_LIFT.rearZ - TITAN_BREATH_LIFT.frontZ,
    root = Math.sqrt(
      Math.max(0, 1 + (4 * slope * fade) / Math.max(1e-30, 6 * height)),
    ),
    zvalues = [
      box.min.z,
      box.max.z,
      TITAN_BREATH_LIFT.frontZ,
      TITAN_BREATH_LIFT.rearZ,
      TITAN_BREATH_LIFT.frontZ + ((1 - root) * fade) / 2,
      TITAN_BREATH_LIFT.frontZ + ((1 + root) * fade) / 2,
    ],
    bounds = new THREE.Box3(),
    point = new THREE.Vector3();
  for (const z of zvalues) {
    if (z < box.min.z || z > box.max.z) continue;
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y]) {
        point
          .set(x, y + titanFrontBreathLift(z, guard), z)
          .applyQuaternion(inverse);
        bounds.expandByPoint(point);
      }
  }
  const center = bounds
      .getCenter(new THREE.Vector3())
      .applyQuaternion(rotation),
    halfSize = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  return { x: center.x, y: center.y, z: center.z, halfSize, rotation };
}

// 单骨格用真实Euler范围的区间运算判断是否恒区，不能用整兽15m界把纯掌格误当渐变。
function rigidBreathZone(c, bone) {
  const half = c.half.map((h) => h + 0.0002),
    mul = (a, b) => [
      Math.min(...a.flatMap((x) => b.map((y) => x * y))),
      Math.max(...a.flatMap((x) => b.map((y) => x * y))),
    ],
    add = (a, b) => [a[0] + b[0], a[1] + b[1]],
    pivot =
      bone === 1
        ? TITAN_ARM_RIG.leftPivot
        : bone === 3
          ? TITAN_ARM_RIG.rightPivot
          : TITAN_FRONT_HEAD_PIVOT;
  let range = [c.center[2] - half[2], c.center[2] + half[2]];
  if (bone !== 0) {
    const pitch = bone === 2 ? [-0.035, 0.045] : [0, 0.06],
      yaw =
        bone === 2
          ? [-0.035, 0.035]
          : bone === 1
            ? [0.12, 0.22]
            : [-0.12, -0.02],
      sin = (a) => [Math.sin(a[0]), Math.sin(a[1])],
      cos = (a) => [
        Math.min(Math.cos(a[0]), Math.cos(a[1])),
        a[0] <= 0 && a[1] >= 0 ? 1 : Math.max(Math.cos(a[0]), Math.cos(a[1])),
      ],
      v = [0, 1, 2].map((a) => [
        c.center[a] - pivot[a] - half[a],
        c.center[a] - pivot[a] + half[a],
      ]),
      sy = sin(yaw);
    range = add(
      mul([-sy[1], -sy[0]], v[0]),
      mul(cos(yaw), add(mul(sin(pitch), v[1]), mul(cos(pitch), v[2]))),
    );
    range = range.map((z) => z + pivot[2]);
  }
  return range[1] + 1e-7 <= TITAN_BREATH_LIFT.frontZ
    ? 1
    : range[0] - 1e-7 >= TITAN_BREATH_LIFT.rearZ
      ? 0
      : -1;
}

// 真实小三角的最小包围球完整覆盖皮肤；现有球体连续碰撞使用精确距离，不产生有限盒子的斜角假墙。
function surfaceTileFitter(deform, facePoints = null) {
  const raw = Array.from({ length: 3 }, () => new THREE.Vector3()),
    posed = Array.from({ length: 3 }, () => new THREE.Vector3()),
    points = Array.from({ length: 3 }, () => new THREE.Vector3()),
    u = new THREE.Vector3(),
    v = new THREE.Vector3(),
    n = new THREE.Vector3(),
    cross = new THREE.Vector3();
  return (tile) => {
    if (facePoints) {
      const face = facePoints(tile);
      for (let i = 0; i < 3; i++) posed[i].copy(face[i]);
    } else
      for (let i = 0; i < 3; i++) {
        raw[i].fromArray(tile.faceVertices[i]);
        deform(raw[i], posed[i]);
      }
    for (let i = 0; i < 3; i++)
      points[i]
        .copy(posed[0])
        .multiplyScalar(tile.barycentric[i][0])
        .addScaledVector(posed[1], tile.barycentric[i][1])
        .addScaledVector(posed[2], tile.barycentric[i][2]);
    u.copy(points[1]).sub(points[0]);
    v.copy(points[2]).sub(points[0]);
    n.crossVectors(u, v);
    const edges = [
        u.lengthSq(),
        v.lengthSq(),
        points[1].distanceToSquared(points[2]),
      ],
      longest = edges.indexOf(Math.max(...edges)),
      pair = longest === 0 ? [0, 1] : longest === 1 ? [0, 2] : [1, 2],
      center = points[pair[0]].clone().add(points[pair[1]]).multiplyScalar(0.5);
    if (
      edges.reduce((sum, e) => sum + e, 0) > 2 * edges[longest] + 1e-16 &&
      n.lengthSq() > 1e-20
    ) {
      center.copy(points[0]);
      cross.crossVectors(v, n).multiplyScalar(edges[0]);
      center.addScaledVector(cross, 1 / (2 * n.lengthSq()));
      cross.crossVectors(n, u).multiplyScalar(edges[1]);
      center.addScaledVector(cross, 1 / (2 * n.lengthSq()));
    }
    return {
      center,
      radius:
        Math.max(...points.map((p) => p.distanceTo(center))) +
        (tile.padding ?? tile.frontPadding ?? 0.0005),
    };
  };
}

/** 原HF双臂分别绕真实肩根转动；左右交接连续蒙皮，不平移整个交臂。 */
export function createBermudaTitanFront(parent, { width = 120 } = {}) {
  if (!(width > 0)) throw Error("Titan front requires a positive width");
  const root = new THREE.Group();
  root.name = "bermuda_crossed_titan_front";
  parent.add(root);
  const asset = acquireBermudaTitanHeadAsset(),
    fixed = new THREE.Bone(),
    brace = new THREE.Bone(),
    rightArm = new THREE.Bone(),
    head = new THREE.Bone();
  fixed.name = "titan_fixed_shoulders";
  brace.name = "titan_left_embracing_forearm";
  rightArm.name = "titan_right_embracing_forearm";
  brace.position.fromArray(TITAN_ARM_RIG.leftPivot);
  rightArm.position.fromArray(TITAN_ARM_RIG.rightPivot);
  head.name = "titan_head_awareness";
  head.position.fromArray(TITAN_FRONT_HEAD_PIVOT);
  root.add(fixed, brace, head, rightArm);
  const nearMaterial = asset.material.clone(),
    farMaterial = asset.farMaterial.clone(),
    awarenessUniform = { value: 0 },
    chargeUniform = { value: 0 },
    timeUniform = { value: 0 },
    guardUniform = { value: 1 };
  for (const material of [nearMaterial, farMaterial]) {
    material.emissive.set(0xff5b0b);
    material.onBeforeCompile = (shader) => {
      shader.uniforms.titanAwareness = awarenessUniform;
      shader.uniforms.titanCharge = chargeUniform;
      shader.uniforms.titanTime = timeUniform;
      shader.uniforms.titanBreathGuard = guardUniform;
      shader.vertexShader =
        `varying vec3 titanRest;
        uniform float titanBreathGuard;
        float titanBreathLift(float z){return (1.0-titanBreathGuard)*${TITAN_BREATH_LIFT.height}*(1.0-smoothstep(-0.1,0.2,z));}
        float titanBreathSlope(float z){float u=clamp((z+0.1)/0.3,0.0,1.0);return -(1.0-titanBreathGuard)*${TITAN_BREATH_LIFT.height}*6.0*u*(1.0-u)/0.3;}
      ` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntitanRest=position;",
      );
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <skinnormal_vertex>",
          `#include <skinnormal_vertex>
        vec3 titanPosedNormalPosition=(skinMatrix*vec4(position,1.0)).xyz;
        float titanLiftSlope=titanBreathSlope(titanPosedNormalPosition.z);
        objectNormal.z-=titanLiftSlope*objectNormal.y;
        #ifdef USE_TANGENT
          objectTangent.y+=titanLiftSlope*objectTangent.z;
        #endif`,
        )
        .replace(
          "#include <skinning_vertex>",
          "#include <skinning_vertex>\ntransformed.y+=titanBreathLift(transformed.z);",
        );
      shader.fragmentShader =
        "varying vec3 titanRest; uniform float titanAwareness; uniform float titanCharge; uniform float titanTime;\nfloat titanLidDistance(vec3 p,vec3 a,vec3 b){vec3 ab=b-a;return length(p-a-ab*clamp(dot(p-a,ab)/dot(ab,ab),0.0,1.0));}\n" +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        // 发光只附着在实际眼缝皮肤与背棘表面，不创建悬浮眼球或光源。
        float ld=min(titanLidDistance(titanRest,vec3(-0.084,0.067,-0.275956991),vec3(-0.075,0.066,-0.291612722)),titanLidDistance(titanRest,vec3(-0.075,0.066,-0.291612722),vec3(-0.065,0.067,-0.299160213)));
        float rd=min(titanLidDistance(titanRest,vec3(0.035,0.077,-0.295749881),vec3(0.047,0.077,-0.291727332)),titanLidDistance(titanRest,vec3(0.047,0.077,-0.291727332),vec3(0.059,0.078,-0.284968703)));
        float eyelid=1.0-smoothstep(0.0018,0.0038,min(ld,rd));
        float dorsal=smoothstep(0.08,0.16,titanRest.y)*(1.0-smoothstep(0.04,0.12,abs(titanRest.x)))*smoothstep(-0.15,0.0,titanRest.z);
        vec3 lidHeat=mix(vec3(1.1,0.34,0.022),vec3(1.65,0.055,0.003),titanAwareness);
        float unrest=0.42+0.13*sin(titanTime*1.9)+0.07*sin(titanTime*3.1+1.7);
        vec3 dorsalHeat=vec3(1.2,0.16,0.007)*(titanCharge*1.35+titanAwareness*unrest);
        totalEmissiveRadiance=eyelid*lidHeat*titanAwareness*1.35+dorsal*dorsalHeat;
        // 原HF色图保持原字节；仅背鳍的运行时冷色反照变为暗暖岩壳，避免残留蓝色蓄光。
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.05,0.57,0.18),dorsal*0.9);
      `,
      );
    };
    material.customProgramCacheKey = () =>
      "bermuda_titan_front_actual_eyelid_warm_breath_shear_v5";
  }
  const skeleton = new THREE.Skeleton([fixed, brace, head, rightArm]),
    near = new THREE.SkinnedMesh(asset.geometry, nearMaterial),
    far = new THREE.SkinnedMesh(asset.farGeometry, farMaterial);
  near.name = "bermuda_titan_head_hf_near";
  far.name = "bermuda_titan_head_hf_far";
  root.add(near, far);
  root.updateMatrixWorld(true);
  near.bind(skeleton);
  far.bind(skeleton);
  for (const mesh of [near, far]) {
    const skinnedVertex = mesh.getVertexPosition.bind(mesh);
    mesh.getVertexPosition = (index, target) => {
      skinnedVertex(index, target);
      target.y += titanFrontBreathLift(
        target.z,
        Number.isFinite(guard) ? guard : 1,
      );
      return target;
    };
  }
  for (const mesh of [near, far]) {
    mesh.boundingBox = mesh.geometry.boundingBox
      .clone()
      .expandByScalar(TITAN_ARM_RIG.maximumMotion);
    mesh.boundingSphere = mesh.geometry.boundingSphere.clone();
    mesh.boundingSphere.radius += TITAN_ARM_RIG.maximumMotion;
  }
  root.scale.setScalar(width);
  root.updateMatrixWorld(true);
  far.visible = false;
  let guard = Number.NaN,
    awareness = 0,
    leanYaw = 0,
    leanPitch = 0,
    version = 0,
    armVersion = 0,
    headVersion = 0,
    disposed = false;
  const pivot = new THREE.Vector3(...TITAN_FRONT_HEAD_PIVOT),
    leftPivot = new THREE.Vector3(...TITAN_ARM_RIG.leftPivot),
    rightPivot = new THREE.Vector3(...TITAN_ARM_RIG.rightPivot),
    tmp = new THREE.Vector3(),
    posed = new Map();
  const deformLocal = (
    source,
    target = new THREE.Vector3(),
    weights = null,
    includeBreath = true,
  ) => {
    const w = weights || titanEmbraceWeights(source.x, source.y, source.z);
    target.copy(source);
    if (w[1] !== 0) {
      tmp
        .copy(source)
        .sub(leftPivot)
        .applyQuaternion(brace.quaternion)
        .add(leftPivot)
        .sub(source);
      target.addScaledVector(tmp, w[1]);
    }
    if (w[3] !== 0) {
      tmp
        .copy(source)
        .sub(rightPivot)
        .applyQuaternion(rightArm.quaternion)
        .add(rightPivot)
        .sub(source);
      target.addScaledVector(tmp, w[3]);
    }
    if (w[2]) {
      tmp
        .copy(source)
        .sub(pivot)
        .applyQuaternion(head.quaternion)
        .add(pivot)
        .sub(source);
      tmp.y += TITAN_HEAD_POSE_LIMITS.awarenessLift * awareness;
      target.addScaledVector(tmp, w[2]);
    }
    if (includeBreath)
      target.y += titanFrontBreathLift(
        target.z,
        Number.isFinite(guard) ? guard : 1,
      );
    return target;
  };
  // 只细分跨骨权的大合并盒，避免一只盒子同时包住抬起的手臂和不动的后胸。
  const liftZone = (c) => {
      const reach = c.half[2] + TITAN_ARM_RIG.maximumArmMotion;
      return c.center[2] + reach <= TITAN_BREATH_LIFT.frontZ
        ? 1
        : c.center[2] - reach >= TITAN_BREATH_LIFT.rearZ
          ? 0
          : -1;
    },
    fittedContacts = [];
  function splitContact(c, depth = 0) {
    const probes = [...corners(c), new THREE.Vector3(...c.center)];
    const sampleWeights = (p) => {
      const w = titanEmbraceWeights(p.x, p.y, p.z);
      return w;
    };
    const values = probes.map(sampleWeights);
    const spread = (ids) =>
      TITAN_ARM_RIG.maximumArmMotion *
        [1, 3].reduce(
          (sum, k) =>
            sum +
            Math.max(...ids.map((w) => w[k])) -
            Math.min(...ids.map((w) => w[k])),
          0,
        ) +
      0.035 *
        (Math.max(...ids.map((w) => w[2])) - Math.min(...ids.map((w) => w[2])));
    const headExtent =
      Math.max(...values.map((w) => w[2])) > 0.02 && Math.max(...c.half) > 0.04;
    if (depth < 16 && (spread(values) > 0.025 || headExtent)) {
      let axis = -1,
        score = -1;
      for (let a = 0; a < 3; a++) {
        if (c.half[a] < 0.0041) continue;
        const ids = [-1, 0, 1].map((sign) => {
          const p = [...c.center];
          p[a] += sign * c.half[a];
          return sampleWeights(new THREE.Vector3(...p));
        });
        const s = headExtent ? c.half[a] : spread(ids);
        if (s > score) {
          score = s;
          axis = a;
        }
      }
      if (axis >= 0 && score > 1e-7) {
        const half = [...c.half];
        half[axis] /= 2;
        for (const sign of [-1, 1]) {
          const center = [...c.center];
          center[axis] += sign * half[axis];
          splitContact({ ...c, center, half }, depth + 1);
        }
        return;
      }
    }
    fittedContacts.push({
      ...c,
      sourceIndex: c.index,
      index: fittedContacts.length,
    });
  }
  const longShearSources = new Set([
    466, 848, 1437, 1585, 1811, 1895, 2330, 2358, 3607,
  ]);
  for (const raw of asset.cradleContacts) {
    const contact = longShearSources.has(raw.index)
      ? { ...raw, curveSegment: true }
      : raw;
    // 新同侧松臂使这个9.6米源格的旋转AABB多包住水角；沿X等分原体积后再统一拟合全部子格。
    if (contact.index === 2023) {
      const half = [...contact.half];
      half[0] /= 2;
      for (const sign of [-1, 1]) {
        const center = [...contact.center];
        center[0] += sign * half[0];
        splitContact({ ...contact, center, half });
      }
    } else if (contact.curveSegment) {
      // 仅九个实际长掌/胸源格完整分段；其余原格不新增细分，避免把全兽铺成细网格。
      const half = [...contact.half];
      half[2] /= 8;
      for (let i = 0; i < 8; i++) {
        const center = [...contact.center];
        center[2] += (2 * i - 7) * half[2];
        splitContact({ ...contact, center, half });
      }
    } else splitContact(contact);
  }
  // 前躯剪切与护臂共用精确guard版本；后胸渐变外仍可保持静态。
  const dependency = (w, point) =>
      (w[1] !== 0 ||
      w[3] !== 0 ||
      point.z - TITAN_ARM_RIG.maximumArmMotion < TITAN_BREATH_LIFT.rearZ
        ? 1
        : 0) | (w[2] !== 0 ? 2 : 0),
    poseKey = (mask) =>
      mask === 1
        ? armVersion
        : mask === 2
          ? headVersion
          : mask === 3
            ? version
            : 0;
  const sampleContacts = fittedContacts.map((c) => {
    const points = corners(c),
      centerPoint = new THREE.Vector3(...c.center),
      weights = [...points, centerPoint].map((p) =>
        titanEmbraceWeights(p.x, p.y, p.z),
      ),
      singleBone = [0, 1, 2, 3].find((i) =>
        weights.every((w) => w[i] > 1 - 1e-8),
      ),
      breathing =
        singleBone === undefined ? liftZone(c) : rigidBreathZone(c, singleBone),
      moving =
        breathing !== 0 ||
        weights
          .slice(0, 8)
          .some((w) => w[1] > 1e-8 || w[2] > 1e-8 || w[3] > 1e-8),
      rigidIndex = breathing !== -1 ? singleBone : undefined;
    let probes = null,
      mask = dependency(weights[8], centerPoint);
    if (moving && rigidIndex === undefined) {
      // 固定rest探针和Float64骨权只存一次，当前姿态仍执行相同顺序的27点变形。
      probes = new Float64Array(27 * 7);
      let offset = 0;
      for (const x of [
        c.center[0] - c.half[0],
        c.center[0],
        c.center[0] + c.half[0],
      ])
        for (const y of [
          c.center[1] - c.half[1],
          c.center[1],
          c.center[1] + c.half[1],
        ])
          for (const z of [
            c.center[2] - c.half[2],
            c.center[2],
            c.center[2] + c.half[2],
          ]) {
            const w = titanEmbraceWeights(x, y, z);
            probes.set([x, y, z, ...w], offset);
            offset += 7;
            mask |= dependency(w, new THREE.Vector3(x, y, z));
          }
    } else if (moving) mask |= rigidIndex === 2 ? 2 : 1;
    const data = {
      id: `bermuda_titan_front_${c.index}`,
      index: c.index,
      type: "box",
      x: c.center[0],
      y: c.center[1],
      z: c.center[2],
      halfSize: new THREE.Vector3(...c.half),
      rotation: new THREE.Quaternion(),
      titanBreathIgnore: true,
      dynamic: moving,
      titanGuardArm: points.some((p) => {
        const w = titanEmbraceWeights(p.x, p.y, p.z);
        return w[1] + w[3] > 0.1;
      }),
    };
    return {
      source: c,
      points,
      data,
      rigidIndex,
      centerPoint,
      centerWeights: weights[8],
      probes,
      dependency: mask,
      curveFit: breathing === -1 && (c.half[2] > 0.025 || c.curveSegment),
    };
  });
  const staticContacts = sampleContacts
      .filter((c) => !c.data.dynamic)
      .map((c) => c.data),
    dynamicRows = sampleContacts.filter((c) => c.data.dynamic),
    dynamicRestContacts = dynamicRows.map((c) => c.data),
    byIndex = new Map(sampleContacts.map((c) => [c.source.index, c])),
    surfaceByIndex = new Map(),
    posedFaces = new Map(),
    faceDependencies = new Map(),
    fitRestTile = surfaceTileFitter((p, target) => target.copy(p)),
    fitPosedTile = surfaceTileFitter(deformLocal, (tile) => {
      const face = faceDependencies.get(tile.sourceFace),
        key = poseKey(face.dependency),
        old = posedFaces.get(tile.sourceFace);
      if (old?.key === key) return old.points;
      const points = face.points.map((p, i) =>
        deformLocal(p, new THREE.Vector3(), face.weights[i]),
      );
      posedFaces.set(tile.sourceFace, { key, points });
      return points;
    });
  for (const [i, tile] of (asset.cradleSurfaceTiles ?? []).entries()) {
    if (!faceDependencies.has(tile.sourceFace)) {
      const points = tile.faceVertices.map((p) => new THREE.Vector3(...p)),
        weights = points.map((p) => titanEmbraceWeights(p.x, p.y, p.z));
      faceDependencies.set(tile.sourceFace, {
        points,
        weights,
        dependency: weights.reduce(
          (mask, w, i) => mask | dependency(w, points[i]),
          0,
        ),
      });
    }
    const index = sampleContacts.length + i,
      fit = fitRestTile(tile),
      data = {
        id: `bermuda_titan_cradle_surface_${i}`,
        index,
        type: "sphere",
        x: fit.center.x,
        y: fit.center.y,
        z: fit.center.z,
        radius: fit.radius,
        titanBreathIgnore: true,
        dynamic: true,
        titanGuardArm: tile.faceVertices.some((p) => {
          const w = titanEmbraceWeights(...p);
          return w[1] + w[3] > 0.1;
        }),
      };
    surfaceByIndex.set(index, {
      tile,
      data,
      dependency: faceDependencies.get(tile.sourceFace).dependency,
    });
    dynamicRestContacts.push(data);
  }
  const probeSource = new THREE.Vector3(),
    probeTarget = new THREE.Vector3(),
    probeWeights = [0, 0, 0, 0];
  const getPosedContact = (index) => {
    const surface = surfaceByIndex.get(index);
    if (surface) {
      const key = poseKey(surface.dependency);
      if (posed.get(index)?.key === key) return posed.get(index).data;
      const fit = fitPosedTile(surface.tile),
        data = {
          ...surface.data,
          x: fit.center.x,
          y: fit.center.y,
          z: fit.center.z,
          radius: fit.radius,
        };
      posed.set(index, { key, data });
      return data;
    }
    const row = byIndex.get(index);
    if (!row) return null;
    if (!row.data.dynamic) return row.data;
    const key = poseKey(row.dependency);
    if (posed.get(index)?.key === key) return posed.get(index).data;
    // 单一骨骼覆盖的盒子保留真实朝向，不能把旋转手臂扩成更宽的世界轴包围盒。
    const rigidIndex = row.rigidIndex;
    if (rigidIndex !== undefined) {
      const bone =
          rigidIndex === 0
            ? fixed
            : rigidIndex === 1
              ? brace
              : rigidIndex === 3
                ? rightArm
                : head,
        center = deformLocal(
          row.centerPoint,
          new THREE.Vector3(),
          row.centerWeights,
        ),
        data = {
          ...row.data,
          x: center.x,
          y: center.y,
          z: center.z,
          halfSize: new THREE.Vector3(...row.source.half).addScalar(0.0002),
          rotation: bone.quaternion.clone(),
        };
      posed.set(index, { key, data });
      return data;
    }
    const box = new THREE.Box3();
    for (let offset = 0; offset < row.probes.length; offset += 7) {
      probeSource.fromArray(row.probes, offset);
      for (let k = 0; k < 4; k++) probeWeights[k] = row.probes[offset + 3 + k];
      box.expandByPoint(
        deformLocal(probeSource, probeTarget, probeWeights, !row.curveFit),
      );
    }
    box.expandByScalar(0.0002);
    if (row.curveFit) {
      const data = { ...row.data, ...fitBreathingBox(box, guard) };
      posed.set(index, { key, data });
      return data;
    }
    const center = box.getCenter(new THREE.Vector3()),
      half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    const data = {
      ...row.data,
      x: center.x,
      y: center.y,
      z: center.z,
      halfSize: half,
      rotation: new THREE.Quaternion(),
    };
    posed.set(index, { key, data });
    return data;
  };
  function setGuard(value) {
    const next = THREE.MathUtils.clamp(value, 0, 1);
    if (next === guard) return;
    guard = next;
    guardUniform.value = guard;
    const armPose = titanArmPose(guard);
    brace.rotation.set(armPose.pitch, armPose.yaw, 0, "YXZ");
    rightArm.rotation.set(armPose.pitch, armPose.rightYaw, 0, "YXZ");
    version++;
    armVersion++;
    root.updateMatrixWorld(true);
    skeleton.update();
  }
  function setAwareness(value) {
    const next = THREE.MathUtils.clamp(value, 0, 1);
    if (next === awareness) return;
    awareness = next;
    awarenessUniform.value = awareness;
    syncHeadPose();
  }
  function syncHeadPose() {
    head.rotation.set(
      leanPitch + TITAN_HEAD_POSE_LIMITS.awarenessPitch * awareness,
      leanYaw,
      0,
      "YXZ",
    );
    head.position.y =
      pivot.y + TITAN_HEAD_POSE_LIMITS.awarenessLift * awareness;
    version++;
    headVersion++;
    root.updateMatrixWorld(true);
    skeleton.update();
  }
  function setBreathLean(yaw = 0, pitch = 0) {
    const nextYaw = THREE.MathUtils.clamp(
        Number.isFinite(yaw) ? yaw : 0,
        -TITAN_HEAD_POSE_LIMITS.maxYaw,
        TITAN_HEAD_POSE_LIMITS.maxYaw,
      ),
      nextPitch = THREE.MathUtils.clamp(
        Number.isFinite(pitch) ? pitch : 0,
        TITAN_HEAD_POSE_LIMITS.minimumPitch,
        0,
      );
    if (nextYaw === leanYaw && nextPitch === leanPitch) return;
    leanYaw = nextYaw;
    leanPitch = nextPitch;
    syncHeadPose();
  }
  function mouthPose() {
    const position = new THREE.Vector3(...TITAN_FRONT_MOUTH)
      .sub(pivot)
      .applyQuaternion(head.quaternion)
      .add(pivot);
    position.y += TITAN_HEAD_POSE_LIMITS.awarenessLift * awareness;
    position.y += titanFrontBreathLift(position.z, guard);
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(
      head.quaternion,
    );
    root.updateWorldMatrix(true, false);
    position.applyMatrix4(root.matrixWorld);
    direction.transformDirection(root.matrixWorld);
    return { position, direction };
  }
  // 每个实际探针/刚性角点相对骨根的有限半径，给参考姿态索引提供严格位移上界。
  const movingBones = [brace, rightArm, head],
    bonePivots = [leftPivot, rightPivot, pivot],
    groupRadii = Array.from({ length: 4 }, () => [0, 0, 0]),
    groupUnweighted = Array.from({ length: 4 }, () => [0, 0, 0]),
    groupHeadWeights = [0, 0, 0, 0],
    weightIds = [1, 3, 2],
    boundPoint = new THREE.Vector3();
  const growRadius = (point, weights, mask, extra = 0, ownBone = -1) => {
    for (let b = 0; b < 3; b++) {
      const w = weights[weightIds[b]],
        distance = point.distanceTo(bonePivots[b]);
      groupRadii[mask][b] = Math.max(
        groupRadii[mask][b],
        w * distance + (ownBone === weightIds[b] ? extra : 0),
      );
      if (w !== 0 || ownBone === weightIds[b])
        groupUnweighted[mask][b] = Math.max(
          groupUnweighted[mask][b],
          distance + extra,
        );
    }
    groupHeadWeights[mask] = Math.max(groupHeadWeights[mask], weights[2]);
  };
  for (const row of sampleContacts)
    if (row.data.dynamic) {
      if (row.rigidIndex !== undefined)
        growRadius(
          row.centerPoint,
          row.centerWeights,
          row.dependency,
          Math.hypot(...row.source.half.map((h) => h + 0.0002)),
          row.rigidIndex,
        );
      else
        for (let i = 0; i < row.probes.length; i += 7) {
          boundPoint.fromArray(row.probes, i);
          for (let k = 0; k < 4; k++) probeWeights[k] = row.probes[i + 3 + k];
          growRadius(boundPoint, probeWeights, row.dependency);
        }
    }
  for (const face of faceDependencies.values())
    for (let k = 0; k < 3; k++)
      growRadius(face.points[k], face.weights[k], face.dependency);
  const queryGroups = Array.from({ length: 4 }, () => ({
      indices: [],
      boundKey: -1,
      grid: null,
      extra: 0,
      reference: null,
      sphereRadius: 0,
      curveRadius: 0,
    })),
    queryBounds = new WeakMap();
  for (const c of dynamicRestContacts) {
    const mask =
      surfaceByIndex.get(c.index)?.dependency ??
      byIndex.get(c.index).dependency;
    queryGroups[mask].indices.push(c.index);
  }
  function currentBounds(contact) {
    const old = queryBounds.get(contact);
    if (old) return old;
    const h = contact.halfSize,
      q = contact.rotation;
    let x, y, z;
    if (contact.type === "sphere") x = y = z = contact.radius;
    else if (!q) ({ x, y, z } = h);
    else {
      x =
        Math.abs(1 - 2 * (q.y * q.y + q.z * q.z)) * h.x +
        Math.abs(2 * (q.x * q.y - q.z * q.w)) * h.y +
        Math.abs(2 * (q.x * q.z + q.y * q.w)) * h.z;
      y =
        Math.abs(2 * (q.x * q.y + q.z * q.w)) * h.x +
        Math.abs(1 - 2 * (q.x * q.x + q.z * q.z)) * h.y +
        Math.abs(2 * (q.y * q.z - q.x * q.w)) * h.z;
      z =
        Math.abs(2 * (q.x * q.z - q.y * q.w)) * h.x +
        Math.abs(2 * (q.y * q.z + q.x * q.w)) * h.y +
        Math.abs(1 - 2 * (q.x * q.x + q.y * q.y)) * h.z;
    }
    const bounds = [
      contact.x - x,
      contact.x + x,
      contact.y - y,
      contact.y + y,
      contact.z - z,
      contact.z + z,
      Math.hypot(x, y, z),
    ];
    queryBounds.set(contact, bounds);
    return bounds;
  }
  setGuard(1);
  return {
    root,
    near,
    far,
    skeleton,
    bones: { fixed, brace, leftArm: brace, rightArm, head },
    asset,
    width,
    staticContacts,
    dynamicRestContacts,
    restContacts: [
      ...sampleContacts.map((c) => c.data),
      ...[...surfaceByIndex.values()].map((s) => s.data),
    ],
    debugReferenceBounds: {
      weighted: groupRadii,
      unweighted: groupUnweighted,
      headLiftWeights: groupHeadWeights,
      curveContacts: sampleContacts.filter((row) => row.curveFit).length,
      curveSources: new Set(
        sampleContacts
          .filter((row) => row.curveFit)
          .map((row) => row.source.sourceIndex),
      ).size,
      probeRows: sampleContacts.filter((row) => row.probes).length,
      probeBytes: sampleContacts.reduce(
        (sum, row) => sum + (row.probes?.byteLength ?? 0),
        0,
      ),
    },
    mouthLocal: new THREE.Vector3(...TITAN_FRONT_MOUTH),
    setGuard,
    setAwareness,
    setBreathLean,
    getMouthPose: mouthPose,
    deformLocal,
    getPosedContact,
    queryDynamicContacts(
      start,
      end = start,
      { radius = 0, padding = 0, segment = false } = {},
    ) {
      if (disposed) return [];
      // 参考索引可保留，但当前接触始终精确更新；小骨位移只扩大候选，不量化实际动作。
      const margin = padding + Math.sqrt(3) * radius + 1e-7,
        minX = Math.min(start.x, end.x) - margin,
        maxX = Math.max(start.x, end.x) + margin,
        minZ = Math.min(start.z, end.z) - margin,
        maxZ = Math.max(start.z, end.z) + margin,
        useY = Number.isFinite(start.y) && Number.isFinite(end.y),
        minY = useY ? Math.min(start.y, end.y) - margin : -Infinity,
        maxY = useY ? Math.max(start.y, end.y) + margin : Infinity,
        lists = [],
        dx = end.x - start.x,
        dy = end.y - start.y,
        dz = end.z - start.z,
        lengthSq = dx * dx + dy * dy + dz * dz;
      for (let mask = 0; mask < queryGroups.length; mask++) {
        const group = queryGroups[mask];
        if (!group.indices.length) continue;
        const key = poseKey(mask);
        if (group.boundKey !== key) {
          let delta = 0,
            lbsDelta = 0,
            breathDelta = 0,
            frameDelta = 0;
          if (group.reference) {
            for (let b = 0; b < 3; b++)
              if (mask & (b === 2 ? 2 : 1))
                delta +=
                  2 *
                  Math.sin(
                    movingBones[b].quaternion.angleTo(
                      group.reference.rotations[b],
                    ) / 2,
                  ) *
                  groupRadii[mask][b];
            if (mask & 2)
              delta +=
                Math.abs(head.position.y - group.reference.lift) *
                groupHeadWeights[mask];
            lbsDelta = delta;
            breathDelta = Math.abs(
              (1 - guard) * TITAN_BREATH_LIFT.height -
                group.reference.breathLift,
            );
            const fadeLength =
              TITAN_BREATH_LIFT.rearZ - TITAN_BREATH_LIFT.frontZ;
            frameDelta = Math.min(
              Math.atan((TITAN_BREATH_LIFT.height * 1.5) / fadeLength),
              ((TITAN_BREATH_LIFT.height * 1.5) / fadeLength) *
                Math.abs(guard - group.reference.guard) +
                ((6 * TITAN_BREATH_LIFT.height) / (fadeLength * fadeLength)) *
                  lbsDelta,
            );
            // Y剪切的Lipschitz界包含posed-Z变化，当前实体仍逐点精算，不量化呼吸。
            delta =
              delta *
                (1 +
                  (TITAN_BREATH_LIFT.height * 1.5) /
                    (TITAN_BREATH_LIFT.rearZ - TITAN_BREATH_LIFT.frontZ)) +
              breathDelta;
          }
          if (!group.grid || delta > 2 / width) {
            const contacts = group.indices.map(getPosedContact);
            group.grid = createStaticColliderGrid(contacts, {
              cellSize: 0.09,
              maxCellsPerCollider: 128,
            });
            group.sphereRadius = contacts.reduce(
              (r, c) => Math.max(r, c.type === "sphere" ? c.radius : 0),
              0,
            );
            group.curveRadius = contacts.reduce(
              (r, c) =>
                byIndex.get(c.index)?.curveFit
                  ? Math.max(r, c.halfSize.length())
                  : r,
              0,
            );
            group.reference = {
              rotations: movingBones.map((bone) => bone.quaternion.clone()),
              lift: head.position.y,
              breathLift: (1 - guard) * TITAN_BREATH_LIFT.height,
              guard,
            };
            delta = 0;
            lbsDelta = breathDelta = frameDelta = 0;
          }
          // 当前三角顶点在参考球R+D内；当前MEB中心在顶点凸包内，半径<=R+D，故外扩R+2D足够。
          group.extra = group.sphereRadius
            ? Math.min(
                group.sphereRadius + 2 * delta,
                delta + 2 * Math.sqrt(delta * (group.sphereRadius + delta)),
              ) + 1e-8
            : delta + 1e-8;
          if (group.curveRadius) {
            // pre-LBS AABB集合的Hausdorff界另含sqrt3；旋转拟合框必须额外包住frame变化。
            const volumeDelta =
                Math.sqrt(3) *
                  lbsDelta *
                  (1 +
                    (TITAN_BREATH_LIFT.height * 1.5) /
                      (TITAN_BREATH_LIFT.rearZ - TITAN_BREATH_LIFT.frontZ)) +
                breathDelta,
              rotationReach = 2 * Math.sin(frameDelta / 2) * group.curveRadius;
            group.extra = Math.max(
              group.extra,
              Math.sqrt(3) * volumeDelta +
                (1 + Math.sqrt(3)) * rotationReach +
                1e-8,
            );
          }
          group.boundKey = key;
        }
        const candidates = group.grid.query(start, end, {
            radius,
            padding: padding + group.extra,
          }),
          contacts = [];
        for (const candidate of candidates) {
          if (segment && useY) {
            const rb = currentBounds(candidate),
              t =
                lengthSq > 0
                  ? Math.max(
                      0,
                      Math.min(
                        1,
                        ((candidate.x - start.x) * dx +
                          (candidate.y - start.y) * dy +
                          (candidate.z - start.z) * dz) /
                          lengthSq,
                      ),
                    )
                  : 0,
              px = candidate.x - (start.x + dx * t),
              py = candidate.y - (start.y + dy * t),
              pz = candidate.z - (start.z + dz * t),
              reach =
                rb[6] + Math.sqrt(3) * (group.extra + radius) + padding + 1e-7;
            if (px * px + py * py + pz * pz > reach * reach) continue;
          }

          const current = getPosedContact(candidate.index),
            b = currentBounds(current);
          if (
            b[0] <= maxX &&
            b[1] >= minX &&
            b[2] <= maxY &&
            b[3] >= minY &&
            b[4] <= maxZ &&
            b[5] >= minZ
          )
            contacts.push(current);
        }
        if (contacts.length) lists.push(contacts);
      }
      if (lists.length <= 1) return lists[0] || [];
      const offsets = lists.map(() => 0),
        result = [];
      for (;;) {
        let next = -1,
          index = Infinity;
        for (let i = 0; i < lists.length; i++) {
          const c = lists[i][offsets[i]];
          if (c && c.index < index) {
            next = i;
            index = c.index;
          }
        }
        if (next < 0) break;
        result.push(lists[next][offsets[next]++]);
      }
      return result;
    },
    getAnchorWorld(local, target = new THREE.Vector3()) {
      root.updateWorldMatrix(true, false);
      return deformLocal(local, target).applyMatrix4(root.matrixWorld);
    },
    setCharge(value) {
      chargeUniform.value = THREE.MathUtils.clamp(value, 0, 1);
    },
    update(elapsed, { distant = false } = {}) {
      timeUniform.value = elapsed;
      near.visible = !distant;
      far.visible = distant;
      root.updateMatrixWorld(true);
      skeleton.update();
    },
    async prepare(options) {
      const ready = await asset.prepare(options);
      if (disposed) return false;
      for (const key of ["map", "roughnessMap", "metalnessMap"])
        nearMaterial[key] = asset.material[key];
      nearMaterial.color.copy(asset.material.color);
      nearMaterial.vertexColors = asset.material.vertexColors;
      nearMaterial.roughness = asset.material.roughness;
      nearMaterial.metalness = asset.material.metalness;
      nearMaterial.needsUpdate = true;
      return ready;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      skeleton.dispose();
      nearMaterial.dispose();
      farMaterial.dispose();
      posed.clear();
      posedFaces.clear();
      faceDependencies.clear();
      for (const group of queryGroups) {
        group.grid = null;
        group.indices.length = 0;
      }
      for (const row of sampleContacts) row.probes = null;
      byIndex.clear();
      surfaceByIndex.clear();
      asset.release();
    },
  };
}
