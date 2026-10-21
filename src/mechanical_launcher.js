import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createHawaiiVehicleModel } from "./vehicle_hf_models.js";

/** 幼体使用等比例弹体外观；不参与武器物理或伤害结算。 */
export function mechanicalTorpedoVisualLength(length) {
  return Math.min(2.2, (Math.max(3, length) * 2.2) / 12);
}

const armor = new THREE.MeshStandardMaterial({
  color: 0x777d80,
  metalness: 0.7,
  roughness: 0.4,
});
const dark = new THREE.MeshStandardMaterial({
  color: 0x18232a,
  metalness: 0.45,
  roughness: 0.52,
});
const plate = new THREE.BoxGeometry(0.15, 0.025, 0.78);
const recess = new THREE.BoxGeometry(0.34, 0.045, 0.84).translate(0, 0.31, 0.5);
const clawParts = [0.24, 0.77].flatMap((z) => [
  new THREE.BoxGeometry(0.035, 0.19, 0.055).translate(0, -0.095, z),
  new THREE.BoxGeometry(0.08, 0.035, 0.055).translate(-0.024, -0.19, z),
]);
const claw = mergeGeometries(clawParts);
clawParts.forEach((g) => g.dispose());

/**
 * 腹部单枚外挂机：实体弹与飞行弹共用资源和弹鼻原点。
 * 冷却期间只表现舱门、下降补弹和夹具锁紧，不新增武器计时或改变扣费。
 */
export function createMechanicalLauncher(muzzle, root) {
  const group = new THREE.Group();
  group.name = "mechanical_launcher";
  muzzle.add(group);
  function mesh(name, geometry, material) {
    const part = new THREE.Mesh(geometry, material);
    part.name = name;
    part.userData.keepSeparate = true;
    group.add(part);
    return part;
  }
  mesh("launcher_reload_recess", recess, dark);
  const doors = [-1, 1].map((side) => {
    const part = mesh(`launcher_hatch_${side}`, plate, armor);
    return { part, side };
  });
  const clamps = [-1, 1].map((side) => {
    const part = mesh(`launcher_clamp_${side}`, claw, armor);
    part.scale.x = side;
    part.position.set(side * 0.14, 0.2, 0);
    return { part, side };
  });
  const round = createHawaiiVehicleModel("attack_torpedo", 1);
  round.name = "launcher_loaded_torpedo";
  // 与世界弹体相同：局部Z=0是弹鼻，弹身在后方，不能改共享几何。
  for (const part of round.children) part.position.z += 0.5;
  round.traverse((part) => {
    if (part.isMesh) part.userData.keepSeparate = true;
  });
  group.add(round);
  const state = { open: 0, loaded: true, reload: 1 };
  let age = Infinity,
    disposed = false;
  function update(dt = 0) {
    if (disposed) return state;
    age += Math.max(0, dt);
    // 图鉴单位模型按12m展示；实景读取成长后的实际缩放。
    const length = root.userData.length > 1 ? root.scale.x : 12;
    const unit = mechanicalTorpedoVisualLength(length) / length;
    group.scale.setScalar(unit);
    // 挂架上沿嵌入真实腹部表面，弹体与下颌/胸鳍保持间隙。
    muzzle.position.set(0, -0.086 - 0.24 * unit, -0.19 - unit * 0.5);
    const opening = THREE.MathUtils.smoothstep(age, 0.08, 0.32);
    const closing = THREE.MathUtils.smoothstep(age, 1.42, 1.82);
    const open = opening * (1 - closing);
    const lowered = THREE.MathUtils.smoothstep(age, 0.42, 1.42);
    for (const { part, side } of doors)
      part.position.set(side * (0.075 + open * 0.14), 0.265, 0.5);
    for (const { part, side } of clamps) part.rotation.z = side * open * 0.62;
    // 新弹先藏在腹甲后，由同一实例连续降出；不淡入、不凭空放大。
    round.visible = age >= 0.42;
    round.position.y = (1 - lowered) * 0.4;
    state.open = open;
    state.reload = lowered;
    state.loaded = closing === 1;
    return state;
  }
  update();
  return {
    update,
    prepareMaterials: round.userData.prepareMaterials,
    fire() {
      age = 0;
      update();
    },
    reset() {
      age = Infinity;
      update();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      round.userData.disposeLocalMotion();
      group.removeFromParent();
    },
  };
}
