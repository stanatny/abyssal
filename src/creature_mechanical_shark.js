import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { addFeedingMouth } from "./player_motion.js";
import {
  createMechanicalSharkRig,
  prepareMechanicalSharkMaterials,
} from "./mechanical_shark_asset.js";
import {
  addMechanicalHardware,
  MECHANICAL_JETS,
  MECHANICAL_JET_BONE,
  MECHANICAL_JET_YAWS,
  MECHANICAL_ENERGY as ENERGY,
  placeMechanicalPart,
} from "./mechanical_shark_hardware.js";
import { poseSharkPectorals } from "./shark_swim_motion.js";

/**
 * HF重建的钛甲鲨：独立尾部/颌/胸鳍骨架，既有出口与双推进器特效。
 * @param {THREE.Group} root 单位全长、头朝-Z的角色根节点。
 * @param {Function[]} motions 由角色现有平滑时钟驱动，不移动游戏根节点。
 * @returns {void} 安装共享装甲、实例动作与口部/发射口接口。
 */
export function buildMechanicalShark(root, motions) {
  root.userData.prepareMaterials = prepareMechanicalSharkMaterials;
  prepareMechanicalSharkMaterials({ priority: 10 });
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
  detail.name = "recessed_energy_apertures";
  detail.position.z = -torso.position.z;
  torso.add(detail);
  const flames = MECHANICAL_JETS.map((location, index) => {
    const flame = new THREE.Mesh(PLUME, plumeMaterial());
    flame.name = "thruster_plume";
    placeMechanicalPart(root, flame, bones[MECHANICAL_JET_BONE], location);
    flame.rotation.y = MECHANICAL_JET_YAWS[index];
    flame.userData.keepSeparate = true;
    flame.userData.noShadow = true;
    flame.visible = false;
    return flame;
  });
  const flash = new THREE.Mesh(
    FLASH,
    new THREE.MeshBasicMaterial({
      color: 0xffdaa6,
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
    const stroke = 0.06 + power * 0.055 + boost * 0.02;
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
      flame.scale.set(1.25, 1.25, 0.5 + boost * 0.7);
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

const STEEL = new THREE.MeshStandardMaterial({
  color: 0x696764,
  metalness: 0.75,
  roughness: 0.36,
});
// 短矩形喉口贴合下颌护甲，发射锚点保持原契约，不形成悬空长管。
const opening = new THREE.Shape();
opening.moveTo(-0.019, -0.008);
opening.lineTo(0.019, -0.008);
opening.lineTo(0.016, 0.008);
opening.lineTo(-0.016, 0.008);
opening.closePath();
const throat = new THREE.Path();
throat.moveTo(-0.012, -0.0045);
throat.lineTo(-0.01, 0.0045);
throat.lineTo(0.01, 0.0045);
throat.lineTo(0.012, -0.0045);
throat.closePath();
opening.holes.push(throat);
const PORT = new THREE.ExtrudeGeometry(opening, {
  depth: 0.016,
  bevelEnabled: true,
  bevelThickness: 0.0015,
  bevelSize: 0.0015,
  bevelSegments: 1,
  steps: 1,
});
const FLASH = new THREE.SphereGeometry(0.011, 12, 8);
// 外层蓝焰与短白芯合并为同一个几何/绘制，喷口处半径仍贴合原出口。
const plumeShells = [
  [0.018, 0.6, 0],
  [0.0085, 0.43, 1],
].map(([radius, length, core]) => {
  const g = new THREE.ConeGeometry(radius, length, 16, 8, true)
    .rotateX(Math.PI / 2)
    .translate(0, 0, length / 2);
  g.setAttribute(
    "flameCore",
    new THREE.Float32BufferAttribute(
      new Float32Array(g.attributes.position.count).fill(core),
      1,
    ),
  );
  return g;
});
const PLUME = mergeGeometries(plumeShells);
plumeShells.forEach((g) => g.dispose());
let energy;
function energyGeometry() {
  if (energy) return energy;
  const pieces = [];
  // 两侧嵌入式传感器保持小面积，避免高亮涂装遮住实体装甲。
  for (const side of [-1, 1]) {
    const points = [
      [0.039, 0.012, -0.439],
      [0.044, 0.018, -0.425],
      [0.049, 0.022, -0.414],
    ].map(([x, y, z]) => new THREE.Vector3(side * x, y, z));
    const path = new THREE.CurvePath();
    for (let i = 1; i < points.length; i++)
      path.add(new THREE.LineCurve3(points[i - 1], points[i]));
    pieces.push(new THREE.TubeGeometry(path, 12, 0.0015, 4, false));
  }
  const port = new THREE.BoxGeometry(0.021, 0.0015, 0.0015);
  port.translate(0, -0.061, -0.467);
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
    vertexShader: `varying float vT; varying float vCore; varying vec3 vView;
      varying vec3 vStart; varying vec3 vEnd; varying float vRadius;
      attribute float flameCore; uniform float phase;
      void main(){
        vCore=flameCore;float span=mix(.60,.43,flameCore);
        vT=clamp(position.z/span,0.,1.);vec3 p=position;
        float expansion=1.+.65*sin(vT*3.14159);
        p.xy*=expansion;
        p.x+=sin(vT*12.-phase)*.0015*vT;
        p.y+=cos(vT*14.-phase)*.0015*vT;
        vec4 mv=modelViewMatrix*vec4(p,1.);vView=-mv.xyz;
        vStart=(modelViewMatrix*vec4(0.,0.,0.,1.)).xyz;
        vEnd=(modelViewMatrix*vec4(0.,0.,span,1.)).xyz;
        vRadius=length((modelViewMatrix*vec4(mix(.018,.0085,flameCore),0.,0.,0.)).xyz)
          *max(.015,(1.-vT)*expansion);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: `varying float vT;varying float vCore;varying vec3 vView;
      varying vec3 vStart;varying vec3 vEnd;varying float vRadius;
      uniform float power;uniform float phase;
      void main(){
        // 光栅插值可能略微超出顶点端点；负底数的分数幂会产生NaN并污染辉光。
        float t=clamp(vT,0.,1.);
        float flow=.94+.06*cos(t*27.-phase);
        // 后方平视时不能因法线与视线近乎垂直而把整束尾焰抹掉。
        vec3 ray=normalize(-vView),axis=normalize(vEnd-vStart);
        vec3 across=cross(ray,axis);float side=length(across);
        float distance=side>.01?abs(dot(vStart,across))/side:length(cross(vStart,ray));
        float edge=1.-smoothstep(.10,1.,distance/max(.00001,vRadius));
        float fade=pow(max(0.,1.-t),.85)*(1.-smoothstep(.80,1.,t));
        vec3 halo=mix(vec3(.14,.44,.95),vec3(.48,.80,1.15),1.-t);
        vec3 color=mix(halo,vec3(.80,1.05,1.2),vCore);
        float alpha=power*fade*flow*edge*mix(.60,.72,vCore);
        gl_FragColor=vec4(color,alpha);
      }`,
  });
}
