import { addPressureLining } from "./europa_wreck_lining.js";
import { addResearchInterior } from "./europa_wreck_interior.js";
import { acquireEuropaSceneryAsset } from "./europa_scenery_asset.js";
import { europaWorldPoint } from "./europa_config.js";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { addSurfaceDetail } from "./ocean_visuals.js";
import {
  addEuropaColonySurface,
  createSiphonColonyGeometry,
} from "./europa_environment_geometry.js";

export const EUROPA_WRECK_SITE = Object.freeze({
  x: europaWorldPoint([60, 0, -470])[0],
  z: europaWorldPoint([60, 0, -470])[2],
  yaw: Math.PI / 2,
  scale: 3,
  gallery: Object.freeze({ width: 188.25, height: 119.25, length: 489.6 }),
});

/** 坠毁科考登陆舱：真实空心通舱、贴坡支撑和分片建模，资源归属外层地图。 */
export function* createEuropaResearchWreckSteps(
  parent,
  { heightAt, keep, time },
) {
  const root = new THREE.Group();
  root.name = "europa_crashed_research_lander";
  parent.add(root);
  const site = EUROPA_WRECK_SITE,
    scale = site.scale,
    slope =
      (heightAt(site.x, site.z - 12 * scale) -
        heightAt(site.x, site.z + 12 * scale)) /
      (24 * scale);
  root.scale.setScalar(scale);
  root.rotation.set(0, site.yaw, 0);
  root.quaternion.multiply(
    new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      Math.atan(slope),
    ),
  );
  root.position.set(site.x, 0, site.z);
  // 实际底板完整足迹采样确定标高，不能只把中心放在斜坡上。
  let supportedY = -Infinity;
  const supportSamples = [];
  for (let x = -32; x <= 32; x += 1)
    for (let z = -81.6; z <= 81.6; z += 1) {
      const bottom =
        Math.abs(x) <= 26 ? -0.625 : Math.abs(x) - 26 - Math.SQRT2 * 0.625;
      const p = new THREE.Vector3(x, bottom, z)
        .multiplyScalar(scale)
        .applyQuaternion(root.quaternion);
      const y = heightAt(site.x + p.x, site.z + p.z) - p.y;
      supportedY = Math.max(supportedY, y);
      supportSamples.push([x, bottom, z]);
    }
  root.position.y = supportedY + 0.25 * scale;
  root.updateMatrixWorld(true);
  const bowAsset = acquireEuropaSceneryAsset("bow");
  keep({ dispose: bowAsset.release });
  void bowAsset.prepare();
  const colliders = [],
    batches = new Map(),
    localSolids = [],
    fittings = [];
  const makeMaterial = (name, color, metalness = 0.45, roughness = 0.7) => {
    const m = keep(
      new THREE.MeshStandardMaterial({ color, metalness, roughness }),
    );
    m.name = name;
    addSurfaceDetail(m, "metal", 0.32);
    // 腐蚀划痕随表面坐标变化；不靠镜面高光把残骸照成白块。
    const previous = m.onBeforeCompile,
      key = m.customProgramCacheKey();
    m.onBeforeCompile = (shader, renderer) => {
      previous.call(m, shader, renderer);
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
         float wear = detailNoise(vSurfaceDetail * .22);
         diffuseColor.rgb *= .88 + wear * .16;
         diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.85, .78, .64), smoothstep(.66, .84, wear) * .3);`,
      );
    };
    m.customProgramCacheKey = () => `${key}_crashed_lander_wear_v2`;
    return m;
  };
  const hull = makeMaterial("wreck_ceramic_panels", "#a7aaa2", 0.28),
    frame = makeMaterial("wreck_titanium_structure", "#4c6269", 0.7),
    foil = makeMaterial("wreck_folded_thermal_blanket", "#907a52", 0.55),
    black = makeMaterial("wreck_dark_equipment", "#24363e", 0.35),
    orange = makeMaterial("wreck_mission_markings", "#a76845", 0.2),
    blue = makeMaterial("wreck_radiator_cells", "#31495d", 0.45, 0.5);
  const boxGeometry = keep(new RoundedBoxGeometry(1, 1, 1, 1, 0.035)),
    panelGeometry = keep(new THREE.BoxGeometry(1, 1, 1)),
    rodGeometry = keep(new THREE.CylinderGeometry(1, 1, 1, 12)),
    sphereGeometry = keep(new THREE.SphereGeometry(1, 16, 10)),
    ringGeometry = keep(new THREE.TorusGeometry(1, 0.09, 6, 20));
  const add = (geometry, material, matrix) => {
    const copy = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    copy.applyMatrix4(matrix);
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(copy);
  };
  const dummy = new THREE.Object3D();
  let fittingOffsetZ = 0;
  let fittingsMode = false;
  // 家具移到扩建后的两翼，设备不随船宽横向拉伸。
  const fittingPoint = (p) => [
    p[0] + (Math.abs(p[0]) >= 8 ? Math.sign(p[0]) * 13 : 0),
    p[1],
    p[2] * 1.2,
  ];
  const placedPoint = (p) => {
    const point = [p[0], p[1], p[2] + fittingOffsetZ];
    return fittingsMode ? fittingPoint(point) : point;
  };
  function box(p, sizes, material, rotationZ = 0, solid = true) {
    dummy.position.fromArray(placedPoint(p));
    if (Array.isArray(rotationZ)) dummy.rotation.set(...rotationZ);
    else dummy.rotation.set(0, 0, rotationZ);
    const extent = fittingsMode ? [sizes[0], sizes[1], sizes[2] * 1.2] : sizes;
    dummy.scale.fromArray(extent);
    dummy.updateMatrix();
    // 薄板、格栅和缝条保留锐边；无需为看不见的微小倒角复制数百个三角形。
    add(
      Math.min(...sizes) < 0.3 ? panelGeometry : boxGeometry,
      material,
      dummy.matrix,
    );
    if (solid)
      localSolids.push({
        p: dummy.position.toArray(),
        sizes: extent,
        q: dummy.quaternion.clone(),
      });
  }
  function rod(a, b, radius, material, solid = false) {
    const start = new THREE.Vector3(...placedPoint(a)),
      end = new THREE.Vector3(...placedPoint(b)),
      direction = end.clone().sub(start);
    dummy.position.copy(start).add(end).multiplyScalar(0.5);
    dummy.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize(),
    );
    dummy.scale.set(radius, direction.length(), radius);
    dummy.updateMatrix();
    add(rodGeometry, material, dummy.matrix);
    if (solid) localSolids.push({ a: start, b: end, radius });
  }
  function flush(label) {
    const group = new THREE.Group();
    group.name = label;
    root.add(group);
    for (const [material, copies] of batches) {
      const merged = mergeGeometries(copies);
      if (!merged) throw new Error("Research wreck geometry merge failed");
      const geometry = keep(merged);
      copies.forEach((g) => g.dispose());
      group.add(new THREE.Mesh(geometry, material));
    }
    batches.clear();
  }
  try {
    // 八角承压舱切去两端门盖，右舷破口留在两段外壳之间。
    const outline = [
      [-26, 0],
      [26, 0],
      [32, 6],
      [32, 34],
      [25, 41],
      [-25, 41],
      [-32, 34],
      [-32, 6],
    ];
    for (let edge = 0; edge < outline.length; edge++) {
      const a = outline[edge],
        b = outline[(edge + 1) % outline.length],
        width = Math.hypot(b[0] - a[0], b[1] - a[1]),
        angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const sections =
        edge === 2
          ? [
              [-46.8, 69.6],
              [51, 61.2],
            ]
          : [[0, 163.2]];
      for (const [z, length] of sections) {
        box(
          [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z],
          [width, 1.25, length],
          hull,
          angle,
        );
        box(
          [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z],
          [width * 0.96, 1.42, 0.75],
          frame,
          angle,
          false,
        );
      }
    }
    // 外部模块化陶瓷瓦留有真实缝隙；分布沿承压壳外侧，不侵占舱内路线。
    for (let edge = 1; edge < 8; edge++) {
      const a = outline[edge],
        b = outline[(edge + 1) % 8],
        width = Math.hypot(b[0] - a[0], b[1] - a[1]),
        angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const cx = (a[0] + b[0]) / 2,
        cy = (a[1] + b[1]) / 2,
        dx = Math.sin(angle),
        dy = -Math.cos(angle);
      for (let panel = 0; panel < 16; panel++) {
        const z = -76.5 + panel * 10.2;
        if (edge === 2 && z > -15.6 && z < 24) continue;
        const torn = (panel + edge) % 9 === 0;
        box(
          [cx + dx * 0.88, cy + dy * 0.88, z],
          [width * 0.92, 0.46, torn ? 7 : 9.5],
          (panel + edge) % 7 === 0 ? orange : hull,
          angle,
          false,
        );
        for (const offset of [-0.31, 0.31])
          box(
            [
              cx + dx * 1.13 + Math.cos(angle) * width * offset,
              cy + dy * 1.13 + Math.sin(angle) * width * offset,
              z,
            ],
            [0.18, 0.1, 8.2],
            frame,
            angle,
            false,
          );
      }
    }
    const bow = new THREE.Mesh(bowAsset.geometry, bowAsset.material);
    bow.name = "wreck_damaged_command_module_hf";
    bow.userData.sharedEuropaScenery = true;
    bow.scale.setScalar(31);
    bow.position.set(0, 48.4, -63);
    root.add(bow);
    // 指挥模块固定在上甲板，保留两端正门和右舷破口。
    bowAsset.geometry.computeBoundingBox();
    const bowBox = bowAsset.geometry.boundingBox
      .clone()
      .applyMatrix4(new THREE.Matrix4().makeScale(31, 31, 31))
      .translate(bow.position);
    localSolids.push({
      p: bowBox.getCenter(new THREE.Vector3()).toArray(),
      sizes: bowBox.getSize(new THREE.Vector3()).toArray(),
      q: new THREE.Quaternion(),
    });
    for (const side of [-1, 1])
      for (const z of [-73, -57])
        box([side * 5, 42.3, z], [1.8, 2.2, 2.8], frame);

    // 承力环、铆钉和分块覆板让大轮廓在普通相机距离就能被辨认。
    for (const z of [
      -67, -55, -42, -30, -20, -8, 2, 14, 23, 32, 42, 55, 67,
    ].map((z) => z * 1.2))
      for (let edge = 0; edge < outline.length; edge++) {
        const a = outline[edge],
          b = outline[(edge + 1) % 8];
        if (!(edge === 2 && z >= -12 && z <= 20.4))
          rod([a[0], a[1], z], [b[0], b[1], z], 0.42, frame);
        for (const y of [8, 15, 22])
          if (
            (edge === 2 || edge === 6) &&
            !(edge === 2 && z >= -12 && z <= 20.4)
          )
            box(
              [a[0] + (edge === 2 ? 0.1 : -0.1), y, z],
              [0.45, 0.45, 0.65],
              black,
              0,
              false,
            );
      }
    box([0, 41.8, 0], [43, 0.4, 158], foil, 0, false);
    for (let z = -77; z < 80; z += 4)
      box([0, 42.15, z], [43.2, 0.18, 0.22], frame, 0, false);
    flush("wreck_pressure_hull");
    yield "research-pressure-hull";

    // 家具限定在侧翼，原始坐标 |x|<9 保留为成年人贯通及转身空间。
    const floorAt = (x) => 0.625 + Math.max(0, Math.abs(x) - 13);
    function shape(geometry, p, sizes, material, rotation = [0, 0, 0]) {
      dummy.position.fromArray(placedPoint(p));
      const extent = fittingsMode
        ? [sizes[0], sizes[1], sizes[2] * 1.2]
        : sizes;
      dummy.scale.fromArray(extent);
      dummy.rotation.set(...rotation);
      dummy.updateMatrix();
      add(geometry, material, dummy.matrix);
    }
    function vessel(p, height, radius, material, solid = true) {
      const low = [p[0], p[1] - height / 2 + radius, p[2]],
        high = [p[0], p[1] + height / 2 - radius, p[2]];
      rod(low, high, radius, material, solid);
      for (const point of [low, high])
        shape(sphereGeometry, point, [radius, radius, radius], material);
    }
    function ring(p, radius, material, rotation = [0, 0, 0]) {
      shape(ringGeometry, p, [radius, radius, radius], material, rotation);
    }
    function supportedBench(side, z, length, top, depth = 5) {
      const x = side * 13.5;
      box([x, top, z], [depth, 0.65, length], frame);
      for (const dx of [-depth / 2 + 0.35, depth / 2 - 0.35])
        for (const dz of [-length / 2 + 0.45, length / 2 - 0.45]) {
          const px = x + dx,
            pz = z + dz;
          rod([px, floorAt(px), pz], [px, top - 0.32, pz], 0.22, hull, true);
        }
      return x;
    }
    function facingPanel(side, y, z, height, width, material = black) {
      box([side * 10.7, y, z], [0.48, height + 0.6, width + 0.6], frame);
      box([side * 10.4, y, z], [0.12, height, width], material, 0, false);
      for (const dz of [-width / 2 + 0.35, width / 2 - 0.35])
        shape(
          sphereGeometry,
          [side * 10.28, y - height / 2 + 0.38, z + dz],
          [0.1, 0.15, 0.15],
          foil,
        );
    }
    fittingsMode = true;
    fittingOffsetZ = -11;
    // 指挥/通信舱：倾斜操作台、停电屏幕、仪表座和空置约束座椅。
    for (const side of [-1, 1]) {
      supportedBench(side, -20, 13, 6.6);
      box([side * 13.5, 8.2, -20], [4.7, 2.5, 12.4], black, side * -0.16);
      for (const z of [-23.8, -19.8, -15.8]) {
        facingPanel(side, 10.1, z, 3.8, 3.0);
        box(
          [side * 10.24, 10.3, z],
          [0.08, 0.08, 2.4],
          hull,
          side * 0.12,
          false,
        );
        for (let n = 0; n < 3; n++)
          box(
            [side * 10.13, 8.5, z - 0.7 + n * 0.7],
            [0.18, 0.22, 0.28],
            orange,
            0,
            false,
          );
      }
      // 座椅靠外侧墙固定，不伸入中央航道。
      rod(
        [side * 15.4, floorAt(side * 15.4), -24.4],
        [side * 15.4, 6.6, -24.4],
        0.38,
        frame,
        true,
      );
      box([side * 15.4, 6.4, -24.4], [2.8, 0.55, 2.8], hull);
      box([side * 16.3, 8, -24.4], [0.55, 3.3, 2.8], black, side * 0.16);
      for (const dz of [-1, 1])
        rod(
          [side * 15.3, 7, -24.4 + dz],
          [side * 16, 9.4, -24.4 + dz],
          0.1,
          foil,
        );
      for (let j = 0; j < 3; j++) {
        const z = -24 + j * 4;
        rod([side * 17.8, 15, z], [side * 17.8, 23, z + 0.5], 0.17, black);
        ring([side * 17.6, 19, z], 0.85, frame, [0, Math.PI / 2, 0]);
      }
    }
    fittings.push({
      id: "command",
      localCenter: [0, 15, -31],
      localLookAt: [-13, 9, -31],
      localFootprint: [10, 17, -38, -24],
      localBounds: [-42, -20],
    });
    flush("wreck_damaged_command_and_communications");

    fittingOffsetZ = -9;
    // 湿实验舱：圆端样品罐、取样工作台和机械夹具；右舷破口只留低矮台面。
    for (const side of [1]) {
      supportedBench(side, -0.5, 11, 6.1);
      box([side * 13.5, 6.6, -0.5], [4.4, 0.32, 10.5], hull);
      for (let n = 0; n < (side < 0 ? 3 : 2); n++) {
        const z = -4 + n * 3.2;
        vessel([side * 13.3, 9.1, z], 4.3, 0.78, hull);
        ring([side * 13.3, 9.1, z], 0.86, orange, [Math.PI / 2, 0, 0]);
        rod([side * 13.3, 11.25, z], [side * 14.6, 11.25, z], 0.1, frame);
        shape(sphereGeometry, [side * 12.7, 9.8, z], [0.15, 0.52, 0.42], black);
      }
      for (let j = 0; j < 3; j++) {
        const z = -4.5 + j * 3.2;
        box([side * 13.6, 4.85, z], [3.5, 1.85, 2.8], black);
        box([side * 11.78, 4.85, z], [0.12, 1.2, 2.25], hull, 0, false);
        rod(
          [side * 11.66, 4.85, z - 0.5],
          [side * 11.66, 4.85, z + 0.5],
          0.09,
          frame,
        );
      }
    }
    fittingOffsetZ = 0;
    // 破口边保留可见的断口和弯折内衬，不能用承力肋横封通道。
    for (const z of [-10.1, 17.1]) {
      box([18.6, 20, z], [1.2, 27.5, 0.8], frame);
      for (const y of [8, 12, 20, 24])
        rod(
          [18.4, y, z],
          [19.8, y + 0.5, z + (z < 0 ? -0.8 : 0.8)],
          0.16,
          hull,
        );
    }
    fittings.push({
      id: "wet_laboratory",
      localCenter: [0, 15, -9],
      localLookAt: [-13, 9, -9],
      localFootprint: [10.5, 16.5, -15.5, -3.5],
      localBounds: [-20, 2],
    });
    flush("wreck_wet_sampling_laboratory");

    // 生活舱以双层卧铺、储物柜和折叠餐桌成形，保持空置且不生成可食物品。
    for (const side of [-1, 1]) {
      for (const z of [7, 14]) {
        supportedBench(side, z, 5.8, 5.8, 4.4);
        box([side * 13.5, 6.35, z], [4, 0.5, 5.4], blue);
        box([side * 13.5, 10.0, z], [4.4, 0.6, 5.8], frame);
        box([side * 13.5, 10.55, z], [4, 0.5, 5.4], blue);
        for (const x of [11.5, 15.5])
          for (const dz of [-2.65, 2.65])
            rod(
              [side * x, floorAt(side * x), z + dz],
              [side * x, 12.1, z + dz],
              0.16,
              hull,
              true,
            );
        for (const y of [6.7, 10.9]) {
          box([side * 13.5, y, z - 1.8], [3.6, 0.35, 1.0], hull, 0, false);
          rod(
            [side * 11.5, y + 0.7, z - 2.5],
            [side * 11.5, y + 0.7, z + 2.5],
            0.1,
            foil,
          );
        }
      }
      supportedBench(side, 20, 3.4, 6.8, 4.4);
      box([side * 13.5, 7.2, 20], [4.3, 0.3, 3.2], hull);
      box([side * 17.1, 10, 20], [1.6, 7.4, 3.6], black);
      for (const z of [19.1, 20.9]) {
        box([side * 16.2, 10, z], [0.2, 6.8, 1.5], hull, 0, false);
        rod([side * 16.03, 9.6, z], [side * 16.03, 10.5, z], 0.08, frame);
      }
    }
    fittings.push({
      id: "living_quarters",
      localCenter: [0, 15, 12],
      localLookAt: [-13.5, 8, 12],
      localFootprint: [10.5, 18, 3.5, 22],
      localBounds: [2, 23],
    });
    flush("wreck_empty_living_quarters");

    fittingOffsetZ = 12;
    // 工程舱：双压力蓄罐、泵体和检修架形成区别于实验台的竖向剪影。
    for (const side of [-1, 1]) {
      supportedBench(side, 21, 12, 5.1);
      for (const z of [18, 23.6]) {
        vessel(
          [side * 14, side > 0 ? 9.425 : 10.425, z],
          side > 0 ? 8 : 10,
          1.7,
          hull,
        );
        for (const y of [7.2, side > 0 ? 12.8 : 13.8])
          ring([side * 14, y, z], 1.78, frame, [Math.PI / 2, 0, 0]);
        const pipeY = side > 0 ? 13.3 : 15.5;
        rod([side * 14, pipeY, z], [side * 17, pipeY, z], 0.26, foil, true);
        rod([side * 17, pipeY, z], [side * 17, 6, z], 0.26, foil, true);
        facingPanel(side, 8.2, z, 2.4, 2.2, blue);
        rod([side * 10.94, 8.2, z], [side * 12.4, 8.2, z], 0.24, frame, true);
        ring([side * 10.25, 8.4, z], 0.65, foil, [0, Math.PI / 2, 0]);
        rod(
          [side * 10.15, 8.4, z - 0.45],
          [side * 10.15, 8.4, z + 0.45],
          0.07,
          hull,
        );
      }
      if (side < 0) {
        box([side * 14, 18.5, 21], [5.2, 2.6, 11], black);
        for (const y of [17.2, 19.8])
          rod([side * 11.3, y, 15.5], [side * 11.3, y, 26.5], 0.15, frame);
        for (const z of [16, 20, 24, 26])
          box([side * 11.28, 18.5, z], [0.16, 1.95, 0.3], hull, 0, false);
        for (const x of [12, 16])
          rod(
            [side * x, floorAt(side * x), 26],
            [side * x, 20, 26],
            0.23,
            frame,
            true,
          );
      }
    }
    fittings.push({
      id: "engineering",
      localCenter: [0, 15, 33],
      localLookAt: [-14, 11, 33],
      localFootprint: [10, 17.5, 26.5, 39.5],
      localBounds: [23, 42],
    });
    flush("wreck_pressure_engineering_service");
    fittingOffsetZ = 0;

    const interior = addResearchInterior({
      root,
      keep,
      box,
      rod,
      shape,
      ring,
      flush,
      localSolids,
      fittingPoint,
      materials: { hull, frame, foil, black, orange, blue },
      geometries: { sphere: sphereGeometry, ring: ringGeometry },
    });
    fittings.push(...interior.rooms);
    fittings.sort((a, b) => a.localCenter[2] - b.localCenter[2]);
    // 五道隔舱墙形成六个独立空间，中门保留成体通行和高位支路。

    fittingsMode = false;
    const bulkheadZ = [-42, -20, 2, 23, 42].map((z) => z * 1.2);
    const doorwayX = [12, -12, 12, -12, 12];
    for (const [index, z] of bulkheadZ.entries()) {
      // 错位门洞让玩家进入各舱后重新寻找下一扇门；入口无法望穿全船。
      const doorX = doorwayX[index];
      for (const [left, right] of [
        [-21.95, doorX - 9],
        [doorX + 9, 21.95],
      ]) {
        if (right - left < 0.01) continue;
        box(
          [(left + right) / 2, 17.3625, z],
          [right - left, 33.475, 1.2],
          hull,
        );
        if (right - left > 8) {
          for (const face of [-1, 1]) {
            // 面板整体高出隔墙；不在同一个深度平面重复绘制。
            box(
              [(left + right) / 2, 19, z + face * 0.9],
              [right - left - 2, 23, 0.35],
              black,
              0,
              false,
            );
            box(
              [(left + right) / 2, 19, z + face * 1.16],
              [right - left - 2.8, 21.8, 0.3],
              hull,
              0,
              false,
            );
            box(
              [(left + right) / 2, 8.9, z + face * 1.4],
              [right - left - 3, 1.3, 0.22],
              index % 2 ? blue : orange,
              0,
              false,
            );
            for (let seam = left + 4; seam < right - 2; seam += 6)
              box(
                [seam, 19, z + face * 1.38],
                [0.18, 20, 0.2],
                frame,
                0,
                false,
              );
          }
        }
      }
      for (const x of [doorX - 9.15, doorX + 9.15])
        box([x, 17.36, z], [0.6, 33.47, 1.8], frame);
      for (const face of [-1, 1])
        box(
          [doorX, 34.6, z + face * 1],
          [19.2, 0.7, 0.35],
          index % 2 ? blue : orange,
          0,
          false,
        );
      box([-26.7, 20, z], [9.1, 28, 1.2], hull);
      box([26.7, 16.4, z], [9.1, 20.8, 1.2], hull);
      for (const side of [-1, 1]) {
        box([side * 24.1, 3.3, z], [3.9, 5.35, 1.2], hull);
        box([side * 22.2, 17.5, z], [0.5, 33.75, 1.55], frame);
        for (let y = 1.5; y < 6; y += 1) {
          const edge = 25.1 + y - 0.5;
          box(
            [(side * (26 + edge)) / 2, y, z],
            [Math.max(0.1, edge - 26), 1, 1.2],
            hull,
          );
        }
        for (let y = 34.5; y < 40; y += 1) {
          const edge = 65.1 - y - 0.5;
          if (edge > 25)
            box([(side * (25 + edge)) / 2, y, z], [edge - 25, 1, 1.2], hull);
        }
      }
      box([22.7, 30.5, z], [1.1, 7.6, 1.2], hull);
      box([31, 30.5, z], [0.5, 7.6, 1.2], hull);
      box([26.7, 34.45, z], [9.1, 0.3, 1.2], hull);
      box([0, 37.6, z], [50, 5.6, 1.2], hull);
      box([0, 34.45, z], [44.9, 0.7, 1.55], orange);
      for (const x of [23.25, 30.75])
        box([x, 30.5, z], [0.25, 7.6, 1.55], frame);
      for (const y of [26.8, 34.3]) box([27, y, z], [7.75, 0.25, 1.55], orange);
      // 装配层、检修盖板和锁销沿两面门框布置，接近时也有真实厚度。
      for (const face of [-1, 1]) {
        for (const x of [-24, 24]) {
          box([x, 18, z + face * 0.8], [1.4, 26, 0.25], black, 0, false);
          for (const y of [8, 15, 22, 29])
            box([x, y, z + face * 1.02], [2, 0.45, 0.3], frame, 0, false);
        }
        box([0, 37, z + face * 0.8], [20, 2, 0.25], frame, 0, false);
      }
    }
    flush("wreck_room_bulkheads");

    box([26.9, 26.5, 0], [8.5, 0.7, 160.8], frame);
    box([26.9, 34.9, 0], [8.5, 0.5, 160.8], hull);
    for (const [start, end] of [
      [-80.4, -70.8],
      [-61.2, 61.2],
      [70.8, 80.4],
    ]) {
      let cursor = start;
      for (const z of bulkheadZ.filter((z) => z > start && z < end)) {
        box(
          [22.4, 30.75, (cursor + z - 0.8) / 2],
          [0.6, 7.8, z - 0.8 - cursor],
          hull,
        );
        cursor = z + 0.8;
      }
      box([22.4, 30.75, (cursor + end) / 2], [0.6, 7.8, end - cursor], hull);
    }
    for (const z of [-66, 66]) {
      box([22.4, 26.9, z], [0.6, 0.1, 9.6], hull);
      box([22.4, 34.5, z], [0.6, 0.3, 9.6], hull);
      for (const dz of [-4.8, 4.8])
        box([22.4, 30.75, z + dz], [0.85, 7.8, 0.35], orange);
    }
    for (const z of [-44.4, -16.8, 13.2, 39.6])
      rod([31, 22.5, z], [22.65, 26.15, z], 0.22, frame, true);
    flush("wreck_starboard_service_loop");
    addPressureLining({
      box,
      rod,
      flush,
      materials: { hull, frame, foil, black, orange, blue },
    });

    // 舱底裂隙的附生杯群提供自然微光，废弃仪器不通电。
    const colony = keep(
      new THREE.MeshStandardMaterial({
        color: "#658b7d",
        roughness: 0.83,
        emissive: "#8aac96",
        emissiveIntensity: 0.16,
      }),
    );
    addSurfaceDetail(colony, "stone", 0.16);
    addEuropaColonySurface(colony, time);
    const cup = keep(createSiphonColonyGeometry());
    for (let n = 0; n < 9; n++) {
      dummy.position.set(
        21.5 + (n % 3) * 0.48,
        0.68,
        -6 + Math.floor(n / 3) * 1.2,
      );
      dummy.rotation.set(0, n * 0.4, 0.15);
      dummy.scale.setScalar(0.22 + (n % 3) * 0.035);
      dummy.updateMatrix();
      add(cup, colony, dummy.matrix);
    }
    flush("wreck_flooded_science_gallery");
    yield "research-gallery";

    // 舱底与真实海床之间由损坏的承压脚和液压杆连接，脚盘逐个落地。
    const feet = [];
    const disk = keep(
      new THREE.CylinderGeometry(3.2 * scale, 3.6 * scale, 0.65 * scale, 24),
    );
    for (const side of [-1, 1])
      for (const z of [-57, 57]) {
        const mount = new THREE.Vector3(side * 29, 6, z * 1.2),
          localFoot = new THREE.Vector3(
            side * 41,
            -8,
            (z + (z < 0 ? -9 : 9)) * 1.2,
          ),
          worldFoot = localFoot.clone().applyMatrix4(root.matrixWorld);
        // 每块地脚盘按自己的坡面定向，再采样整圈底面防止放大后穿坡。
        const normal = new THREE.Vector3(
          heightAt(worldFoot.x - 0.5, worldFoot.z) -
            heightAt(worldFoot.x + 0.5, worldFoot.z),
          1,
          heightAt(worldFoot.x, worldFoot.z - 0.5) -
            heightAt(worldFoot.x, worldFoot.z + 0.5),
        ).normalize();
        const worldDisk = new THREE.Mesh(disk, frame);
        worldDisk.name = "research_wreck_terrain_foot";
        worldDisk.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          normal,
        );
        let footY = -Infinity;
        const offsets = [];
        for (const radius of [0, 1.8 * scale, 3.6 * scale])
          for (let n = 0; n < 24; n++) {
            const angle = (n / 24) * Math.PI * 2;
            const offset = new THREE.Vector3(
              Math.cos(angle) * radius,
              -0.325 * scale,
              Math.sin(angle) * radius,
            ).applyQuaternion(worldDisk.quaternion);
            footY = Math.max(
              footY,
              heightAt(worldFoot.x + offset.x, worldFoot.z + offset.z) -
                offset.y,
            );
            offsets.push(offset.toArray());
          }
        worldFoot.y = footY + 0.025 * scale;
        const foot = root.worldToLocal(worldFoot.clone());
        feet.push(worldFoot.toArray());
        rod(mount.toArray(), foot.toArray(), 0.62, frame, true);
        const middle = mount.clone().lerp(foot, 0.62);
        rod(mount.toArray(), middle.toArray(), 0.88, hull, true);
        worldDisk.position.copy(worldFoot);
        worldDisk.userData.supportOffsets = offsets;
        parent.add(worldDisk);
        colliders.push({
          type: "ellipsoid",
          id: `europa_wreck_foot_${feet.length}`,
          x: worldFoot.x,
          y: worldFoot.y,
          z: worldFoot.z,
          axes: new THREE.Vector3(3.6, 0.55, 3.6).multiplyScalar(scale),
          rotation: worldDisk.quaternion.clone(),
        });
      }
    // 横向断开的蓝灰散热翼保留网格与金属边框，区别于水面船帆。
    for (const side of [-1, 1]) {
      box([side * 38, 30, 10.8], [12, 0.85, 23], frame, side * 0.25);
      for (let n = 0; n < 7; n++)
        box(
          [
            side * 38 - Math.sin(side * 0.25) * 0.55,
            30 + Math.cos(0.25) * 0.55,
            n * 2.7,
          ],
          [10.5, 0.16, 2.3],
          blue,
          side * 0.25,
          false,
        );
      rod([side * 30, 31, -1.2], [side * 39, 31, 12], 0.25, frame);
    }
    // 高增益天线是有凹面的反射器及三根馈源支撑，不用球代替。
    const dish = keep(
      new THREE.LatheGeometry(
        [
          [0, 0],
          [1.8, -0.18],
          [4, 0.2],
          [7, 1.4],
          [8, 2],
          [8, 1.72],
          [7, 1.12],
          [4, -0.08],
          [1.8, -0.46],
          [0, -0.28],
        ]
          .reverse()
          .map(([r, y]) => new THREE.Vector2(r, y)),
        32,
      ),
    );
    dummy.position.set(-6, 44, 19.2);
    dummy.rotation.set(0.28, 0.2, -0.3);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    add(dish, hull, dummy.matrix);
    const dishMatrix = dummy.matrix.clone();
    const dishRotation = dummy.rotation.clone();
    const dishCenter = new THREE.Vector3(0, 0.9, 0)
      .applyMatrix4(dummy.matrix)
      .applyMatrix4(root.matrixWorld);
    colliders.push({
      type: "ellipsoid",
      id: "europa_wreck_dish",
      x: dishCenter.x,
      y: dishCenter.y,
      z: dishCenter.z,
      axes: new THREE.Vector3(8, 1.2, 8).multiplyScalar(scale),
      rotation: root.quaternion.clone().multiply(dummy.quaternion),
    });
    rod([-6, 38, 19.2], [-6, 44, 19.2], 0.45, frame, true);
    const feed = new THREE.Vector3(0, 6, 0).applyMatrix4(dishMatrix);
    for (const angle of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
      const rim = new THREE.Vector3(
        Math.cos(angle) * 7,
        1.4,
        Math.sin(angle) * 7,
      ).applyMatrix4(dishMatrix);
      rod(rim.toArray(), feed.toArray(), 0.14, frame);
    }
    box(
      feed.toArray(),
      [1.3, 1.2, 1.3],
      black,
      [dishRotation.x, dishRotation.y, dishRotation.z],
      false,
    );
    flush("wreck_landing_frame_and_hardware");
    yield "research-hardware";
    for (const solid of localSolids) {
      if (solid.a) {
        colliders.push({
          type: "capsule",
          id: `europa_wreck_strut_${colliders.length}`,
          a: solid.a.clone().applyMatrix4(root.matrixWorld),
          b: solid.b.clone().applyMatrix4(root.matrixWorld),
          radius: solid.radius * scale,
        });
      } else {
        const center = new THREE.Vector3(...solid.p).applyMatrix4(
          root.matrixWorld,
        );
        colliders.push({
          type: "box",
          id: `europa_wreck_panel_${colliders.length}`,
          x: center.x,
          y: center.y,
          z: center.z,
          halfSize: new THREE.Vector3(...solid.sizes).multiplyScalar(
            0.5 * scale,
          ),
          rotation: root.quaternion.clone().multiply(solid.q),
        });
      }
    }
    const routeLocal = [
      [0, 21, -98.4],
      [0, 21, -66],
    ];
    for (let i = 0; i < bulkheadZ.length; i++) {
      routeLocal.push(
        [doorwayX[i], 21, bulkheadZ[i] - 5],
        [doorwayX[i], 21, bulkheadZ[i] + 5],
      );
      if (i < bulkheadZ.length - 1)
        routeLocal.push([0, 21, (bulkheadZ[i] + bulkheadZ[i + 1]) / 2]);
    }
    routeLocal.push([0, 21, 66], [0, 21, 98.4]);
    const route = routeLocal.map((p) =>
      new THREE.Vector3(...p).applyMatrix4(root.matrixWorld),
    );
    const sideRoute = [
      [51, 18, -7.5],
      [35, 18, -7.5],
      [19, 18, -7.5],
      [7, 19, -9],
      [0, 21, -10.8],
    ].map((p) => new THREE.Vector3(...p).applyMatrix4(root.matrixWorld));
    const serviceRoute = [
      [0, 30.5, -66],
      [27, 30.5, -66],
      [27, 30.5, -10.8],
      [27, 30.5, 14.4],
      [27, 30.5, 66],
      [0, 30.5, 66],
      ...routeLocal
        .slice(1, -1)
        .reverse()
        .map((p) => [p[0], 30.5, p[2]]),
    ].map((p) => new THREE.Vector3(...p).applyMatrix4(root.matrixWorld));
    const rooms = fittings.map((room) => {
      const localCenter = fittingPoint(room.localCenter);
      const localLookAt = fittingPoint(room.localLookAt);
      return {
        ...room,
        localCenter,
        localLookAt,
        localBounds: room.localBounds.map((z) => z * 1.2),
        localFootprint: room.localFootprint.map((v, i) =>
          i < 2 ? v + 13 : v * 1.2,
        ),
        position: new THREE.Vector3(...localCenter).applyMatrix4(
          root.matrixWorld,
        ),
        lookAt: new THREE.Vector3(...localLookAt).applyMatrix4(
          root.matrixWorld,
        ),
      };
    });
    root.userData.galleryRoute = route;
    root.userData.sideBreachRoute = sideRoute;
    root.userData.rooms = rooms;
    root.userData.bulkheadZ = bulkheadZ;
    root.userData.doorwayX = doorwayX;
    root.userData.galleryRouteLocal = routeLocal;
    root.userData.serviceLoopRoute = serviceRoute;
    root.userData.serviceClearance = {
      width: 7.25 * scale,
      height: 7.25 * scale,
      bodyLengths: [10, 16],
    };
    root.userData.supportSamples = supportSamples;
    root.userData.centralClearWidth = 17.7 * scale;
    root.userData.breachBounds = { x: 32, y: [6, 34], z: [-12, 20.4] };
    root.userData.localSolids = localSolids;
    root.userData.supportFeet = feet;
    // 残骸碎片按各自海床法线落地，避免把斜坡上的散落物悬在空中。
    const debris = new THREE.Group();
    debris.name = "europa_research_debris";
    parent.add(debris);
    for (let i = 0; i < 9; i++) {
      const x = site.x + (25 + i * 4.2) * scale,
        z = site.z + (38 + Math.sin(i * 2.1) * 14) * scale,
        normal = new THREE.Vector3(
          heightAt(x - 0.5, z) - heightAt(x + 0.5, z),
          1,
          heightAt(x, z - 0.5) - heightAt(x, z + 0.5),
        ).normalize(),
        piece = new THREE.Mesh(boxGeometry, i % 3 ? hull : blue);
      piece.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      piece.scale.set(3 + (i % 3), 0.65, 4 + (i % 2) * 2).multiplyScalar(scale);
      let supportY = -Infinity;
      for (const dx of [-0.5, 0, 0.5])
        for (const dz of [-0.5, 0, 0.5]) {
          const offset = new THREE.Vector3(
            dx * piece.scale.x,
            -0.5 * piece.scale.y,
            dz * piece.scale.z,
          ).applyQuaternion(piece.quaternion);
          supportY = Math.max(
            supportY,
            heightAt(x + offset.x, z + offset.z) - offset.y,
          );
        }
      piece.position.set(x, supportY + 0.06 * scale, z);
      debris.add(piece);
    }
    yield "research-debris";
    return {
      root,
      prepareMaterials: () =>
        Promise.all([bowAsset.prepare(), interior.prepareMaterials()]),
      colliders,
      feet,
      route,
      routes: [
        { id: "through_gallery", points: route, bodyLengths: [32] },
        { id: "starboard_breach", points: sideRoute, bodyLengths: [32] },
        {
          id: "starboard_service_loop",
          points: serviceRoute,
          bodyLengths: [10, 16],
        },
      ],
      rooms,
      landmark: {
        name: "坠毁科考船",
        position: new THREE.Vector3(0, 18, 0).applyMatrix4(root.matrixWorld),
      },
      lightSources: [
        {
          position: new THREE.Vector3(21.5, 3, -4).applyMatrix4(
            root.matrixWorld,
          ),
          color: 0x77acaf,
          intensity: 38,
          distance: 70 * scale,
        },
      ],
    };
  } finally {
    for (const copies of batches.values()) for (const g of copies) g.dispose();
    batches.clear();
  }
}
