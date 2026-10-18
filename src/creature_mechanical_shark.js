import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { addFeedingMouth } from "./player_motion.js";
import { createMechanicalSharkRig } from "./mechanical_shark_asset.js";
import { addMechanicalHardware } from "./mechanical_shark_hardware.js";
import { poseSharkPectorals } from "./shark_swim_motion.js";
import conduits from "./assets/models/mechanical_shark_conduits.json" with { type: "json" };

/**
 * HF重建的钛甲鲨：独立尾部/颌/胸鳍骨架，既有出口与双推进器特效。
 * @param {THREE.Group} root 单位全长、头朝-Z的角色根节点。
 * @param {Function[]} motions 由角色现有平滑时钟驱动，不移动游戏根节点。
 * @returns {void} 安装共享装甲、实例动作与口部/发射口接口。
 */
export function buildMechanicalShark(root, motions) {
  const { body, bones } = createMechanicalSharkRig(root),
    torso = bones[0],
    jaw = bones[4];
  addMechanicalHardware(root, bones, motions);
  addFeedingMouth(root, jaw, [0, 0.021, -0.154]);
  const muzzle = new THREE.Object3D();
  muzzle.name = "ventral_torpedo_exit";
  muzzle.position.set(0, -0.066, -0.465 - torso.position.z);
  torso.add(muzzle);
  const housing = new THREE.Mesh(PORT, STEEL);
  housing.name = "ventral_launcher_collar";
  muzzle.add(housing);
  root.userData.getTorpedoMuzzle = (out) => muzzle.getWorldPosition(out);
  const detail = new THREE.Mesh(energyGeometry(), ENERGY);
  detail.name = "armored_energy_conduits";
  detail.position.z = -torso.position.z;
  torso.add(detail);
  const flames = [-1, 1].map((side) => {
    const flame = new THREE.Mesh(PLUME, plumeMaterial());
    flame.name = "thruster_plume";
    flame.position.set(side * 0.094, 0.001, 0.119 - torso.position.z);
    flame.userData.keepSeparate = true;
    flame.userData.noShadow = true;
    flame.visible = false;
    torso.add(flame);
    return flame;
  });
  const flash = new THREE.Mesh(
    FLASH,
    new THREE.MeshBasicMaterial({
      color: 0x9ef6ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  flash.name = "torpedo_launch_flash";
  flash.userData.keepSeparate = true;
  flash.userData.noShadow = true;
  flash.visible = false;
  muzzle.add(flash);
  let launch = 0,
    disposed = false;
  root.userData.triggerLaunch = () => {
    if (!disposed) launch = 1;
  };
  const resetMotion = root.userData.resetMotion;
  root.userData.resetMotion = () => {
    launch = 0;
    resetMotion?.();
  };
  root.userData.normalizedLength = 1;
  root.userData.mechanicalAnatomy = {
    source: "Microsoft TRELLIS.2-4B",
    twinThrusters: 2,
    launchPort: "ventral_torpedo_exit",
    normalizedLength: 1,
  };
  root.userData.pose ||= {};
  const pose = (root.userData.pose.mechanical = {});
  const fins = [
    [-1, bones[5]],
    [1, bones[6]],
  ];
  motions.push((phase, effort, state = {}) => {
    if (disposed) return;
    const boost = state.boost || 0,
      power = state.power ?? 0.25,
      turn = state.turn || 0;
    // 护甲前躯保持稳定，尾波只经过真实后部铰接段，尾鳍整体跟随末端骨骼。
    const stroke = 0.06 + power * 0.055 + boost * 0.008;
    bones[1].rotation.y = Math.sin(phase - 0.55) * stroke - turn * 0.07;
    bones[2].rotation.y = Math.sin(phase - 1.1) * stroke;
    bones[3].rotation.y = Math.sin(phase - 1.55) * stroke * 0.75;
    torso.rotation.z = -turn * 0.13;
    poseSharkPectorals(fins, phase, state, 0.9);
    launch *= Math.exp(-(state.dt || 0) * 11);
    jaw.rotation.x = -(state.feed || 0) * 0.16;
    for (const [i, flame] of flames.entries()) {
      flame.visible = boost > 0.015;
      flame.material.uniforms.power.value = boost;
      flame.material.uniforms.phase.value = phase * 7 + i * 2.1;
      flame.scale.set(1, 1, 0.5 + boost * 0.7);
    }
    flash.visible = launch > 0.015;
    flash.material.opacity = launch * 0.7;
    flash.scale.set(1 + launch * 1.1, 1 + launch * 1.1, 1 + launch * 2);
    Object.assign(pose, {
      tailYaw: bones[1].rotation.y,
      boost,
      launch,
      plumes: boost > 0.015 ? 2 : 0,
    });
  });
  root.userData.disposeMechanical = root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    flames.forEach((f) => {
      f.visible = false;
      f.material.dispose();
    });
    flash.visible = false;
    flash.material.dispose();
    body.skeleton.dispose();
  };
}

const ENERGY = new THREE.MeshStandardMaterial({
  color: 0x258bb5,
  emissive: 0x087dcc,
  emissiveIntensity: 1.8,
  metalness: 0.35,
  roughness: 0.3,
});
const STEEL = new THREE.MeshStandardMaterial({
  color: 0x536573,
  metalness: 0.75,
  roughness: 0.36,
});
const PORT = new THREE.CylinderGeometry(0.014, 0.016, 0.038, 20, 1, true)
  .rotateX(Math.PI / 2)
  .translate(0, 0, 0.017);
const FLASH = new THREE.SphereGeometry(0.011, 12, 8);
const PLUME = new THREE.ConeGeometry(0.018, 0.24, 20, 10, true)
  .rotateX(Math.PI / 2)
  .translate(0, 0, 0.12);
let energy;
function energyGeometry() {
  if (energy) return energy;
  const pieces = [];
  for (const side of [-1, 1]) {
    const ring = new THREE.TorusGeometry(0.018, 0.0015, 6, 28);
    ring.translate(side * 0.094, 0.001, 0.118);
    pieces.push(ring);
    for (const curve of conduits.curves.filter(
      (curve) => Math.sign(curve.points[0][0]) === side,
    )) {
      const points = curve.points.map((p) => new THREE.Vector3(...p));
      const path = new THREE.CurvePath();
      for (let i = 1; i < points.length; i++)
        path.add(new THREE.LineCurve3(points[i - 1], points[i]));
      pieces.push(
        new THREE.TubeGeometry(path, points.length, curve.radius, 4, false),
      );
    }
  }
  const port = new THREE.TorusGeometry(0.012, 0.002, 6, 24);
  port.translate(0, -0.066, -0.465);
  pieces.push(port);
  energy = mergeGeometries(pieces);
  pieces.forEach((g) => g.dispose());
  return energy;
}
function plumeMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: { phase: { value: 0 }, power: { value: 0 } },
    vertexShader: `varying vec3 vP; varying vec2 vUv; uniform float phase;
      void main(){vP=position;vUv=uv;vec3 p=position;float q=clamp(p.z/.24,0.,1.);p.x+=sin(q*15.-phase)*.002*q;p.y+=cos(q*18.-phase)*.002*q;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `varying vec3 vP;varying vec2 vUv;uniform float power;uniform float phase;
      void main(){float t=clamp(vP.z/.24,0.,1.);float rings=.72+.28*cos(t*48.-phase);float core=pow(1.-abs(vUv.x*2.-1.),2.);vec3 color=mix(vec3(.18,.48,1.),vec3(.65,1.,1.2),core*(1.-t));float alpha=power*(1.-smoothstep(.1,1.,t))*.72*rings;gl_FragColor=vec4(color,alpha);}`,
  });
}
