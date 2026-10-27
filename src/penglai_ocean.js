import {
  createPenglaiGardenAsset,
  createPenglaiLotusLeaf,
} from "./penglai_garden_asset.js";
import {
  addPenglaiSwordMonument,
  addPenglaiSectGate,
} from "./penglai_sword_sect.js";
import {
  addPenglaiTempleCourtyard,
  refineTemplePlaster,
} from "./penglai_temple_courtyard.js";
import { addPenglaiTempleDetails } from "./penglai_temple_details.js";
import { createPenglaiTemplePlaque } from "./penglai_calligraphy.js";
import {
  createPenglaiTempleAsset,
  createPenglaiTempleCarvings,
} from "./penglai_temple_asset.js";
import { createPenglaiGuardianLandmarks } from "./penglai_guardian_landmarks.js";
import { guardianLandmarkReserved } from "./penglai_landmark_sites.js";
import { createPenglaiBixi } from "./penglai_bixi.js";
import { terrainMeshHeight } from "./terrain_mesh_height.js";
import {
  PENGLAI_SUMMIT_ROUTES,
  besideSummitPath,
  applyPenglaiSummitPaths,
} from "./penglai_routes.js";
import { createPenglaiWard } from "./penglai_ward.js";
import { createPenglaiSkyIslands } from "./penglai_sky_islands.js";
import { createPenglaiSkyHazards } from "./penglai_sky_hazards.js";
import {
  PENGLAI_REWARD_HABITAT,
  penglaiRewardAnchor,
} from "./penglai_rewards.js";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  createPenglaiGroundMaterials,
  applyPenglaiGroundSurface,
} from "./penglai_ground_materials.js";
import {
  PENGLAI_WORLD as W,
  PENGLAI_PEAKS,
  PENGLAI_BOSS_INSTANCES,
  PENGLAI_DEEP_BASIN,
  PENGLAI_BIXI,
  penglaiHeightAt,
  penglaiBasinRadius,
} from "./penglai_config.js";
import {
  finishScenePreparation,
  prepareScene,
  constructionScope,
} from "./scene_preparation.js";
import { addSurfaceDetail } from "./ocean_visuals.js";

/** 山水、莲池、仙观与桃林一次构造，随后沿共享循环更新，不建立额外 RAF。 */
export function createPenglaiOcean(parent) {
  return finishScenePreparation(createPenglaiOceanSteps(parent));
}
export function createPenglaiOceanAsync(parent, options) {
  return prepareScene(createPenglaiOceanSteps(parent), options);
}
export function* createPenglaiOceanSteps(parent) {
  const root = new THREE.Group();
  root.name = "penglai_mountain_sanctuary";
  parent.add(root);
  const resources = new Set(),
    keep = (r) => (resources.add(r), r),
    scope = constructionScope(root, resources),
    colliders = [],
    buckets = new Map(),
    chunks = [],
    groundStrips = [];
  const mats = {},
    geo = {},
    time = { value: 0 };
  let disposed = false,
    ward,
    skyIslands,
    skyHazards,
    bixi,
    templePlaque;
  const material = (key, color, extra = {}) =>
    mats[key] ??
    (mats[key] = keep(
      new THREE.MeshStandardMaterial({ color, roughness: 0.82, ...extra }),
    ));
  const stone = material("stone", "#8da28a"),
    red = material("red", "#9d4c40"),
    roofmat = material("tile", "#2e5454", { side: THREE.DoubleSide }),
    gold = material("bronze", "#b29865", { metalness: 0.32, roughness: 0.47 }),
    wood = material("wood", "#4b5d50"),
    pink = material("blossom", "#e0a5b3"),
    leaf = material("leaf", "#587c43");
  for (const m of [stone, roofmat, wood])
    addSurfaceDetail(m, m === wood ? "wood" : "stone", 0.14);
  const geometry = (key, fn) => geo[key] ?? (geo[key] = keep(fn()));
  const box = geometry("box", () => new THREE.BoxGeometry(1, 1, 1)),
    sphere = geometry("sphere", () => new THREE.IcosahedronGeometry(1, 2)),
    column = geometry("column", () => new THREE.CylinderGeometry(1, 1, 1, 12));
  const transform = new THREE.Object3D();
  const crag = geometry("crag", () => {
    const g = new THREE.IcosahedronGeometry(1, 2),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      const n =
        0.86 +
        0.075 * Math.sin(x * 13 + z * 7) * Math.cos(y * 17) +
        0.035 * Math.sin(z * 23 + y * 9);
      p.setXYZ(i, x * n, y * n, z * n);
    }
    g.computeVertexNormals();
    return g;
  });
  function emit(g, m, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    const cx = Math.floor(x / 120),
      cz = Math.floor(z / 120),
      key = `${cx}_${cz}_${g.id}_${m.id}`;
    if (!buckets.has(key)) buckets.set(key, { g, m, cx, cz, matrices: [] });
    transform.position.set(x, y, z);
    transform.scale.set(sx, sy, sz);
    transform.rotation.set(rx, ry, rz);
    transform.updateMatrix();
    buckets.get(key).matrices.push(transform.matrix.clone());
  }
  function solidBox(kind, x, y, z, sx, sy, sz) {
    colliders.push({
      type: "box",
      kind,
      x,
      y,
      z,
      halfSize: { x: sx / 2, y: sy / 2, z: sz / 2 },
    });
  }
  const templeCarving = createPenglaiTempleCarvings(keep);
  const groundMaterials = createPenglaiGroundMaterials(keep);
  root.userData.prepareMaterials = groundMaterials.prepare;
  const dressedStone = material("pavilion_dressed_stone", "#a9aa9b", {
    roughness: 0.97,
  });
  applyPenglaiGroundSurface(dressedStone, groundMaterials, "masonry");
  const exposedRock = material("mountain_exposed_rock", "#96998b", {
    roughness: 1,
  });
  applyPenglaiGroundSurface(exposedRock, groundMaterials, "outcrop");
  const pavilionWood = material("pavilion_old_timber", "#624a35", {
    roughness: 0.85,
  });
  addSurfaceDetail(pavilionWood, "wood", 0.4);
  const dressedBlock = geometry(
    "pavilion_dressed_block",
    () => new RoundedBoxGeometry(1, 1, 1, 1, 0.018),
  );
  // 柱头承托到最终瓦顶的真实下表面；仅构建时采样，不改动每帧逻辑。
  function roofSupport(
    roofMesh,
    x,
    y,
    z,
    width,
    kind = "monastery_roof_support",
  ) {
    const side = roofMesh.material.side;
    roofMesh.material.side = THREE.DoubleSide;
    const hit = new THREE.Raycaster(
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(0, 1, 0),
      0,
      15,
    ).intersectObject(roofMesh)[0];
    roofMesh.material.side = side;
    if (!hit || hit.distance < 0.15) return;
    const height = hit.distance + 0.12;
    emit(box, wood, x, y + height / 2, z, width, height, width);
    solidBox(kind, x, y + height / 2, z, width, height, width);
  }
  function renderedGround(x, z) {
    const i = Math.max(
      0,
      Math.min(groundStrips.length - 1, Math.floor((z - W.minZ) / 80)),
    );
    return groundStrips[i]?.(x, z) ?? penglaiHeightAt(x, z);
  }
  let pavilionPillars;
  function pavilion(x, z, scale = 1, main = false) {
    const w = (main ? 88 : 25) * scale,
      d = (main ? 92 : 25) * scale,
      h = (main ? 27 : 17) * scale;
    let y = penglaiHeightAt(x, z);
    if (!main) {
      // 老的坡面亭址保留 XZ；平台抬到整个脚印的山面之上，石台逐格向坡面收脚。
      let highest = -Infinity;
      for (let i = 0; i <= 12; i++)
        for (let j = 0; j <= 12; j++)
          highest = Math.max(
            highest,
            renderedGround(
              x + (i / 12 - 0.5) * (w + 9),
              z + (j / 12 - 0.5) * (d + 9),
            ),
          );
      y = Math.max(y, highest - 2.8);
    }
    if (!main) {
      // 实体石台分块排砌，顶面保持完整水平，不叠加共面的装饰薄片。
      const sx = (w + 9) / 6,
        sz = (d + 9) / 6;
      for (let i = 0; i < 6; i++)
        for (let j = 0; j < 6; j++) {
          const xx = x + (i - 2.5) * sx,
            zz = z + (j - 2.5) * sz;
          let low = Infinity;
          for (const dx of [-sx / 2, 0, sx / 2])
            for (const dz of [-sz / 2, 0, sz / 2])
              low = Math.min(low, renderedGround(xx + dx, zz + dz));
          const bottom = Math.min(y, low - 0.25),
            height = y + 4 - bottom;
          // 外缘石墙分层露缝，内部只保留一块承重体；不把整面山墙做成无细节长柱。
          const courses =
            i === 0 || i === 5 || j === 0 || j === 5
              ? Math.ceil(height / 2.2)
              : 1;
          const courseHeight = height / courses;
          for (let k = 0; k < courses; k++)
            emit(
              dressedBlock,
              dressedStone,
              xx,
              bottom + (k + 0.5) * courseHeight,
              zz,
              sx - 0.035,
              courseHeight - 0.025,
              sz - 0.035,
            );
          if (bottom < y)
            solidBox(
              "pavilion_fitted_foundation",
              xx,
              (bottom + y) / 2,
              zz,
              sx,
              y - bottom,
              sz,
            );
        }
      if (!pavilionPillars) {
        pavilionPillars = createPenglaiTempleAsset("temple_pillar", keep);
        pavilionPillars.geometry.userData.prepareMaterials =
          pavilionPillars.prepare;
        pavilionPillars.geometry.userData.hfGardenKind = "pavilion_pillar";
      }
    }
    solidBox("monastery_platform", x, y + 2, z, w + 9, 4, d + 9);
    if (main) {
      const plaster = material("warm_plaster", "#bcb89d"),
        door = material("lacquer_door", "#67493c");
      addSurfaceDetail(plaster, "stone", 0.85);
      refineTemplePlaster(plaster, y);
      const panel = (kind, m, xp, yp, zp, sx, sy, sz) => {
        emit(box, m, xp, yp, zp, sx, sy, sz);
        solidBox(kind, xp, yp, zp, sx, sy, sz);
      };
      // 殿身是完整实体外壳：侧墙、后墙与闭合正门，柱廊仍保留在墙外。
      for (const side of [-1, 1]) {
        panel(
          "monastery_side_wall",
          plaster,
          x + side * (w / 2 - 9),
          y + 4 + h * 0.46,
          z,
          2.4,
          h * 0.92,
          d - 20,
        );
        for (const sz of [-1, 1])
          panel(
            "monastery_facade_wall",
            plaster,
            x + side * 27,
            y + 16,
            z + sz * (d / 2 - 10),
            22,
            24,
            2.4,
          );
      }
      panel(
        "monastery_rear_wall",
        plaster,
        x,
        y + 16,
        z - d / 2 + 10,
        w - 20,
        24,
        2.4,
      );
      panel(
        "monastery_closed_doors",
        door,
        x,
        y + 16,
        z + d / 2 - 10,
        32,
        24,
        2.6,
      );
      panel(
        "monastery_upper_chamber",
        plaster,
        x,
        y + h + 17,
        z,
        w * 0.49,
        17,
        d * 0.45,
      );
      // 封板收在实体斗拱内侧，保留内殿顶面，不向曲檐外伸成平板。
      panel("monastery_eave_soffit", wood, x, y + h + 5, z, w - 4, 1.8, d - 4);
      panel(
        "monastery_upper_soffit",
        wood,
        x,
        y + h + 23,
        z,
        w * 0.5,
        1.8,
        d * 0.47,
      );
    } else {
      // 峰顶亭台落在最高点，四角向实际山坡延伸石墩，避免悬空基座。
      for (const dx of [-w * 0.42, w * 0.42])
        for (const dz of [-d * 0.42, d * 0.42]) {
          const ground = renderedGround(x + dx, z + dz),
            height = Math.max(1, y + 1 - ground);
          emit(
            box,
            dressedStone,
            x + dx,
            ground + height / 2,
            z + dz,
            3,
            height,
            3,
          );
          solidBox(
            "summit_pavilion_support",
            x + dx,
            ground + height / 2,
            z + dz,
            3,
            height,
            3,
          );
        }
    }
    // 开放柱间通道；屋顶有独立厚度代理，成年角色可绕殿而非穿屋顶。
    const columns = main ? 5 : 2;
    for (let i = 0; i < columns; i++)
      for (const side of [-1, 1]) {
        const xx = x + (i / (columns - 1) - 0.5) * (w - 5),
          zz = z + side * (d / 2 - 3);
        if (!main) {
          const a = pavilionPillars,
            dims = a.packed.max.map((v, i) => v - a.packed.min[i]);
          emit(
            a.geometry,
            a.material,
            xx,
            y + 4 + h / 2,
            zz,
            (2.8 * scale) / dims[0],
            h / dims[1],
            (2.8 * scale) / dims[2],
          );
        }
        solidBox(
          "vermilion_pillar",
          xx,
          y + 4 + h / 2,
          zz,
          2.8 * scale,
          h,
          2.8 * scale,
        );
      }
    for (const side of [-1, 1])
      emit(
        box,
        main ? wood : pavilionWood,
        x,
        y + 4 + h,
        z + side * (d / 2 - 3),
        w + 2,
        2,
        2,
      );
    if (!main) {
      // 侧梁补齐承重框，斗口垫木留在柱头附近，柱间原通行净空不变。
      for (const side of [-1, 1]) {
        emit(
          box,
          pavilionWood,
          x + (side * (w - 5)) / 2,
          y + 4 + h,
          z,
          2,
          2,
          d - 6,
        );
        for (const end of [-1, 1]) {
          const xx = x + (side * (w - 5)) / 2,
            zz = z + end * (d / 2 - 3);
          emit(
            dressedBlock,
            pavilionWood,
            xx,
            y + 3 + h,
            zz,
            4.4 * scale,
            0.7,
            4.4 * scale,
          );
        }
      }
    }
    if (main) {
      const lowerRoof = templeCarving(
        "temple_roof",
        root,
        [x, y + h + 9, z],
        [w + 14, 18, d + 14],
        colliders,
      );
      for (let i = 0; i < columns; i++)
        for (const side of [-1, 1])
          roofSupport(
            lowerRoof,
            x + (i / (columns - 1) - 0.5) * (w - 5),
            y + 4 + h,
            z + side * (d / 2 - 3),
            2.6,
          );
    } else {
      const r = templeCarving(
        "temple_roof",
        root,
        [x, y + h + 8.5, z],
        [w + 14, 9, d + 14],
        colliders,
      );
      r.userData.smallPavilion = true;
      r.name = "penglai_hf_pavilion_roof";
      for (const side of [-1, 1])
        for (const i of [0, 1])
          roofSupport(
            r,
            x + (i - 0.5) * (w - 5),
            y + 4 + h,
            z + side * (d / 2 - 3),
            2.6 * scale,
            "pavilion_roof_support",
          );
    }
    if (main) {
      const upperRoof = templeCarving(
        "temple_roof",
        root,
        [x, y + h + 30.6, z],
        [w * 0.7, 16.8, d * 0.65],
        colliders,
      );
      for (const side of [-1, 1])
        for (const a of [-1, 1]) {
          const xx = x + side * w * 0.26,
            zz = z + a * d * 0.24;

          roofSupport(upperRoof, xx, y + h + 27, zz, 2.1);
          solidBox("upper_pillar", xx, y + h + 18, zz, 2.2, 18, 2.2);
        }
      // 神像与屏风作为内殿细节，外院与柱廊仍留有完整通路。
      emit(box, red, x, y + 11, z - 31, 54, 14, 2);
      solidBox("temple_screen", x, y + 11, z - 31, 54, 14, 2);
      for (let j = -3; j <= 3; j++)
        emit(box, gold, x + j * 6, y + 12, z - 29.8, 0.35, 9, 0.3);
      // 台阶从平台前缘向外排布，踏面高于山体并逐级下降，不能与平台共面重叠。
      for (let j = 0; j < 8; j++) {
        const top = y + 3.65 - j * 0.4,
          bottom = y - 0.2,
          height = top - bottom,
          centerY = (top + bottom) / 2,
          centerZ = z + 52.5 + j * 4;

        solidBox("monastery_entrance_step", x, centerY, centerZ, 65, height, 4);
      }
      for (const side of [-1, 1]) {
        emit(sphere, gold, x + side * 26, y + 8, z + 22, 4.5, 2.2, 4.5);
        emit(column, gold, x + side * 26, y + 6, z + 22, 2.7, 4, 2.7);
        for (const a of [-1, 1])
          emit(
            column,
            gold,
            x + side * 26 + a * 3.8,
            y + 8,
            z + 22,
            0.6,
            4,
            0.6,
          );
      }
      for (let j = -4; j <= 4; j++)
        for (let k = 0; k < 5; k++)
          emit(box, gold, x + j * 5, y + 7 + k * 2.2, z - 29.6, 0.3, 2.0, 0.3);
    }
    if (main)
      addPenglaiTempleDetails({
        root,
        keep,
        emit,
        geometry,
        material,
        box,
        column,
        x,
        y,
        z,
      });
    if (main)
      addPenglaiTempleCourtyard({
        root,
        keep,
        emit,
        geometry,
        material,
        colliders,
        groundMaterials,
        x,
        y,
        z,
      });
    return { x, y: y + 10, z };
  }
  try {
    const skyMaterial = keep(
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { underwater: { value: 0 } },
        vertexShader:
          "varying vec3 skyDirection;void main(){vec4 world=modelMatrix*vec4(position,1.);skyDirection=world.xyz-cameraPosition;gl_Position=projectionMatrix*viewMatrix*world;gl_Position.z=gl_Position.w*.999999;}",
        fragmentShader:
          "varying vec3 skyDirection;uniform float underwater;void main(){float h=smoothstep(-.1,.7,normalize(skyDirection).y);vec3 color=mix(vec3(.63,.75,.73),vec3(.19,.39,.49),h);color=mix(color,vec3(.10,.23,.22),underwater);gl_FragColor=vec4(color,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}",
      }),
    );
    const sky = new THREE.Mesh(
      geometry("painted_sky", () => new THREE.SphereGeometry(3000, 24, 16)),
      skyMaterial,
    );
    sky.name = "jade_ink_sky_gradient";
    sky.renderOrder = -10;
    sky.frustumCulled = false;
    skyMaterial.depthTest = false;
    root.add(sky);
    const terrain = keep(new THREE.MeshStandardMaterial({ roughness: 0.96 }));
    applyPenglaiGroundSurface(terrain, groundMaterials);
    applyPenglaiSummitPaths(terrain, keep, groundMaterials.rock);
    const colors = {
        water: new THREE.Color("#547c75"),
        rock: new THREE.Color("#697f68"),
        jade: new THREE.Color("#427549"),
        cliff: new THREE.Color("#8da083"),
      },
      c = new THREE.Color();
    for (let z = W.minZ; z < W.maxZ; z += 80) {
      const d = Math.min(80, W.maxZ - z),
        g = keep(new THREE.PlaneGeometry(1200, d, 200, Math.ceil(d / 6)));
      g.rotateX(-Math.PI / 2);
      g.translate(0, 0, z + d / 2);
      const p = g.attributes.position,
        cs = [];
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          zz = p.getZ(i),
          y = penglaiHeightAt(x, zz);
        p.setY(i, y);
        c.copy(y < 0 ? colors.water : colors.jade).lerp(
          colors.rock,
          (Math.sin(y * 0.15 + x * 0.012) + 1) * 0.27,
        );
        const slope =
          Math.hypot(
            penglaiHeightAt(x + 2, zz) - penglaiHeightAt(x - 2, zz),
            penglaiHeightAt(x, zz + 2) - penglaiHeightAt(x, zz - 2),
          ) / 4;
        if (y > 20)
          c.lerp(
            colors.cliff,
            Math.min(0.85, Math.max(0, (slope - 0.8) * 0.55)),
          );
        if (y > 0)
          c.multiplyScalar(0.93 + 0.07 * Math.sin(y * 0.07 + x * 0.006));
        c.toArray(cs, cs.length);
      }
      g.setAttribute("color", new THREE.Float32BufferAttribute(cs, 3));
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, terrain);
      groundStrips.push(terrainMeshHeight(g));
      m.name = "same_source_mountain_floor";
      root.add(m);
      yield "mountain-strata";
    }
    // 上表面写入深度并完全遮挡池底；水下单独使用反面材质，保持两种视角的水体感。
    const watermat = keep(
      new THREE.MeshStandardMaterial({
        color: "#356d69",
        roughness: 0.26,
        metalness: 0.22,
        side: THREE.FrontSide,
      }),
    );
    watermat.onBeforeCompile = (shader) => {
      shader.uniforms.penglaiTime = time;
      shader.vertexShader = "varying vec3 vPool;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvPool=position;",
      );
      shader.fragmentShader =
        "uniform float penglaiTime;varying vec3 vPool;\n" +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nfloat wave=sin(vPool.x*.13+penglaiTime*.55)*sin(vPool.z*.17-penglaiTime*.3);diffuseColor.rgb*=.94+.06*wave;",
      );
    };
    const waterg = keep(
      new THREE.PlaneGeometry(W.maxX - W.minX, W.maxZ - W.minZ, 1, 1),
    );
    waterg.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(waterg, watermat);
    water.position.set(
      (W.minX + W.maxX) / 2,
      W.surfaceY,
      (W.minZ + W.maxZ) / 2,
    );
    water.name = "opaque_lotus_water_top";
    root.add(water);
    const underside = new THREE.Mesh(
      waterg,
      keep(
        new THREE.MeshStandardMaterial({
          color: "#8aa9a0",
          roughness: 0.5,
          transparent: true,
          opacity: 0.35,
          side: THREE.BackSide,
          depthWrite: false,
        }),
      ),
    );
    underside.position.copy(water.position);
    underside.name = "lotus_water_underside";
    root.add(underside);
    const temple = pavilion(0, -650, 1, true);
    addPenglaiSwordMonument({
      root,
      keep,
      carve: templeCarving,
      colliders,
      x: 0,
      y: penglaiHeightAt(0, -650),
      z: -650,
    });
    templePlaque = createPenglaiTemplePlaque(keep);
    const plaque = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(46, 14)),
      templePlaque.material,
    );
    plaque.name = "brush_calligraphy_yi_qi_yu_jian";
    plaque.position.set(0, penglaiHeightAt(0, -650) + 28, -601.3);
    root.add(plaque);
    emit(box, wood, 0, plaque.position.y, -602, 48, 16, 1.2);
    solidBox(
      "monastery_inscribed_plaque",
      0,
      plaque.position.y,
      -602,
      48,
      16,
      1.2,
    );
    ward = scope.own(createPenglaiWard(root));
    skyIslands = scope.own(createPenglaiSkyIslands(root, colliders));
    skyHazards = scope.own(
      createPenglaiSkyHazards(root, { heightAt: penglaiHeightAt }),
    );
    yield "monastery";
    for (const [x, z] of [
      [-214, -315],
      [230, -380],
      [-175, -785],
      [175, -905],
      [374, -1100],
    ]) {
      pavilion(x, z, 0.85);
      yield "pavilions";
    }
    const gateY = penglaiHeightAt(0, -235),
      gateZ = -235;
    for (const s of [-1, 1]) {
      solidBox("dragon_gate_column", s * 28, gateY + 31, gateZ, 5, 64, 5);
    }
    emit(box, red, 0, gateY + 58, gateZ, 63, 4, 5);
    addPenglaiSectGate({
      root,
      carve: templeCarving,
      colliders,
      y: gateY,
      z: gateZ,
    });
    solidBox("dragon_gate_lintel", 0, gateY + 59, gateZ, 63, 6, 8);
    pink.side = THREE.DoubleSide;
    pink.color.set("#ffffff");
    pink.vertexColors = true;
    const treeNear = createPenglaiGardenAsset("peach_tree", keep),
      treeFar = createPenglaiGardenAsset("peach_tree_far", keep);
    const plantTree = (x, y, z, s, a = 0) => {
      for (const t of [treeNear, treeFar])
        emit(t.geometry, t.material, x, y, z, s, s, s, 0, a);
    };
    for (const a of skyIslands.treeAnchors) {
      plantTree(a.x, a.y, a.z, 0.62);
      solidBox("sky_peach_trunk", a.x, a.y + 3.8, a.z, 1, 7.6, 1);
    }
    let peachTrees = 0;
    for (let j = 0; j < 1800; j++) {
      const x = -515 + (j % 45) * 23 + Math.sin(j * 5.37) * 6,
        z = -1240 + Math.floor(j / 45) * 27 + Math.cos(j * 2.399) * 7,
        y = penglaiHeightAt(x, z);
      if (
        guardianLandmarkReserved(x, z, 8) ||
        y < 8 ||
        y > 160 ||
        (Math.abs(x) < 100 && Math.abs(z + 650) < 135) ||
        Math.hypot(x + 320, z + 650) < 88
      )
        continue;
      // 仙观通往四方的山径留出成年人回转空间，桃林形成连片而非零星点缀。
      if (
        Math.abs(x) < 28 ||
        Math.abs(z + 650) < 24 ||
        besideSummitPath(x, z, 9)
      )
        continue;
      const s = 0.8 + (j % 7) * 0.065,
        a = j * 2.399;
      let base = renderedGround(x, z);
      for (let k = 0; k < 12; k++)
        base = Math.min(
          base,
          renderedGround(
            x + Math.cos((k * Math.PI) / 6) * 0.9 * s,
            z + Math.sin((k * Math.PI) / 6) * 0.9 * s,
          ),
        );
      base -= 0.12;
      plantTree(x, base, z, s, a);
      peachTrees++;
      colliders.push({
        type: "box",
        kind: "peach_trunk",
        x,
        y: base + 5 * s,
        z,
        halfSize: { x: 0.8 * s, y: 5 * s, z: 0.8 * s },
      });
      if (peachTrees % 20 === 0) yield "peach-groves";
    }
    root.userData.peachTrees = peachTrees;
    root.userData.skyPeachTrees = skyIslands.treeAnchors.length;
    const lotusLeaf = geometry("lotus_leaf", createPenglaiLotusLeaf),
      lotusLeafMaterial = material("veined_lotus_leaf", "#ffffff", {
        vertexColors: true,
        side: THREE.DoubleSide,
      }),
      lotusBloom = createPenglaiGardenAsset("lotus_bloom", keep);
    let leaves = 0,
      blooms = 0;
    for (let j = 0; j < 150; j++) {
      const x = Math.sin(j * 2.4) * 120,
        z = 115 - ((j * 17) % 320),
        bottom = penglaiHeightAt(x, z);
      if (bottom > -8) continue;
      const top = 4.35 + (j % 4) * 0.18;
      emit(lotusLeaf, lotusLeafMaterial, x, top, z, 2, 1.8, 2, 0, j);
      emit(column, leaf, x, (bottom + top) / 2, z, 0.1, top - bottom, 0.1);
      leaves++;
      if (j % 3 === 0) {
        // 同一莲床的花梗略偏离叶柄，花瓣高过叶面，长柄接回水底。
        const bx = x + 1.6 * Math.sin(j),
          bz = z + 1.6 * Math.cos(j),
          ground = penglaiHeightAt(bx, bz);
        emit(
          lotusBloom.geometry,
          lotusBloom.material,
          bx,
          4.25,
          bz,
          1,
          1,
          1,
          0,
          j * 0.7,
        );
        emit(
          column,
          leaf,
          bx,
          (ground + 4.35) / 2,
          bz,
          0.1,
          4.35 - ground,
          0.1,
        );
        blooms++;
      }
    }
    root.userData.lotusBeds = { leaves, blooms };
    // 山脚沉石、水草与贝壳属于浅水生态，不套用别处海底的发光矿柱。
    for (let j = 0; j < 170; j++) {
      const x = Math.sin(j * 5.8) * 560,
        z = 130 - j * 8.5,
        y = penglaiHeightAt(x, z);
      if (y > 0) continue;
      emit(
        sphere,
        exposedRock,
        x,
        y + 2,
        z,
        3 + (j % 4),
        2 + (j % 3),
        3 + ((j * 3) % 5),
        0,
        j,
      );
      if (j % 3 === 0)
        for (let k = 0; k < 5; k++)
          emit(
            column,
            leaf,
            x + k * 0.5,
            y + 3 + k * 0.3,
            z,
            0.12,
            5 + k,
            0.12,
            0,
            0,
            0.14 * Math.sin(j + k),
          );
    }
    for (const peak of PENGLAI_PEAKS)
      for (let j = 0; j < 18; j++) {
        const a = j * 2.399,
          r = 35 + (j % 4) * 17,
          x = peak.x + Math.cos(a) * r,
          z = peak.z + Math.sin(a) * r,
          y = penglaiHeightAt(x, z);
        if (
          (Math.abs(x - PENGLAI_BIXI.x) < 55 &&
            Math.abs(z - PENGLAI_BIXI.z) < 62) ||
          guardianLandmarkReserved(x, z, 12) ||
          besideSummitPath(x, z, 12) ||
          (Math.abs(x) < 100 && Math.abs(z + 650) < 135) ||
          Math.hypot(x + 320, z + 650) < 88 ||
          penglaiBasinRadius(x, z) < 1.25
        )
          continue;
        colliders.push({
          type: "ellipsoid",
          kind: "mountain_outcrop",
          x,
          y: y - 4,
          z,
          axes: {
            x: 9 + (j % 4) * 3,
            y: 13 + (j % 5) * 4,
            z: 10 + (j % 3) * 3,
          },
          rotation: new THREE.Quaternion().setFromEuler(
            new THREE.Euler(0.12, a, 0.13),
          ),
        });
        emit(
          crag,
          exposedRock,
          x,
          y - 4,
          z,
          9 + (j % 4) * 3,
          13 + (j % 5) * 4,
          10 + (j % 3) * 3,
          0.12,
          a,
          0.13,
        );
      }
    for (const route of PENGLAI_SUMMIT_ROUTES) {
      if (Math.abs(route.top.x - 315) < 30 && Math.abs(route.top.z + 655) < 30)
        continue;
      pavilion(route.top.x, route.top.z, 0.72);
      yield "summit-pavilions";
    }
    root.userData.summitRoutes = PENGLAI_SUMMIT_ROUTES;
    // 松林轮廓与修竹强调山水环境；落地树干有细小碰撞代理。
    const pine = material("pine", "#426457"),
      bamboo = material("bamboo", "#779268");
    const crown = geometry("pine_crown", () => new THREE.ConeGeometry(1, 1, 9));
    for (let j = 0; j < 96; j++) {
      const x = Math.sin(j * 2.399) * 480,
        z = -220 - (j % 23) * 46,
        y = penglaiHeightAt(x, z);
      if (
        guardianLandmarkReserved(x, z, 8) ||
        y < 8 ||
        (Math.abs(x) < 92 && Math.abs(z + 650) < 112) ||
        besideSummitPath(x, z, 9)
      )
        continue;
      if (j % 3 === 0) {
        for (let k = 0; k < 5; k++) {
          const xx = x + (k - 2) * 1.3,
            zz = z + Math.sin(k) * 2,
            h = 15 + k * 1.3;
          emit(column, bamboo, xx, y + h / 2, zz, 0.18, h, 0.18);
          for (let n = 0; n < 5; n++)
            emit(
              sphere,
              leaf,
              xx + (n % 2 ? 2 : -2),
              y + h - 5 + n,
              zz,
              2.6,
              0.2,
              0.5,
              0,
              0.5 * n,
              0.2,
            );
        }
      } else {
        emit(column, wood, x, y + 7, z, 0.7, 14, 0.7);
        colliders.push({ kind: "pine_trunk", x, y: y + 7, z, radius: 1.0 });
        for (let k = 0; k < 4; k++)
          emit(
            crown,
            pine,
            x + Math.sin(k) * 1.3,
            y + 8 + k * 3.0,
            z + Math.cos(k),
            5.6 - k * 0.7,
            4,
            4.5 - k * 0.5,
          );
      }
    }
    // 山泉沿采样地面逐段跌落，透明水带配石底，远处读作细瀑而非发光灯柱。
    const falls = keep(
      new THREE.MeshStandardMaterial({
        color: "#c1d6ce",
        transparent: true,
        opacity: 0.38,
        roughness: 0.25,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    for (const peak of [PENGLAI_PEAKS[1], PENGLAI_PEAKS[5]]) {
      const points = [];
      for (let j = 0; j < 30; j++) {
        const x = peak.x + Math.sin(j * 0.12) * 10,
          z = peak.z + j * 6;
        points.push(new THREE.Vector3(x, penglaiHeightAt(x, z) + 1.4, z));
      }
      const g = keep(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          60,
          1.8,
          6,
          false,
        ),
      );
      const m = new THREE.Mesh(g, falls);
      m.name = "mountain_spring";
      root.add(m);
    }
    yield "lotus-beds";
    // 轻薄云丝使用有界顶点动画，既不遮满天空也不产生逐帧几何重建。
    const cloudmat = keep(
      new THREE.MeshBasicMaterial({
        color: "#d9e1d4",
        transparent: true,
        opacity: 0.045,
        depthWrite: false,
        fog: true,
      }),
    );
    for (let j = 0; j < 26; j++) {
      const cloud = new THREE.Mesh(sphere, cloudmat);
      cloud.position.set(
        Math.sin(j * 2.4) * 420,
        80 + (j % 5) * 55,
        -160 - j * 42,
      );
      cloud.scale.set(110 + (j % 4) * 20, 6, 40);
      cloud.name = "thin_mountain_mist";
      root.add(cloud);
    }
    for (const bucket of buckets.values()) {
      const m = new THREE.InstancedMesh(
        bucket.g,
        bucket.m,
        bucket.matrices.length,
      );
      bucket.matrices.forEach((matrix, i) => m.setMatrixAt(i, matrix));
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
      m.name = "penglai_spatial_details";
      m.userData.anchor = new THREE.Vector3(
        bucket.cx * 120 + 60,
        0,
        bucket.cz * 120 + 60,
      );
      m.userData.detailLevel = bucket.g.userData.penglaiDetailLevel;
      if (bucket.g.userData.prepareMaterials)
        m.userData.prepareMaterials = bucket.g.userData.prepareMaterials;
      if (bucket.g.userData.hfGardenKind)
        m.userData.hfGardenKind = bucket.g.userData.hfGardenKind;
      m.userData.anchor.y =
        bucket.matrices.reduce((sum, matrix) => sum + matrix.elements[13], 0) /
          bucket.matrices.length +
        10;
      root.add(m);
      chunks.push(m);
      yield "details";
    }
    bixi = createPenglaiBixi(root, keep, colliders);
    const guardianLandmarks = createPenglaiGuardianLandmarks(
      root,
      keep,
      colliders,
      (x, z) => {
        const index = Math.max(
          0,
          Math.min(groundStrips.length - 1, Math.floor((z - W.minZ) / 80)),
        );
        return groundStrips[index]?.(x, z) ?? penglaiHeightAt(x, z);
      },
    );
    const landmarks = [
      ...guardianLandmarks.landmarks,
      {
        name: "赑屃镇渊碑",
        position: bixi.root.position.clone().add(new THREE.Vector3(0, 35, 0)),
      },
      {
        name: "玄冥深潭",
        position: new THREE.Vector3(
          PENGLAI_DEEP_BASIN.x,
          PENGLAI_DEEP_BASIN.guardianY,
          PENGLAI_DEEP_BASIN.z,
        ),
      },
      { name: "莲池育幼湾", position: new THREE.Vector3(0, -18, 75) },
      { name: "龙门", position: new THREE.Vector3(0, gateY + 35, gateZ) },
      {
        name: "御剑道观",
        position: new THREE.Vector3(temple.x, temple.y, temple.z),
      },
    ];
    const radarPaths = [
      [
        [0, 75],
        [0, -235],
        [0, -355],
        [0, -520],
        [0, -650],
      ],
      Array.from({ length: 25 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return [Math.sin(a) * 325, -650 + Math.cos(a) * 380];
      }),
      [
        [0, -650],
        [315, -650],
      ],
      [
        [0, -650],
        [-320, -650],
      ],
      [
        [0, -650],
        [0, -1030],
      ],
    ];
    function dispose() {
      if (disposed) return;
      disposed = true;
      ward?.dispose();
      skyIslands?.dispose();
      skyHazards?.dispose();
      root.removeFromParent();
      root.traverse((n) => {
        if (n.isInstancedMesh) n.dispose();
      });
      resources.forEach((r) => r.dispose());
      resources.clear();
      root.clear();
      groundStrips.length = 0;
    }
    return scope.finish({
      root,
      colliders,
      navigationColliders: colliders,
      heightAt: penglaiHeightAt,
      groundHeightAt: (x, z) => {
        const index = Math.max(
          0,
          Math.min(groundStrips.length - 1, Math.floor((z - W.minZ) / 80)),
        );
        return groundStrips[index]?.(x, z) ?? penglaiHeightAt(x, z);
      },
      landmarks,
      radarPaths,
      obstacles: [],
      barriers: ward.barriers,
      ward,
      skyHazards,
      reset: () => {
        ward.reset();
        skyHazards.reset();
      },
      updateProgress: (...args) => ward.updateProgress(...args),
      guardianWaypoints: PENGLAI_BOSS_INSTANCES,
      rewardHabitat: PENGLAI_REWARD_HABITAT,
      rewardAnchor: penglaiRewardAnchor,
      update(
        t,
        position,
        dt,
        highQuality,
        cameraPosition = position,
        reducedMotion = false,
      ) {
        // 天幕随相机平移，最高空域与边角朝向也保持在球内。
        sky.position.copy(cameraPosition);
        time.value = t;
        ward.update(t, position);
        bixi.update();
        templePlaque.update();
        skyHazards.update(t, position, reducedMotion, highQuality);
        skyMaterial.uniforms.underwater.value = Math.max(
          0,
          Math.min(1, (4 - position.y) / 22),
        );
        for (const m of chunks) {
          const a = m.userData.anchor,
            d = Math.hypot(a.x - position.x, a.z - position.z);
          const level = m.userData.detailLevel;
          const treeDistance = Math.hypot(
            a.x - position.x,
            a.y - position.y,
            a.z - position.z,
          );
          const detailDistance = highQuality ? 170 : 120;
          // 同一块近远树共享半径；流畅档较早切到同源远景，保留树冠和可见范围。
          m.visible =
            d < (highQuality ? 900 : 700) &&
            (!level ||
              (level === "near"
                ? treeDistance < detailDistance
                : treeDistance >= detailDistance));
        }
      },
      dispose,
    });
  } finally {
    scope.close();
  }
}
