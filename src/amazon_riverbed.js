import { acquireAmazonRoot } from "./amazon_root_asset.js";
import { fitAmazonDriftwood } from "./amazon_driftwood_placement.js";
import { acquireAmazonDriftwood } from "./amazon_driftwood_asset.js";
import * as THREE from "three";
import {
  amazonChannels,
  amazonSeabedHeight,
  amazonIslandBounds,
  amazonIslandCeiling,
} from "./amazon_config.js";
import { broadLeafGeometry } from "./amazon_forest.js";
import { addSurfaceDetail } from "./ocean_visuals.js";

/** 淤泥河床、冲刷河石、沉木根系和水草；按空间分块实例化，航道保留成年净空。 */
export function* createAmazonRiverbedSteps(parent, resources, colliders) {
  const keep = (r) => (resources.add(r), r),
    root = new THREE.Group();
  root.name = "amazon_flooded_riverbed";
  parent.add(root);
  const stone = keep(
      new THREE.MeshStandardMaterial({ color: "#918066", roughness: 0.99 }),
    ),
    leaf = keep(
      new THREE.MeshStandardMaterial({
        color: "#70874a",
        roughness: 0.85,
        side: THREE.DoubleSide,
      }),
    ),
    shell = keep(
      new THREE.MeshStandardMaterial({ color: "#8d8068", roughness: 0.69 }),
    );
  addSurfaceDetail(stone, "stone", 0.65);
  const driftwood = acquireAmazonDriftwood();
  // 回收入口纳入既有构造事务；取消建图也释放引用，悬根仍使用原网格。
  keep({ dispose: driftwood.release });
  const hanging = acquireAmazonRoot("hanging");
  keep({ dispose: hanging.release });
  root.userData.prepareMaterials = async (options) =>
    Promise.all([driftwood.prepare(options), hanging.prepare(options)]);
  void hanging.prepare();
  void driftwood.prepare();
  const clock = { value: 0 };
  leaf.onBeforeCompile = (shader) => {
    shader.uniforms.riverPlantTime = clock;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float riverPlantTime;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.x += sin(position.z * 0.7 + riverPlantTime) * 0.12 * position.z;",
      );
  };
  leaf.customProgramCacheKey = () => "amazon_riverbed_plants_v2";
  const rock = keep(new THREE.IcosahedronGeometry(1, 2)),
    rp = rock.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const x = rp.getX(i),
      y = rp.getY(i),
      z = rp.getZ(i),
      n = 1 + 0.16 * Math.sin(x * 9 + z * 5) * Math.cos(y * 7 - z * 3);
    rp.setXYZ(i, x * n, y * n * 0.65, z * n);
  }
  rock.computeVertexNormals();
  const hangingGeometry = keep(hanging.geometry.clone());
  // 将根束主体拟合在原胶囊下半段；上端埋入顶棚，避免只有末梢露出。
  hangingGeometry.scale(14, 14, 7);
  hangingGeometry.translate(0, 0, 2.4);
  const blade = keep(broadLeafGeometry(1, 0.18)),
    mussel = keep(new THREE.SphereGeometry(1, 12, 8));
  mussel.scale(0.8, 0.3, 1.2);
  const allRocks = [],
    logGroups = [];
  const chunks = [],
    dummy = new THREE.Object3D();
  let seed = 527196;
  const rand = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let z = -1220; z < -170; z += 70) {
    const items = { rocks: [], logs: [], leaves: [], shells: [] };
    for (let j = 0; j < 48; j++) {
      const pz = z + rand() * 70,
        ch = amazonChannels(pz)[j % 2],
        under = j % 3 === 0,
        b = amazonIslandBounds(pz),
        x =
          under && b
            ? THREE.MathUtils.lerp(b.left + 12, b.right - 12, rand())
            : ch.center +
              (rand() < 0.5 ? -1 : 1) * ch.halfWidth * (0.5 + rand() * 0.31),
        y = amazonSeabedHeight(x, pz);
      if (y > -12) continue;
      const size = 1.2 + rand() * 3.6,
        stoneZ = size * (0.85 + rand() * 0.6),
        stoneYaw = rand() * 6.28;
      items.rocks.push({
        p: [x, y + size * 0.17, pz],
        s: [size, size * 0.72, stoneZ],
        yaw: stoneYaw,
        tint: j % 3 ? "#a18d72" : "#615846",
      });
      colliders.push({
        type: "ellipsoid",
        kind: "riverbed_stone",
        x,
        y: y + size * 0.17,
        z: pz,
        axes: {
          x: size * 1.14,
          y: size * 0.72 * 0.65 * 1.14,
          z: stoneZ * 1.14,
        },
        rotation: new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          stoneYaw,
        ),
      });
      if (j % 5 === 0) {
        const route = [-330, -650, -940].some((g) => Math.abs(pz - g) < 24),
          center = Math.abs(x) < 35;
        if (!route && !center) {
          const yaw = rand() * 6.28,
            scale = 0.65 + rand() * 0.75;
          items.logs.push({
            p: [x, y + 1, pz],
            s: [scale, scale, scale],
            yaw,
            tint: j % 2 ? "#766244" : "#4f4230",
          });
          const a = new THREE.Vector3(
              -Math.sin(yaw) * 6 * scale + x,
              y + 1,
              -Math.cos(yaw) * 6 * scale + pz,
            ),
            b = new THREE.Vector3(
              Math.sin(yaw) * 6 * scale + x,
              y + 1,
              Math.cos(yaw) * 6 * scale + pz,
            );
          const contact = {
            type: "capsule",
            kind: "submerged_driftwood",
            a,
            b,
            radius: scale * 0.9,
          };
          colliders.push(contact);
          items.logs.at(-1).collider = contact;
        }
      }
      for (let k = 0; k < 7; k++) {
        const px = x + (rand() - 0.5) * 6,
          pzz = pz + (rand() - 0.5) * 6;
        items.leaves.push({
          p: [px, amazonSeabedHeight(px, pzz) + 0.2, pzz],
          s: [0.8 + rand(), 1, 2 + rand() * 4],
          yaw: rand() * 6.28,
          tint: k % 2 ? "#7d9657" : "#52673b",
        });
      }
      if (j % 4 === 0)
        for (let k = 0; k < 9; k++) {
          const px = x + (rand() - 0.5) * 3,
            pzz = pz + (rand() - 0.5) * 3;
          items.shells.push({
            p: [px, amazonSeabedHeight(px, pzz) + 0.04, pzz],
            s: [0.18, 0.18, 0.28],
            yaw: rand() * 6.28,
            tint: k % 2 ? "#aa9573" : "#665c46",
          });
        }
    }
    allRocks.push(...items.rocks);
    const group = new THREE.Group();
    group.name = "riverbed_ecology_chunk";
    root.add(group);
    for (const [key, geometry, material] of [
      ["rocks", rock, stone],
      ["logs", driftwood.geometry, driftwood.material],
      ["leaves", blade, leaf],
      ["shells", mussel, shell],
    ]) {
      const values = items[key];
      if (!values.length) continue;
      const mesh = new THREE.InstancedMesh(geometry, material, values.length);
      mesh.name = `river_${key}`;
      values.forEach((v, i) => {
        dummy.position.fromArray(v.p);
        dummy.scale.fromArray(v.s);
        dummy.rotation.set(
          key === "leaves" ? -0.65 : v.pitch || 0,
          v.yaw,
          0,
          key === "logs" ? "YXZ" : "XYZ",
        );
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(
          i,
          new THREE.Color(key === "logs" ? "#ffffff" : v.tint),
        );
      });
      mesh.computeBoundingSphere();
      group.add(mesh);
      if (key === "logs") logGroups.push({ mesh, items: values });
    }
    // 顶棚的根束垂入水中，避免在开口下堆成挡住成年通道的整片栅栏。
    const bounds = amazonIslandBounds(z + 35);
    if (bounds)
      for (const side of [-1, 1]) {
        const x =
            (side < 0 ? bounds.left : bounds.right) + (side < 0 ? 12 : -12),
          pz = z + 32,
          y = amazonIslandCeiling(x, pz),
          scale = 0.8;
        const mesh = new THREE.Mesh(hangingGeometry, hanging.material);
        mesh.name = "island_hanging_root_hf";
        mesh.position.set(x, y + 1, pz);
        mesh.rotation.set(0.8, side * 0.7, 0.3);
        mesh.scale.set(0.6, scale, 0.8);
        group.add(mesh);
        mesh.updateMatrixWorld(true);
        const a = new THREE.Vector3(0, 0, -6).applyMatrix4(mesh.matrixWorld),
          b = new THREE.Vector3(0, 0, 6).applyMatrix4(mesh.matrixWorld);
        colliders.push({
          type: "capsule",
          kind: "island_hanging_root",
          a,
          b,
          radius: 0.7,
        });
      }
    chunks.push({ group, z: z + 35 });
    yield "riverbed-ecology";
  }
  // 全部河石生成后再摆放，避免跨分块边缘时漏检相邻石块。
  for (const { mesh, items } of logGroups) {
    items.forEach((item, i) => {
      fitAmazonDriftwood(item, allRocks);
      dummy.position.fromArray(item.p);
      dummy.scale.fromArray(item.s);
      dummy.rotation.set(item.pitch || 0, item.yaw, 0, "YXZ");
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }
  return {
    root,
    update(t, position) {
      clock.value = t;
      for (const c of chunks)
        c.group.visible = Math.abs(position.z - c.z) < 255;
    },
  };
}
