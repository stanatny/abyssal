import * as THREE from "three";
import packed from "./assets/models/spider_monkey_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
import { solveCanopyElbow } from "./amazon_canopy_motion.js";

// 按第二次 HF 实体的肩、肘、腕、髋、膝和尾根拟合；保持连续原始皮肤。
const joints = [
  [0.08, -0.08, -0.13],
  [0.08, 0.1, -0.11],
  [0.085, 0.265, -0.095],
  [-0.005, 0.19, -0.11],
  [-0.18, 0.3, -0.03],
  [-0.315, 0.455, 0.07],
  [0.17, 0.19, -0.11],
  [0.26, 0.31, -0.015],
  [0.34, 0.455, 0.1],
  [0.02, -0.105, -0.135],
  [-0.01, -0.27, -0.04],
  [-0.025, -0.44, -0.12],
  [0.115, -0.1, -0.135],
  [0.2, -0.265, -0.06],
  [0.175, -0.44, -0.15],
  [0.025, -0.13, -0.17],
  [-0.08, -0.22, -0.17],
  [-0.18, -0.3, -0.16],
  [-0.29, -0.31, -0.16],
  [-0.35, -0.25, -0.15],
  [-0.32, -0.215, -0.15],
].map((p) => new THREE.Vector3(...p));
const parents = [
  -1, 0, 1, 1, 3, 4, 1, 6, 7, 0, 9, 10, 0, 12, 13, 0, 15, 16, 17, 18, 19,
];
const chains = [
  [0, 9, 0.09],
  [1, 2, 0.1],
  [3, 4, 0.055],
  [4, 5, 0.04],
  [6, 7, 0.055],
  [7, 8, 0.04],
  [9, 10, 0.065],
  [10, 11, 0.045],
  [12, 13, 0.065],
  [13, 14, 0.045],
  [15, 16, 0.035],
  [16, 17, 0.032],
  [17, 18, 0.03],
  [18, 19, 0.027],
  [19, 20, 0.025],
];
const segments = chains.map(([bone, end, radius]) => ({
  bone,
  a: joints[bone],
  b: joints[end],
  radius,
}));
segments.push(
  {
    bone: 0,
    a: new THREE.Vector3(0.08, -0.14, -0.13),
    b: new THREE.Vector3(0.08, 0.19, -0.11),
    radius: 0.1,
  },
  {
    bone: 2,
    a: joints[2],
    b: new THREE.Vector3(0.085, 0.33, -0.095),
    radius: 0.09,
  },
);
for (const [bone, tip] of [
  [5, [-0.35, 0.42, 0.11]],
  [8, [0.365, 0.42, 0.175]],
  [11, [-0.025, -0.49, -0.07]],
  [14, [0.175, -0.49, -0.1]],
  [20, [-0.285, -0.23, -0.15]],
])
  segments.push({
    bone,
    a: joints[bone],
    b: new THREE.Vector3(...tip),
    radius: 0.035,
  });

function bind(x, y, z, ids, weights, offset) {
  const candidates = [];
  for (const s of segments) {
    const dx = s.b.x - s.a.x,
      dy = s.b.y - s.a.y,
      dz = s.b.z - s.a.z,
      t = THREE.MathUtils.clamp(
        ((x - s.a.x) * dx + (y - s.a.y) * dy + (z - s.a.z) * dz) /
          (dx * dx + dy * dy + dz * dz),
        0,
        1,
      ),
      distance = Math.hypot(
        x - s.a.x - t * dx,
        y - s.a.y - t * dy,
        z - s.a.z - t * dz,
      ),
      score = distance / s.radius;
    candidates.push({ bone: s.bone, score });
  }
  candidates.sort((a, b) => a.score - b.score);
  const selected = candidates.slice(0, 4),
    first = selected[0].score;
  let sum = 0;
  for (let i = 0; i < selected.length; i++) {
    ids[offset + i] = selected[i].bone;
    weights[offset + i] = Math.exp(
      -Math.pow((selected[i].score - first) * 2.8, 2),
    );
    sum += weights[offset + i];
  }
  for (let i = 0; i < 4; i++) weights[offset + i] /= sum;
}

let cached;
function acquire() {
  if (!cached) {
    const geometry = decodeOrganicMesh(packed, bind, (_x, _y, _z, color) =>
      color.set(0x373332),
    );
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
    });
    material.name = "amazon_spider_monkey_hf_surface";
    const prepare = createMaterialPreparation(
      [
        {
          name: "color",
          url: new URL(
            "./assets/models/spider_monkey_hf_color.webp",
            import.meta.url,
          ),
          colorSpace: THREE.SRGBColorSpace,
          apply(texture) {
            material.map = texture;
            material.vertexColors = false;
            material.needsUpdate = true;
          },
        },
      ],
      (ready) => (material.userData.texturesReady = ready),
    );
    cached = { geometry, material, prepare, references: 0 };
  }
  const asset = cached;
  asset.references++;
  let released = false;
  return {
    ...asset,
    release() {
      if (released) return;
      released = true;
      if (--asset.references) return;
      asset.prepare.dispose();
      asset.geometry.dispose();
      asset.material.dispose();
      if (cached === asset) cached = undefined;
    },
  };
}

export function createAmazonSpiderMonkey() {
  const asset = acquire(),
    root = new THREE.Group();
  root.name = "red_faced_spider_monkey_hf";
  root.scale.setScalar(4.2);
  root.userData.prepareMaterials = asset.prepare;
  void asset.prepare();
  const bones = joints.map((p, i) => {
    const bone = new THREE.Bone();
    bone.name = `canopy_joint_${i}`;
    bone.position.copy(p);
    if (parents[i] >= 0) bone.position.sub(joints[parents[i]]);
    return bone;
  });
  bones.forEach((bone, i) =>
    parents[i] >= 0 ? bones[parents[i]].add(bone) : root.add(bone),
  );
  const mesh = new THREE.SkinnedMesh(asset.geometry, asset.material),
    skeleton = new THREE.Skeleton(bones);
  mesh.name = "spider_monkey_skin";
  root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(skeleton);
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.2);
  const target = new THREE.Vector3(),
    elbow = new THREE.Vector3(),
    desired = new THREE.Vector3(),
    pole = new THREE.Vector3(),
    q = new THREE.Quaternion(),
    scratch = { direction: new THREE.Vector3(), bend: new THREE.Vector3() };
  const arms = [3, 6].map((start) => ({
    start,
    upper: joints[start + 1].clone().sub(joints[start]),
    upperUnit: joints[start + 1].clone().sub(joints[start]).normalize(),
    lower: joints[start + 2].clone().sub(joints[start + 1]),
    lowerUnit: joints[start + 2]
      .clone()
      .sub(joints[start + 1])
      .normalize(),
    gripOffset: new THREE.Vector3(
      start === 3 ? -0.02 : 0.025,
      -0.02,
      start === 3 ? 0.03 : 0.065,
    ),
  }));
  let disposed = false;
  return {
    root,
    mesh,
    skeleton,
    joints,
    hangOffset: 1.95,
    centerOffset: new THREE.Vector3(0.08 * 4.2, 0, -0.11 * 4.2),
    pose(time, hands, reducedMotion = false, movement = null) {
      bones[2].rotation.set(
        0.02 * Math.sin(time * 0.7),
        0.1 * Math.sin(time * 0.3),
        0,
      );
      for (let side = 0; side < 2; side++) {
        const a = arms[side],
          i = a.start;
        target.copy(hands[side]);
        root.worldToLocal(target);
        target.sub(a.gripOffset);
        pole.set(side ? 0.35 : -0.35, -0.35, 1);
        solveCanopyElbow(
          joints[i],
          target,
          pole,
          a.upper.length(),
          a.lower.length(),
          elbow,
          scratch,
        );
        desired.subVectors(elbow, joints[i]).normalize();
        bones[i].quaternion.setFromUnitVectors(a.upperUnit, desired);
        desired
          .subVectors(target, elbow)
          .applyQuaternion(q.copy(bones[i].quaternion).invert())
          .normalize();
        bones[i + 1].quaternion.setFromUnitVectors(a.lowerUnit, desired);
        bones[i + 2].quaternion
          .copy(bones[i].quaternion)
          .multiply(bones[i + 1].quaternion)
          .invert();
      }
      const effort = reducedMotion ? 0 : (movement?.effort ?? 1),
        gait = movement?.gait ?? (time / 1.1) * Math.PI * 2;
      // Knees gather during transfer, then extend through the bottom of the
      // swing. This follows the same load cycle as the hands and torso.
      for (let side = 0; side < 2; side++) {
        const i = side ? 12 : 9,
          transfer = 0.5 + 0.5 * Math.sin(gait * 2 - 0.6),
          alternate = Math.cos(gait + side * Math.PI);
        bones[i].rotation.set(
          -0.2 - (0.19 * transfer + 0.06 * alternate) * effort,
          0,
          (side ? -1 : 1) * 0.04,
        );
        bones[i + 1].rotation.x =
          0.28 + (0.28 * transfer - 0.05 * alternate) * effort;
        bones[i + 2].rotation.x = -0.08 - transfer * 0.09 * effort;
      }
      // The tail follows the pelvic load and curls during a reach. Hands carry
      // weight on this exposed vine; do not fake a tail grip in empty space.
      for (let i = 15; i <= 20; i++) {
        const u = (i - 15) / 5;
        bones[i].rotation.set(
          Math.sin(gait - u * 0.5) * (0.08 + u * 0.04) * effort,
          Math.sin(gait * 0.5 - u * 0.6) * 0.09 * effort,
          Math.sin(gait * 2 - 0.8) * 0.055 * u * effort,
        );
      }
      root.updateMatrixWorld(true);
      skeleton.update();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      skeleton.dispose();
      asset.release();
      root.removeFromParent();
      root.clear();
    },
  };
}
