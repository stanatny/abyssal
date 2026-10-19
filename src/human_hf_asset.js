import { createMaterialPreparation } from "./material_loading.js";
import * as THREE from "three";
import swimmer_male from "./assets/models/swimmer_male_hf_mesh.json" with { type: "json" };
import swimmer_female from "./assets/models/swimmer_female_hf_mesh.json" with { type: "json" };
import diver_male from "./assets/models/diver_male_hf_mesh.json" with { type: "json" };
import diver_female from "./assets/models/diver_female_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
const data = { swimmer_male, swimmer_female, diver_male, diver_female };
const urls = {
  swimmer_male: new URL(
    "./assets/models/swimmer_male_hf_color.webp",
    import.meta.url,
  ),
  swimmer_female: new URL(
    "./assets/models/swimmer_female_hf_color.webp",
    import.meta.url,
  ),
  diver_male: new URL(
    "./assets/models/diver_male_hf_color.webp",
    import.meta.url,
  ),
  diver_female: new URL(
    "./assets/models/diver_female_hf_color.webp",
    import.meta.url,
  ),
};
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
/** 按实际新人物的肩肘、髋膝位置拟合原有十五骨骼接口；不改自由泳/潜水动作时钟。 */
export function humanHfAsset(kind, sex) {
  const key = `${kind}_${sex}`,
    diver = kind === "diver",
    female = sex === "female";
  const shoulder = female ? 0.095 : 0.105,
    elbow = female ? 0.235 : 0.25,
    wrist = female ? 0.37 : 0.4,
    shoulderZ = diver && female ? -0.32 : -0.3;
  const ankleZ = diver ? 0.365 : female ? 0.452 : 0.46;
  const world = [
    ["pelvis", -1, [0, 0, 0]],
    ["chest", 0, [0, 0, -0.14]],
    ["head", 1, [0, 0, diver ? -0.405 : -0.36]],
  ];
  const boneDefinitions = world.map(([n, parent, p]) => [
    n,
    parent,
    parent < 0 ? p : p.map((v, a) => v - world[parent][2][a]),
  ]);
  const bindRotations = {};
  for (const side of [-1, 1]) {
    const name = side < 0 ? "left" : "right",
      i = boneDefinitions.length;
    boneDefinitions.push(
      [`${name}_shoulder`, 1, [side * shoulder, 0.025, shoulderZ + 0.14]],
      [`${name}_elbow`, i, [0, 0, elbow - shoulder]],
      [`${name}_wrist`, i + 1, [0, 0, wrist - elbow]],
    );
    bindRotations[i] = [0, (side * Math.PI) / 2, 0];
  }
  for (const side of [-1, 1]) {
    const name = side < 0 ? "left" : "right",
      i = boneDefinitions.length,
      hip = 0.015,
      knee = 0.215,
      ankle = ankleZ;
    boneDefinitions.push(
      [`${name}_hip`, 0, [side * 0.072, 0.015, hip]],
      [`${name}_knee`, i, [side * 0.018, 0.015, knee - hip]],
      [
        `${name}_ankle`,
        i + 1,
        [side * 0.009, diver ? 0.005 : -0.015, ankle - knee],
      ],
    );
  }
  const bind = (x, y, z, ids, w, o) => {
    const side = x < 0 ? -1 : 1,
      arm = side < 0 ? 3 : 6,
      leg = side < 0 ? 9 : 12;
    const chest = smooth(0.025, 0.2, -z),
      head = smooth(0.32, 0.37, -z);
    ids[o] = 0;
    ids[o + 1] = 1;
    ids[o + 2] = 2;
    w[o] = 1 - chest;
    w[o + 1] = chest * (1 - head);
    w[o + 2] = chest * head;
    // 保留原始连续肩袖，按真实T姿的躯干/上臂/前臂渐变，不裁开接球。
    const armBlend =
      smooth(shoulder - 0.035, shoulder + 0.065, Math.abs(x)) *
      (1 - smooth(0.06, 0.13, Math.abs(z - shoulderZ))) *
      (1 - smooth(0.09, 0.14, y));
    if (armBlend > 0) {
      const t = smooth(elbow - 0.035, elbow + 0.035, Math.abs(x)),
        u = smooth(wrist - 0.025, wrist + 0.025, Math.abs(x));
      ids[o] = 1;
      ids[o + 1] = arm;
      ids[o + 2] = arm + 1;
      ids[o + 3] = arm + 2;
      w[o] = 1 - armBlend;
      w[o + 1] = armBlend * (1 - t);
      w[o + 2] = armBlend * t * (1 - u);
      w[o + 3] = armBlend * t * u;
      return;
    }
    const hip = 0.015,
      knee = 0.215,
      ankle = ankleZ;
    if (z > hip - 0.025) {
      const blend = smooth(hip - 0.025, hip + 0.035, z);
      let a = leg,
        b = leg + 1,
        t = smooth(knee - 0.04, knee + 0.04, z);
      if (z > knee + 0.04) {
        a = leg + 1;
        b = leg + 2;
        t = smooth(ankle - 0.025, ankle + 0.025, z);
      }
      ids[o] = 0;
      ids[o + 1] = a;
      ids[o + 2] = b;
      w[o] = 1 - blend;
      w[o + 1] = blend * (1 - t);
      w[o + 2] = blend * t;
      if (z > ankle + 0.025) {
        ids[o] = leg + 2;
        w[o] = 1;
        w[o + 1] = w[o + 2] = 0;
      }
    }
  };
  const geometry = decodeOrganicMesh(data[key], bind, (x, y, z, c) => {
    c.set(
      diver
        ? 0x273d43
        : !female && z > 0.01 && z < 0.15
          ? 0x9c4636
          : female && z > -0.34 && z < 0.15
            ? 0x305967
            : 0xb58c73,
    );
  });

  // 前伸手臂和伸直脚蹼后，整体统一归一到既有最大姿态包络。
  geometry.scale(0.94, 0.94, 0.94);
  for (const definition of boneDefinitions)
    definition[2] = definition[2].map((v) => v * 0.94);
  const groups = { body: [], equipment: [], lens: [] },
    p = geometry.attributes.position;
  for (let i = 0; i < geometry.index.count; i += 3) {
    const v = [
        geometry.index.array[i],
        geometry.index.array[i + 1],
        geometry.index.array[i + 2],
      ],
      x = v.reduce((a, n) => a + p.getX(n), 0) / 3,
      y = v.reduce((a, n) => a + p.getY(n), 0) / 3,
      z = v.reduce((a, n) => a + p.getZ(n), 0) / 3;
    const lens =
      z < (diver ? -0.405 : -0.39) &&
      z > -0.455 &&
      y < (diver ? 0 : -0.035) &&
      Math.abs(x) < 0.052;
    const gear = diver
      ? z > 0.32 ||
        (y > 0.04 && z < -0.04 && z > -0.46) ||
        (y < -0.04 && z < -0.06 && z > -0.43)
      : (z > 0.01 && z < 0.15 && Math.abs(x) < 0.12) ||
        (z < -0.39 && y < -0.025);
    groups[lens ? "lens" : gear ? "equipment" : "body"].push(...v);
  }
  const materials = ["body", "equipment", "lens"].map((name) => {
    const m = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: name === "lens" ? 0.33 : 0.72,
      metalness: 0,
    });
    m.name = `${key}_hf_${name}`;
    return m;
  });
  const parts = Object.entries(groups).map(([name, index], i) => {
    if (!index.length)
      throw Error(`Missing semantic human surface ${key}/${name}`);
    const g = new THREE.BufferGeometry();
    for (const [n, a] of Object.entries(geometry.attributes))
      g.setAttribute(n, a);
    g.setIndex(index);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return { name, geometry: g, material: materials[i] };
  });
  const prepare = createMaterialPreparation(
    [
      {
        name: "color",
        url: urls[key],
        colorSpace: THREE.SRGBColorSpace,
        apply(texture) {
          for (const m of materials) {
            m.map = texture;
            m.vertexColors = false;
            m.needsUpdate = true;
          }
        },
      },
    ],
    (ready) => {
      for (const m of materials) m.userData.texturesReady = ready;
    },
  );
  return {
    parts,
    boneDefinitions,
    bindRotations,
    references: 0,
    prepare,
    dispose: prepare.dispose,
  };
}
