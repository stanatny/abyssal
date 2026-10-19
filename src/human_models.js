import { humanHfAsset } from "./human_hf_asset.js";
import * as THREE from "three";
const CACHE = new Map();
// 手腕沿肩线前伸、向大腿推水，再从身体外侧恢复；轨迹单位为上臂与前臂总长。
const CRAWL_HAND_PATH = new THREE.CatmullRomCurve3(
  [
    [0.1, -0.04, -0.96],
    [0.1, -0.045, -0.97],
    [0.11, -0.08, -0.96],
    [0.12, -0.18, -0.92],
    [0.16, -0.36, -0.82],
    [0.18, -0.55, -0.58],
    [0.17, -0.7, -0.2],
    [0.16, -0.66, 0.25],
    [0.14, -0.47, 0.65],
    [0.12, -0.19, 0.91],
    [0.48, 0.06, 0.8],
    [0.72, 0.1, 0.48],
    [0.8, 0.1, 0.02],
    [0.69, 0.08, -0.48],
    [0.4, 0.04, -0.8],
    [0.16, 0, -0.94],
  ].map((p) => new THREE.Vector3(...p)),
  true,
  "catmullrom",
  0.25,
);
/**
 * 创建成年游泳者或潜水员；局部-Z为头部、+Y为背部，length沿用人类活动接口。
 * 几何与材质按种类及性别共享，骨骼和姿态独立；dispose只在最后一个引用释放时销毁缓存。
 * @param {'swimmer'|'diver'} kind 人类种类。
 * @param {number} length 世界尺度。
 * @param {'male'|'female'} sex 成年人物外观，默认为男性。
 * @returns {THREE.Group} userData含animate(time)、samplePose(周期比例)、motionPeriod(秒)、dispose()及命名骨骼poseBones。
 */
export function createArticulatedHuman(kind, length = 1, sex = "male") {
  sex = sex === "female" ? "female" : "male";
  const cacheKey = `${kind}_${sex}`;
  if (!CACHE.has(cacheKey)) CACHE.set(cacheKey, humanHfAsset(kind, sex));
  const asset = CACHE.get(cacheKey);
  asset.references++;
  const root = new THREE.Group();
  root.name = kind;
  const definitions = asset.boneDefinitions;
  const bones = definitions.map(([name, , point]) => {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.set(...point);
    return bone;
  });
  definitions.forEach(([, parent], index) => {
    (parent < 0 ? root : bones[parent]).add(bones[index]);
  });
  for (const [index, rotation] of Object.entries(asset.bindRotations || {}))
    bones[index].rotation.set(...rotation);
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  const meshes = asset.parts.map(({ geometry, material, name }) => {
    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.name = `${kind}_${name}`;
    root.add(mesh);
    mesh.bind(skeleton);
    // 手臂回转的包络比静态身体大；射线使用真实蒙皮顶点，不沿用首帧的紧包围盒。
    mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.1);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  });
  root.scale.setScalar(length);
  const poseBones = Object.fromEntries(bones.map((bone) => [bone.name, bone]));
  let disposed = false;
  root.userData.kind = kind;
  root.userData.artRevision = "trellis_hawaii_batch11_20261019";
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare?.();
  root.userData.sex = sex;
  root.userData.length = length;
  root.userData.poseBones = poseBones;
  const period = (Math.PI * 2) / (kind === "diver" ? 1.65 : 2.35);
  const armRest = new THREE.Vector3(),
    armDirection = new THREE.Vector3();
  const armBind = new THREE.Quaternion(),
    armSwing = new THREE.Quaternion();
  const bendAxis = new THREE.Vector3(),
    inverseShoulder = new THREE.Quaternion();
  const worldX = new THREE.Vector3(1, 0, 0),
    worldY = new THREE.Vector3(0, 1, 0);
  const aimArm = (shoulder, sign, y, z) => {
    // 从实际T姿做最短摆转，避免旧姿态把肩袖额外拧转近180度。
    armRest.set(sign, 0, 0);
    armDirection.set(sign * 0.1, y, z).normalize();
    armBind.setFromAxisAngle(worldY, (sign * Math.PI) / 2);
    armSwing.setFromUnitVectors(armRest, armDirection);
    shoulder.quaternion.copy(armSwing).multiply(armBind);
    inverseShoulder.copy(shoulder.quaternion).invert();
    bendAxis.copy(worldX).applyQuaternion(inverseShoulder);
  };
  const handOffset = new THREE.Vector3(),
    upperDirection = new THREE.Vector3(),
    lowerDirection = new THREE.Vector3(),
    reachAxis = new THREE.Vector3(),
    elbowPole = new THREE.Vector3(),
    hingeY = new THREE.Vector3(),
    hingeX = new THREE.Vector3(),
    hingeFrame = new THREE.Matrix4();
  const crawlArm = (shoulder, elbow, wrist, sign, phase) => {
    const upper = elbow.position.z,
      lower = wrist.position.z,
      span = upper + lower;
    CRAWL_HAND_PATH.getPoint(phase, handOffset).multiplyScalar(span);
    handOffset.x *= sign;
    const distance = Math.min(handOffset.length(), span * 0.985);
    reachAxis.copy(handOffset).normalize();
    handOffset.copy(reachAxis).multiplyScalar(distance);
    // 肘部朝身体外上方弯曲；手掌有独立前移路径，不能折回到颈后。
    elbowPole.set(sign * 0.65, 1, 0);
    elbowPole.addScaledVector(reachAxis, -elbowPole.dot(reachAxis)).normalize();
    const along =
        (upper * upper - lower * lower + distance * distance) / (2 * distance),
      lift = Math.sqrt(Math.max(0, upper * upper - along * along));
    upperDirection
      .copy(reachAxis)
      .multiplyScalar(along)
      .addScaledVector(elbowPole, lift);
    lowerDirection.copy(handOffset).sub(upperDirection).normalize();
    upperDirection.normalize();
    // 肘只沿一个解剖铰链屈伸；用整条臂的弯曲平面确定肩的转向，避免前臂绕自身乱拧。
    const flex = Math.acos(
      THREE.MathUtils.clamp(upperDirection.dot(lowerDirection), -1, 1),
    );
    hingeY
      .copy(upperDirection)
      .multiplyScalar(Math.cos(flex))
      .sub(lowerDirection)
      .normalize();
    hingeX.crossVectors(hingeY, upperDirection).normalize();
    hingeFrame.makeBasis(hingeX, hingeY, upperDirection);
    shoulder.quaternion.setFromRotationMatrix(hingeFrame);
    elbow.rotation.set(flex, 0, 0);
    wrist.quaternion.identity();
  };
  const applyPose = (normalizedPhase) => {
    if (disposed || !Number.isFinite(normalizedPhase)) return;
    const progress = THREE.MathUtils.euclideanModulo(normalizedPhase, 1);
    const cycle = progress * Math.PI * 2;
    bones[0].rotation.z = kind === "swimmer" ? Math.sin(cycle) * 0.1 : 0;
    bones[1].rotation.z = Math.sin(cycle) * (kind === "diver" ? 0.035 : 0.18);
    bones[2].rotation.z = kind === "diver" ? 0.025 : -Math.sin(cycle) * 0.2;
    bones[2].rotation.x = kind === "diver" ? -0.1 : 0.06;
    for (let side = 0; side < 2; side++) {
      const sign = side ? 1 : -1;
      const phase = cycle + side * Math.PI;
      const shoulder = bones[3 + side * 3],
        elbow = bones[4 + side * 3],
        wrist = bones[5 + side * 3];
      const hip = bones[9 + side * 3],
        knee = bones[10 + side * 3],
        ankle = bones[11 + side * 3];
      if (kind === "swimmer") {
        crawlArm(shoulder, elbow, wrist, sign, (progress + side * 0.5) % 1);
        // 由髋带动轻幅打腿，膝盖保持舒展；脚趾沿后方延伸，避免钩脚蹬车。
        const kick = Math.sin(phase * 2 + side * Math.PI);
        hip.rotation.x = kick * 0.105;
        knee.rotation.x = -0.035 - Math.max(0, kick) * 0.085;
        ankle.rotation.x =
          (sex === "female" ? -1.13 : -1.2) +
          Math.sin(phase * 2 + side * Math.PI - 0.35) * 0.035;
      } else {
        // 潜水员保持前伸配平；脚蹼沿脚侧伸展，膝只向背侧屈曲。
        aimArm(shoulder, sign, -0.48 + Math.sin(phase) * 0.03, -0.88);
        elbow.quaternion.setFromAxisAngle(
          bendAxis,
          0.55 + Math.sin(phase) * 0.025,
        );
        wrist.quaternion.setFromAxisAngle(bendAxis, 0.16);
        hip.rotation.x = Math.sin(phase) * 0.15;
        knee.rotation.x = -0.08 - Math.max(0, Math.sin(phase)) * 0.18;
        ankle.rotation.x = -0.72 + Math.sin(phase - 0.45) * 0.1;
      }
    }
    for (const mesh of meshes) mesh.boundingBox = null;
  };
  root.userData.motionPeriod = period;
  // 按归一化完整周期采样，便于图鉴定格与录像；不创建额外时钟或动画循环。
  root.userData.samplePose = applyPose;
  root.userData.animate = (time) => {
    if (!Number.isFinite(time)) return;
    applyPose(time / period);
  };
  root.userData.dispose = () => {
    if (disposed) return;
    disposed = true;
    root.removeFromParent();
    skeleton.dispose();
    if (--asset.references === 0) {
      asset.dispose?.();
      for (const part of asset.parts) {
        part.geometry.dispose();
        part.material.dispose();
      }
      CACHE.delete(cacheKey);
    }
  };
  root.userData.disposeLocalMotion = root.userData.dispose;
  root.userData.animate(0);
  return root;
}
