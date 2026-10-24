import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import sponge from "./assets/models/refuge_sponge_hf_mesh.json" with { type: "json" };
import starfish from "./assets/models/refuge_starfish_hf_mesh.json" with { type: "json" };
import snail from "./assets/models/refuge_snail_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

const entries = {
  sponge: [
    sponge,
    new URL("./assets/models/refuge_sponge_hf_color.webp", import.meta.url),
  ],
  starfish: [
    starfish,
    new URL("./assets/models/refuge_starfish_hf_color.webp", import.meta.url),
  ],
  snail: [
    snail,
    new URL("./assets/models/refuge_snail_hf_color.webp", import.meta.url),
  ],
};
const cache = new Map();
const smooth = THREE.MathUtils.smoothstep;

/** 按实际居民表面拟合局部关节；脚、足缘和躯干保持支撑，不能整个人摇离地面。 */
export function acquireMarianaResidentAsset(kind) {
  if (!entries[kind]) throw new TypeError(`Unknown refuge resident: ${kind}`);
  if (!cache.has(kind)) {
    const [packed, url] = entries[kind];
    const point = (u, v, w) =>
      [u, v, w].map(
        (a, i) => packed.min[i] + a * (packed.max[i] - packed.min[i]),
      );
    const joints =
      kind === "snail"
        ? [point(0.73, 0.33, 0.25), point(0.73, 0.33, 0.75)]
        : kind === "sponge"
          ? [point(0.24, 0.6, 0.38), point(0.77, 0.6, 0.38)]
          : [point(0.29, 0.47, 0.5), point(0.71, 0.47, 0.5)];
    const geometry = decodeOrganicMesh(
      packed,
      (x, y, z, ids, weights, o) => {
        const u = (x - packed.min[0]) / (packed.max[0] - packed.min[0]);
        const v = (y - packed.min[1]) / (packed.max[1] - packed.min[1]);
        const w = (z - packed.min[2]) / (packed.max[2] - packed.min[2]);
        let influence;
        if (kind === "snail")
          influence = smooth(u, 0.7, 0.8) * smooth(v, 0.31, 0.52);
        else if (kind === "sponge")
          influence =
            (u < 0.5 ? 1 - smooth(u, 0.1, 0.16) : smooth(u, 0.79, 0.86)) *
            smooth(v, 0.43, 0.55);
        else
          influence =
            smooth(Math.abs(u - 0.5), 0.23, 0.32) *
            smooth(v, 0.2, 0.33) *
            (1 - smooth(v, 0.68, 0.77));
        ids[o] = 0;
        weights[o] = 1 - influence;
        ids[o + 1] = (kind === "snail" ? w < 0.5 : u < 0.5) ? 1 : 2;
        weights[o + 1] = influence;
      },
      (_x, _y, _z, c) => c.set(0xc6b99c),
    );
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.82,
      metalness: 0,
    });
    material.name = `refuge_${kind}_hf`;
    const details = [];
    if (kind === "sponge") {
      // HF 漏掉了腰部白衬衫：重建有厚度的连接衣片，而非用平面遮挡断面。
      const shirt = new RoundedBoxGeometry(1.63, 0.31, 0.68, 3, 0.035);
      shirt.translate(-0.12, -0.48, -0.055);
      const cotton = new THREE.MeshStandardMaterial({
        color: 0xf4eee0,
        roughness: 0.9,
      });
      cotton.name = "refuge_sponge_cotton";
      details.push({ geometry: shirt, material: cotton });
      const tie = new THREE.OctahedronGeometry(0.09)
        .scale(1, 1.5, 0.4)
        .translate(-0.12, -0.48, 0.313);
      const red = new THREE.MeshStandardMaterial({
        color: 0xbb4541,
        roughness: 0.8,
      });
      red.name = "refuge_sponge_tie";
      details.push({ geometry: tie, material: red });
    }
    if (kind === "starfish") {
      // 统一 HF 身体与手臂的粉色底色，保留衣服/眼睛；不修改通用贴图加载器。
      material.onBeforeCompile = (shader) => {
        shader.vertexShader =
          "varying float vResidentHeight;\n" + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvResidentHeight=(position.y+1.1962315)/2.392463;",
        );
        shader.fragmentShader =
          "varying float vResidentHeight;\n" + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          float pinkMask = smoothstep(0.04,0.13,diffuseColor.r-diffuseColor.g) * smoothstep(-0.02,0.06,diffuseColor.r-diffuseColor.b);
          vec3 coral = vec3(0.855,0.337,0.352) * (0.94 + 0.10 * diffuseColor.r);
          float flowerMask=smoothstep(0.02,0.11,diffuseColor.b-diffuseColor.g);
          float shortsMask=smoothstep(0.205,0.23,vResidentHeight)*(1.0-smoothstep(0.293,0.31,vResidentHeight));
          diffuseColor.rgb = mix(diffuseColor.rgb,coral,pinkMask);
          diffuseColor.rgb = mix(diffuseColor.rgb,vec3(0.35,0.53,0.12),shortsMask*(1.0-flowerMask));
        `,
        );
      };
      material.customProgramCacheKey = () => "refuge-starfish-coral-v1";
      // 嘴沿真实脸部表面采样，不能成为悬浮贴片或穿入眼球。
      const surface = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
      );
      surface.updateMatrixWorld(true);
      const ray = new THREE.Raycaster(),
        points = [];
      for (let i = 0; i <= 24; i++) {
        const u = (i / 24 - 0.5) * 2,
          p = point(0.5 + u * 0.105, 0.615 + 0.035 * u * u, 1);
        ray.set(
          new THREE.Vector3(p[0], p[1], packed.max[2] + 1),
          new THREE.Vector3(0, 0, -1),
        );
        const hit = ray.intersectObject(surface, false)[0];
        if (!hit) throw new Error("Missing starfish facial surface");
        points.push(hit.point.clone().add(new THREE.Vector3(0, 0, 0.008)));
      }
      surface.material.dispose();
      const mouth = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        32,
        0.012,
        6,
        false,
      );
      const ink = new THREE.MeshStandardMaterial({
        color: 0x593336,
        roughness: 0.9,
      });
      ink.name = "refuge_starfish_smile";
      details.push({ geometry: mouth, material: ink });
    }
    for (const detail of details)
      if (!detail.geometry.index)
        detail.geometry.setIndex(
          Array.from(
            { length: detail.geometry.attributes.position.count },
            (_, i) => i,
          ),
        );
    const prepare = createMaterialPreparation(
      [
        {
          name: "color",
          url,
          colorSpace: THREE.SRGBColorSpace,
          apply(texture) {
            material.map = texture;
            material.vertexColors = false;
            material.needsUpdate = true;
          },
        },
      ],
      (ready) => {
        material.userData.texturesReady = ready;
      },
    );
    cache.set(kind, {
      geometry,
      material,
      prepare,
      joints,
      details,
      references: 0,
    });
  }
  const asset = cache.get(kind);
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
      for (const d of asset.details) {
        d.geometry.dispose();
        d.material.dispose();
      }
      if (cache.get(kind) === asset) cache.delete(kind);
    },
  };
}
