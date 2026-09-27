import * as THREE from "three";
import { WORLD } from "./world_config.js";

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
    text: "身穿泳衣的成年游泳者在浅滩活动，接触可自动捕食。",
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
    text: "佩戴面镜、氧气瓶和脚蹼的成年潜水员。潜艇被撞破后，也会有潜水员分散游出。",
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
 * @returns {THREE.Group} 含 animate(time)、dispose() 的有限资源模型。
 */
export function createHumanModel(kind, length = 1) {
  const root = new THREE.Group();
  root.name = kind;
  const resources = new Set();
  const keep = (resource) => (resources.add(resource), resource);
  const sphere = keep(new THREE.SphereGeometry(1, 12, 8));
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
  if (kind === "swimmer" || kind === "diver") {
    const skin = "#cf9a79",
      suit = kind === "diver" ? "#263844" : "#dc634d";
    part(sphere, suit, [0.12, 0.075, 0.22], [0, 0, -0.02]);
    part(sphere, skin, [0.075, 0.073, 0.082], [0, 0.015, -0.32]);
    if (kind === "swimmer") {
      part(sphere, "#e5d9ca", [0.077, 0.045, 0.071], [0, 0.062, -0.32]);
      part(sphere, skin, [0.113, 0.078, 0.105], [0, 0, -0.13]);
    } else {
      part(box, "#63d9de", [0.13, 0.035, 0.05], [0, 0.058, -0.354]);
      part(sphere, "#d1b459", [0.056, 0.06, 0.19], [0, 0.12, 0.025]);
      part(box, "#171f28", [0.15, 0.02, 0.027], [0, 0.081, -0.12]);
    }
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.105, 0, -0.15);
      root.add(arm);
      part(
        sphere,
        kind === "diver" ? suit : skin,
        [0.037, 0.038, 0.18],
        [side * 0.04, 0, 0.075],
        arm,
      );
      arm.rotation.y = side * 0.35;
      const leg = new THREE.Group();
      leg.position.set(side * 0.055, 0, 0.15);
      root.add(leg);
      part(
        sphere,
        kind === "diver" ? suit : skin,
        [0.048, 0.043, 0.19],
        [0, 0, 0.15],
        leg,
      );
      if (kind === "diver")
        part(box, "#f5ce65", [0.1, 0.025, 0.14], [0, 0, 0.33], leg);
      animated.push({ arm, leg, side });
    }
  } else if (kind === "submarine") {
    part(sphere, "#b69852", [0.16, 0.15, 0.5], [0, 0, 0]);
    part(sphere, "#213f50", [0.12, 0.09, 0.24], [0, 0.105, -0.1]);
    part(box, "#cdbb83", [0.09, 0.12, 0.15], [0, 0.2, -0.03]);
    part(box, "#889ba0", [0.015, 0.14, 0.016], [0, 0.3, -0.03]);
    for (const side of [-1, 1]) {
      part(box, "#b5a472", [0.18, 0.022, 0.14], [side * 0.15, -0.015, 0.24]);
      part(
        sphere,
        "#8dedf2",
        [0.023, 0.035, 0.05],
        [side * 0.153, 0.03, -0.19],
        root,
        true,
      );
    }
    part(box, "#a9a075", [0.025, 0.18, 0.13], [0, 0.075, 0.4]);
    const propeller = new THREE.Group();
    propeller.position.z = 0.52;
    root.add(propeller);
    for (let i = 0; i < 3; i++) {
      const blade = part(
        box,
        "#495761",
        [0.04, 0.2, 0.02],
        [0, 0, 0],
        propeller,
      );
      blade.rotation.z = (i * Math.PI) / 3;
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
  root.scale.setScalar(length);
  root.userData.kind = kind;
  root.userData.length = length;
  root.userData.animate = (time) => {
    for (const item of animated) {
      if (item.arm) {
        item.arm.rotation.x = Math.sin(time * 2.6 + item.side) * 0.32;
        item.leg.rotation.x = Math.sin(time * 3.4 + item.side * 1.6) * 0.25;
      }
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
