import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { addSurfaceDetail } from "./ocean_visuals.js";
import {
  addEuropaColonySurface,
  createSiphonColonyGeometry,
} from "./europa_environment_geometry.js";

export const EUROPA_WRECK_SITE = Object.freeze({
  x: 65,
  z: -470,
  yaw: Math.PI / 2,
  gallery: Object.freeze({ width: 36, height: 30, length: 60 }),
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
    slope =
      (heightAt(site.x, site.z - 12) - heightAt(site.x, site.z + 12)) / 24;
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
  for (const x of [-13, 0, 13])
    for (let z = -30; z <= 30; z += 5) {
      const p = new THREE.Vector3(x, -0.8, z).applyQuaternion(root.quaternion);
      supportedY = Math.max(
        supportedY,
        heightAt(site.x + p.x, site.z + p.z) - p.y,
      );
    }
  root.position.y = supportedY + 0.25;
  root.updateMatrixWorld(true);
  const colliders = [],
    batches = new Map(),
    localSolids = [];
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
        "#include <dithering_fragment>",
        `float wear = detailNoise(vSurfaceDetail * .22);
         float scratch = smoothstep(.986, .999, abs(sin(vSurfaceDetail.z * 5.4 + vSurfaceDetail.x * .7)));
         gl_FragColor.rgb *= .9 + wear * .1 - scratch * .16;
         #include <dithering_fragment>`,
      );
    };
    m.customProgramCacheKey = () => `${key}_crashed_lander_wear`;
    return m;
  };
  const hull = makeMaterial("wreck_ceramic_panels", "#a7aaa2", 0.28),
    frame = makeMaterial("wreck_titanium_structure", "#4c6269", 0.7),
    foil = makeMaterial("wreck_folded_thermal_blanket", "#907a52", 0.55),
    black = makeMaterial("wreck_dark_equipment", "#24363e", 0.35),
    orange = makeMaterial("wreck_mission_markings", "#a76845", 0.2),
    blue = makeMaterial("wreck_radiator_cells", "#31495d", 0.45, 0.5);
  const boxGeometry = keep(new RoundedBoxGeometry(1, 1, 1, 1, 0.035)),
    rodGeometry = keep(new THREE.CylinderGeometry(1, 1, 1, 8));
  const add = (geometry, material, matrix) => {
    const copy = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    copy.applyMatrix4(matrix);
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(copy);
  };
  const dummy = new THREE.Object3D();
  function box(p, sizes, material, rotationZ = 0, solid = true) {
    dummy.position.fromArray(p);
    dummy.rotation.set(0, 0, rotationZ);
    dummy.scale.fromArray(sizes);
    dummy.updateMatrix();
    add(boxGeometry, material, dummy.matrix);
    if (solid)
      localSolids.push({ p: [...p], sizes, q: dummy.quaternion.clone() });
  }
  function rod(a, b, radius, material, solid = false) {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b),
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
      [-13, 0],
      [13, 0],
      [19, 6],
      [19, 26],
      [12, 33],
      [-12, 33],
      [-19, 26],
      [-19, 6],
    ];
    for (let edge = 0; edge < outline.length; edge++) {
      const a = outline[edge],
        b = outline[(edge + 1) % outline.length],
        width = Math.hypot(b[0] - a[0], b[1] - a[1]),
        angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const sections =
        edge === 2
          ? [
              [-20, 20],
              [23, 12],
            ]
          : [[0, 60]];
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
    // 承力环、铆钉和分块覆板让大轮廓在普通相机距离就能被辨认。
    for (const z of [-29, -18, -6, 6, 18, 29])
      for (let edge = 0; edge < outline.length; edge++) {
        const a = outline[edge],
          b = outline[(edge + 1) % 8];
        rod([a[0], a[1], z], [b[0], b[1], z], 0.42, frame);
        for (const y of [8, 15, 22])
          if (edge === 2 || edge === 6)
            box(
              [a[0] + (edge === 2 ? 0.1 : -0.1), y, z],
              [0.45, 0.45, 0.65],
              black,
              0,
              false,
            );
      }
    box([-18.6, 20, -6], [0.28, 3.5, 27], orange, 0, false);
    box([-18.7, 15, -8], [0.3, 0.65, 24], frame, 0, false);
    box([0, 33.6, 0], [16, 0.4, 38], foil, 0, false);
    for (let z = -17; z < 19; z += 3)
      box([0, 34, z], [16.2, 0.18, 0.22], frame, 0, false);
    flush("wreck_pressure_hull");
    yield "research-pressure-hull";

    // 仪器留在两侧，中央二十多米宽的贯通通道不塞家具。
    for (const side of [-1, 1])
      for (const z of [-20, -3, 16]) {
        box([side * 12, 5.5, z], [4, 8, 8], black);
        box([side * 9.8, 6, z], [0.35, 5.4, 6.7], frame, 0, false);
        for (let i = 0; i < 5; i++)
          box([side * 9.55, 4 + i, z], [0.22, 0.22, 5.6], hull, 0, false);
        rod([side * 13, 11, z - 4], [side * 13, 11, z + 4], 0.13, foil);
      }
    // 断裂隔舱只保留上方曲肋，不是堵住出入口的一块整面玻璃。
    for (const z of [-27, 27]) {
      rod([-13, 29, z], [0, 33, z], 0.55, frame);
      rod([0, 33, z], [13, 29, z], 0.55, frame);
    }
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
        8.5 + (n % 3) * 0.48,
        0.35,
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
    for (const side of [-1, 1])
      for (const z of [-22, 23]) {
        const mount = new THREE.Vector3(side * 16, 6, z),
          localFoot = new THREE.Vector3(side * 28, -8, z + (z < 0 ? -10 : 10)),
          worldFoot = localFoot.clone().applyMatrix4(root.matrixWorld);
        worldFoot.y = heightAt(worldFoot.x, worldFoot.z) + 0.35;
        const foot = root.worldToLocal(worldFoot.clone());
        feet.push(worldFoot.toArray());
        rod(mount.toArray(), foot.toArray(), 0.62, frame, true);
        const middle = mount.clone().lerp(foot, 0.62);
        rod(mount.toArray(), middle.toArray(), 0.88, hull, true);
        const disk = keep(new THREE.CylinderGeometry(3.2, 3.6, 0.65, 12));
        const worldDisk = new THREE.Mesh(disk, frame);
        // 地脚盘单独沿坡法线定向，不受舱体翻滚的错误旋转影响。
        const normal = new THREE.Vector3(
          heightAt(worldFoot.x - 0.5, worldFoot.z) -
            heightAt(worldFoot.x + 0.5, worldFoot.z),
          1,
          heightAt(worldFoot.x, worldFoot.z - 0.5) -
            heightAt(worldFoot.x, worldFoot.z + 0.5),
        ).normalize();
        worldDisk.position.copy(worldFoot);
        worldDisk.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          normal,
        );
        parent.add(worldDisk);
        colliders.push({
          type: "ellipsoid",
          id: `europa_wreck_foot_${feet.length}`,
          x: worldFoot.x,
          y: worldFoot.y,
          z: worldFoot.z,
          axes: new THREE.Vector3(3.6, 0.55, 3.6),
          rotation: worldDisk.quaternion.clone(),
        });
      }
    // 横向断开的蓝灰散热翼保留网格与金属边框，区别于水面船帆。
    for (const side of [-1, 1]) {
      box([side * 25, 22, 9], [12, 0.85, 23], frame, side * 0.25);
      for (let n = 0; n < 7; n++)
        box(
          [
            side * 25 - Math.sin(side * 0.25) * 0.55,
            22 + Math.cos(0.25) * 0.55,
            n * 2.7,
          ],
          [10.5, 0.16, 2.3],
          blue,
          side * 0.25,
          false,
        );
      rod([side * 17, 23, -1], [side * 26, 23, 10], 0.25, frame);
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
        ].map(([r, y]) => new THREE.Vector2(r, y)),
        32,
      ),
    );
    dummy.position.set(-6, 36, 16);
    dummy.rotation.set(0.28, 0.2, -0.3);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    add(dish, hull, dummy.matrix);
    const dishCenter = new THREE.Vector3(0, 0.9, 0)
      .applyMatrix4(dummy.matrix)
      .applyMatrix4(root.matrixWorld);
    colliders.push({
      type: "ellipsoid",
      id: "europa_wreck_dish",
      x: dishCenter.x,
      y: dishCenter.y,
      z: dishCenter.z,
      axes: new THREE.Vector3(8, 1.2, 8),
      rotation: root.quaternion.clone().multiply(dummy.quaternion),
    });
    rod([-6, 30, 16], [-6, 36, 16], 0.45, frame, true);
    for (const offset of [
      [-6, 0],
      [6, 0],
      [0, 6],
    ])
      rod([-6 + offset[0], 37.5, 16 + offset[1]], [-6, 42, 16], 0.14, frame);
    box([-6, 42, 16], [1.3, 1.2, 1.3], black, 0, false);
    flush("wreck_landing_frame_and_hardware");
    yield "research-hardware";
    for (const solid of localSolids) {
      if (solid.a) {
        colliders.push({
          type: "capsule",
          id: `europa_wreck_strut_${colliders.length}`,
          a: solid.a.clone().applyMatrix4(root.matrixWorld),
          b: solid.b.clone().applyMatrix4(root.matrixWorld),
          radius: solid.radius,
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
          halfSize: new THREE.Vector3(...solid.sizes).multiplyScalar(0.5),
          rotation: root.quaternion.clone().multiply(solid.q),
        });
      }
    }
    const route = [-53, 0, 53].map((z) =>
      new THREE.Vector3(0, 15, z).applyMatrix4(root.matrixWorld),
    );
    root.userData.galleryRoute = route;
    root.userData.supportFeet = feet;
    // 残骸碎片按各自海床法线落地，避免把斜坡上的散落物悬在空中。
    const debris = new THREE.Group();
    debris.name = "europa_research_debris";
    parent.add(debris);
    for (let i = 0; i < 9; i++) {
      const x = site.x + 25 + i * 4.2,
        z = site.z + 38 + Math.sin(i * 2.1) * 14,
        normal = new THREE.Vector3(
          heightAt(x - 0.5, z) - heightAt(x + 0.5, z),
          1,
          heightAt(x, z - 0.5) - heightAt(x, z + 0.5),
        ).normalize(),
        piece = new THREE.Mesh(boxGeometry, i % 3 ? hull : blue);
      piece.position.set(x, heightAt(x, z) + 0.7, z);
      piece.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      piece.scale.set(3 + (i % 3), 0.65, 4 + (i % 2) * 2);
      debris.add(piece);
    }
    yield "research-debris";
    return {
      root,
      colliders,
      feet,
      route,
      landmark: {
        name: "坠毁科考船",
        position: new THREE.Vector3(0, 18, 0).applyMatrix4(root.matrixWorld),
      },
      lightSources: [
        {
          position: new THREE.Vector3(8.5, 3, -4).applyMatrix4(
            root.matrixWorld,
          ),
          color: 0x77acaf,
          intensity: 38,
          distance: 70,
        },
      ],
    };
  } finally {
    for (const copies of batches.values()) for (const g of copies) g.dispose();
    batches.clear();
  }
}
