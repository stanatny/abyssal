import * as THREE from "three";
import { addSurfaceDetail } from "./ocean_visuals.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { WORLD } from "./world_config.js";
import { createArticulatedHuman } from "./human_models.js";

/** 图鉴与场景共用的成人、潜艇与鱼雷资料；人类角色全部为成年人。 */
export const HUMAN_CATALOG = Object.freeze([
  {
    id: "swimmer",
    kind: "swimmer",
    name: "成年游泳者",
    latin: "ADULT SWIMMER",
    category: "human",
    role: "浅滩活动",
    color: "#ffbb8c",
    length: 1.9,
    size: "1.9 m",
    habitat: "海面附近",
    ability: "浅滩游泳",
    text: "浅滩中男女成年游泳者均会出现；男性穿泳裤，女性穿连体泳衣，接触可自动捕食。",
    counter: "小型食物提供少量营养；体型变大后，应寻找更有营养的猎物。",
  },
  {
    id: "diver",
    kind: "diver",
    name: "成年潜水员",
    latin: "ADULT DIVER",
    category: "human",
    role: "水下探索",
    color: "#ffe18a",
    length: 2.4,
    size: "2.4 m",
    habitat: `${25 * WORLD.displayDepthScale}—${100 * WORLD.displayDepthScale} m / 潜艇周围`,
    ability: "潜水探索",
    text: "男女成年潜水员均会出现，佩戴面镜、氧气瓶和脚蹼。潜艇被撞破后，也会有男女潜水员分散游出。",
    counter: "刚逃出潜艇时有短暂保护；离开艇壳后再接近捕食。",
  },
  {
    id: "submarine",
    kind: "submarine",
    name: "深海潜艇",
    latin: "DEEP SEA SUBMARINE",
    category: "human",
    role: "可破坏载具",
    color: "#e1bd78",
    length: 18,
    size: "18 m",
    habitat: `${180 * WORLD.displayDepthScale}—${400 * WORLD.displayDepthScale} m`,
    ability: "耐压艇壳",
    text: "潜艇不能被直接吞食。角色达到8米后，以至少20米/秒的速度完成三次独立冲撞，才能破坏艇壳并释放三名潜水员。",
    counter: "每次撞击后需要离开艇壳再冲刺接近。贴着潜艇游动不会连续造成伤害。",
  },
  {
    id: "torpedo",
    kind: "torpedo",
    name: "接触鱼雷",
    latin: "CONTACT TORPEDO",
    category: "human",
    role: "深海危险物",
    color: "#ff826e",
    length: 3.6,
    size: "3.6 m",
    habitat: `${220 * WORLD.displayDepthScale}—${550 * WORLD.displayDepthScale} m`,
    ability: "接触爆炸",
    text: "带红色闪灯的危险鱼雷静止悬浮在深海。碰到后爆炸并消失，命中可造成28点生命损失；它不是食物。",
    counter: "留意红色警示环，侧向绕行。鱼雷不会主动追踪虎鲸。",
  },
]);

/**
 * 创建可复用的人类活动模型，头部朝向局部 -Z，length 使用世界长度。
 * @param {'swimmer'|'diver'|'submarine'|'torpedo'} kind 模型种类。
 * @param {number} length 目标总长。
 * @param {'male'|'female'} sex 成年人物外观，载具忽略此参数。
 * @returns {THREE.Group} 含 animate(time)、dispose() 的有限资源模型。
 */
export function createHumanModel(kind, length = 1, sex = "male") {
  if (kind === "swimmer" || kind === "diver")
    return createArticulatedHuman(kind, length, sex);
  const root = new THREE.Group();
  root.name = kind;
  const resources = new Set();
  const keep = (resource) => (resources.add(resource), resource);
  const sphere = keep(
    new THREE.SphereGeometry(
      1,
      kind === "submarine" ? 24 : 16,
      kind === "submarine" ? 16 : 10,
    ),
  );
  const box = keep(new THREE.BoxGeometry(1, 1, 1));
  const materials = {};
  function material(color, emissive = false) {
    const key = `${color}_${emissive}`;
    return (materials[key] ||= keep(
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.58,
        metalness: kind === "submarine" || kind === "torpedo" ? 0.4 : 0,
        emissive: emissive ? color : 0x000000,
        emissiveIntensity: emissive ? 1.5 : 0,
      }),
    ));
  }
  function part(
    geometry,
    color,
    scale,
    position,
    parent = root,
    emissive = false,
  ) {
    const mesh = new THREE.Mesh(geometry, material(color, emissive));
    mesh.scale.set(...scale);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  }
  const animated = [];
  if (kind === "submarine") {
    const shell = keep(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.001, -0.5),
          new THREE.Vector2(0.07, -0.47),
          new THREE.Vector2(0.125, -0.4),
          new THREE.Vector2(0.153, -0.3),
          new THREE.Vector2(0.158, -0.12),
          new THREE.Vector2(0.157, 0.2),
          new THREE.Vector2(0.126, 0.34),
          new THREE.Vector2(0.076, 0.43),
          new THREE.Vector2(0.025, 0.49),
          new THREE.Vector2(0.001, 0.5),
        ],
        32,
      ),
    );
    shell.rotateX(Math.PI / 2);
    shell.scale(1, 0.95, 1);
    const body = part(shell, "#c4a05b", [1, 1, 1], [0, 0, 0]);
    addSurfaceDetail(body.material, "metal", 8);
    // 压力壳接缝、检修舱与前观测窗都是视觉附着件，包络仍使用原艇壳。
    for (const z of [-0.28, -0.08, 0.14, 0.3]) {
      const radius = z === 0.3 ? 0.14 : 0.156;
      const band = keep(new THREE.TorusGeometry(radius, 0.0025, 5, 32));
      part(band, "#796f54", [1, 0.95, 1], [0, 0, z]);
    }
    const dome = part(
      sphere,
      "#14323c",
      [0.095, 0.069, 0.087],
      [0, 0.083, -0.36],
    );
    dome.material.roughness = 0.13;
    dome.material.metalness = 0.48;
    part(sphere, "#b6a374", [0.072, 0.057, 0.13], [0, 0.173, -0.03]);
    part(box, "#cbb880", [0.09, 0.075, 0.14], [0, 0.175, -0.03]);
    const hatch = keep(new THREE.CylinderGeometry(0.046, 0.046, 0.009, 20));
    part(hatch, "#565e5d", [1, 1, 1], [0, 0.231, -0.03]);
    const periscope = keep(new THREE.CylinderGeometry(0.006, 0.008, 0.12, 10));
    part(periscope, "#8e9996", [1, 1, 1], [0, 0.29, -0.03]);
    part(box, "#3b4d51", [0.018, 0.013, 0.034], [0, 0.35, -0.04]);
    for (const side of [-1, 1]) {
      part(box, "#b5a472", [0.18, 0.016, 0.12], [side * 0.15, -0.015, 0.24]);
      for (const z of [-0.19, -0.04, 0.11]) {
        const frame = keep(new THREE.TorusGeometry(0.023, 0.004, 6, 16));
        const framePart = part(
          frame,
          "#495459",
          [1, 1, 1],
          [side * 0.156, 0.025, z],
        );
        framePart.rotation.y = Math.PI / 2;
        const port = part(
          sphere,
          "#80c3c2",
          [0.003, 0.018, 0.018],
          [side * 0.159, 0.025, z],
        );
        port.material.roughness = 0.14;
      }
      const lamp = part(
        sphere,
        "#beddd0",
        [0.018, 0.023, 0.029],
        [side * 0.114, 0.035, -0.363],
        root,
        true,
      );
      lamp.material.emissiveIntensity = 1.1;
      part(
        box,
        "#525f5d",
        [0.018, 0.018, 0.47],
        [side * 0.135, -0.069, -0.025],
      );
    }
    part(box, "#a9a075", [0.018, 0.17, 0.12], [0, 0.075, 0.4]);
    const duct = keep(new THREE.TorusGeometry(0.07, 0.012, 8, 24));
    part(duct, "#58635f", [1, 1, 1], [0, 0, 0.49]);
    const propeller = new THREE.Group();
    propeller.position.z = 0.505;
    root.add(propeller);
    part(sphere, "#a59870", [0.018, 0.018, 0.022], [0, 0, 0], propeller);
    for (let i = 0; i < 5; i++) {
      const blade = part(
        sphere,
        "#a69266",
        [0.018, 0.065, 0.006],
        [0, 0, 0],
        propeller,
      );
      blade.rotation.z = (i * Math.PI * 2) / 5;
      blade.rotation.y = 0.32;
    }
    animated.push({ propeller });
  } else if (kind === "torpedo") {
    part(sphere, "#526679", [0.12, 0.12, 0.47], [0, 0, 0]);
    part(sphere, "#b54835", [0.115, 0.115, 0.16], [0, 0, -0.34]);
    const light = part(
      sphere,
      "#ff4c35",
      [0.06, 0.045, 0.1],
      [0, 0.12, -0.18],
      root,
      true,
    );
    for (let i = 0; i < 4; i++) {
      const fin = part(box, "#adb3aa", [0.025, 0.32, 0.15], [0, 0, 0.32]);
      fin.rotation.z = (i * Math.PI) / 2;
    }
    animated.push({ light });
  } else throw new Error(`Unknown human activity model: ${kind}`);
  batchVehicleParts(root, keep);
  root.scale.setScalar(length);
  root.userData.kind = kind;
  root.userData.length = length;
  root.userData.animate = (time) => {
    for (const item of animated) {
      if (item.propeller) item.propeller.rotation.z = time * 3;
      if (item.light)
        item.light.material.emissiveIntensity =
          0.6 + (Math.sin(time * 7) + 1) * 1.1;
    }
  };
  let disposed = false;
  root.userData.dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const resource of resources) resource.dispose();
    root.removeFromParent();
  };
  return root;
}

function batchVehicleParts(root, keep) {
  const groups = new Map();
  for (const child of root.children)
    if (child.isMesh) {
      if (!groups.has(child.material)) groups.set(child.material, []);
      groups.get(child.material).push(child);
    }
  for (const [material, children] of groups) {
    // 鱼雷闪灯材质仍由原对象引用驱动；合批共享同一个材质对象。
    const geometries = children.map((child) => {
      child.updateMatrix();
      const g = child.geometry.index
        ? child.geometry.toNonIndexed()
        : child.geometry.clone();
      g.applyMatrix4(child.matrix);
      g.deleteAttribute("uv");
      return g;
    });
    const geometry = keep(mergeGeometries(geometries));
    for (const g of geometries) g.dispose();
    for (const child of children) root.remove(child);
    root.add(new THREE.Mesh(geometry, material));
  }
}
