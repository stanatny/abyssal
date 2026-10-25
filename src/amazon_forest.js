import { createAmazonArboreal } from "./amazon_arboreal.js";
import { createAmazonCanopySteps } from "./amazon_canopy.js";
import { acquireAmazonRoot, bendAmazonRoot } from "./amazon_root_asset.js";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { amazonChannels, amazonSurfaceHeight } from "./amazon_config.js";
import { addSurfaceDetail } from "./ocean_visuals.js";

/** 分块雨林、板根和淹没木材；资源归地图所有，动画仅更新共享时间。 */
export function* createAmazonForestSteps(parent, resources, colliders) {
  const keep = (r) => (resources.add(r), r);
  const root = new THREE.Group();
  root.name = "amazon_rainforest";
  parent.add(root);
  const leaf = keep(
    new THREE.MeshStandardMaterial({
      color: "#427633",
      roughness: 0.81,
      side: THREE.DoubleSide,
    }),
  );
  const time = { value: 0 };
  const baseCompile = leaf.onBeforeCompile;
  leaf.onBeforeCompile = (shader) => {
    baseCompile?.(shader);
    shader.uniforms.forestTime = time;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float forestTime;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.x += sin(forestTime * 0.8 + position.z * 0.2) * 0.17 * max(0.0, position.y - 12.0);",
      );
  };
  leaf.customProgramCacheKey = () => "amazon_canopy_v2";
  const underParts = [];
  for (let i = 0; i < 26; i++) {
    const g = broadLeafGeometry(4.8, 1.15);
    g.rotateX(-0.65 + (i % 3) * 0.13);
    g.rotateY(i * 2.399);
    g.translate(
      Math.cos(i * 1.3) * 4,
      0.4 + (i % 4) * 0.7,
      Math.sin(i * 1.3) * 4,
    );
    underParts.push(g);
  }
  const understory = keep(mergeGeometries(underParts));
  underParts.forEach((g) => g.dispose());
  const { chunks, trees, assets } = yield* createAmazonCanopySteps(
    root,
    resources,
    time,
    understory,
    leaf,
  );
  const arboreal = createAmazonArboreal(root, trees, assets, resources);
  const submerged = new THREE.Group();
  submerged.name = "flooded_buttress_roots";
  root.add(submerged);
  const roots = acquireAmazonRoot("buttress");
  keep({ dispose: roots.release });
  submerged.userData.prepareMaterials = roots.prepare;
  void roots.prepare();
  const rootParts = [],
    rockParts = [];
  const rockMaterial = keep(
    new THREE.MeshStandardMaterial({ color: "#8f7251", roughness: 0.96 }),
  );
  addSurfaceDetail(rockMaterial, "stone", 0.7);
  for (let index = 0; index < 28; index++) {
    const z = -185 - index * 39;
    for (const channel of amazonChannels(z)) {
      const edge =
        channel.center + (index % 2 ? 1 : -1) * channel.halfWidth * 1.02;
      const ground = amazonSurfaceHeight(edge, z);
      const start = new THREE.Vector3(
        edge + (index % 2 ? 7 : -7),
        Math.max(8, ground) + 4,
        z,
      );
      const points = [
        start,
        new THREE.Vector3(edge, Math.max(3, ground) - 3, z - 7),
        new THREE.Vector3(
          edge + (index % 2 ? -10 : 10),
          Math.max(-24, ground - 20),
          z - 14,
        ),
      ];
      const curve = new THREE.CatmullRomCurve3(points);
      const g = bendAmazonRoot(roots.geometry, curve, 0.9 + (index % 3) * 0.3);
      rootParts.push(keep(g));
      let previous = curve.getPoint(0);
      for (let i = 1; i <= 8; i++) {
        const point = curve.getPoint(i / 8);
        colliders.push({
          type: "capsule",
          kind: "flooded_root",
          a: previous.clone(),
          b: point.clone(),
          radius: 1.0 + (index % 3) * 0.3,
        });
        previous = point;
      }
      // 礁状河石只沿坡脚出现，主河道保持宽敞。
      const rock = new THREE.IcosahedronGeometry(1, 2);
      rock.scale(4 + (index % 4), 2.5, 5);
      rock.translate(edge, ground + 1, z + 9);
      rockParts.push(keep(rock));
      colliders.push({
        type: "ellipsoid",
        x: edge,
        y: ground + 1,
        z: z + 9,
        axes: { x: 4 + (index % 4), y: 2.5, z: 5 },
      });
    }
    if (index % 4 === 3) yield "flooded-roots";
  }
  for (const [parts, mat] of [
    [rootParts, roots.material],
    [rockParts, rockMaterial],
  ]) {
    const geometry = keep(mergeGeometries(parts));
    parts.forEach((g) => {
      g.dispose();
      resources.delete(g);
    });
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.name =
      parts === rootParts ? "riverbank_roots_hf" : "riverbank_root_rocks";
    submerged.add(mesh);
  }
  return {
    root,
    update(t, position, reducedMotion = false) {
      time.value = reducedMotion ? 0 : t;
      arboreal.update(t, position, reducedMotion);
      const distance = position.y > -8 ? 560 : 220;
      for (const chunk of chunks) {
        const range = Math.hypot(chunk.x - position.x, chunk.z - position.z);
        chunk.root.visible = range < distance;
        // 区块级远近实体共用落点；滞回防止边界反复切换，不新增逐帧矩阵上传。
        chunk.near = range < (chunk.near ? 190 : 160);
        if (chunk.levels.kapok) chunk.levels.kapok.visible = chunk.near;
        if (chunk.levels.kapokFar) chunk.levels.kapokFar.visible = !chunk.near;
      }
    },
    stats: {
      chunks: chunks.length,
      trees: trees.length,
      monkeys: arboreal.actors.length,
    },
  };
}

/** 带中脊、侧脉和下垂边缘的阔叶，不以圆球冒充树冠。 */
export function broadLeafGeometry(length = 1, width = 0.3) {
  const p = [],
    uv = [],
    index = [];
  for (let r = 0; r <= 10; r++) {
    const t = r / 10,
      half = Math.sin(Math.PI * t) * width;
    for (let s = 0; s < 3; s++) {
      p.push(
        (s - 1) * half,
        Math.sin(t * Math.PI) * 0.14 * length - Math.abs(s - 1) * half * 0.18,
        t * length,
      );
      uv.push(s * 0.5, t);
    }
  }
  for (let r = 0; r < 10; r++)
    for (let s = 0; s < 2; s++) {
      const i = r * 3 + s;
      index.push(i, i + 3, i + 1, i + 1, i + 3, i + 4);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}
