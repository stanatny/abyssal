import * as THREE from "three";
import { createOdysseyMergeBucket } from "./odyssey_environment_geometry.js";

/** 开敞石门与破损古桨船；按实心构件建立碰撞，保留侧开口与上方自由通道。 */
export function* createOdysseyLandmarksSteps(
  parent,
  { keep, resources, kit, heightAt, colliders },
) {
  const { materials: m, box, column, disk, torus, pot, rock } = kit;
  const landmarks = [];
  let nextId = 0;
  function boxSolid(bucket, kind, position, scale, mat, rotation = [0, 0, 0]) {
    bucket.emit(box, mat, position, scale, rotation);
    colliders.push({
      type: "box",
      id: `odyssey_${kind}_${nextId++}`,
      kind,
      x: position[0],
      y: position[1],
      z: position[2],
      halfSize: new THREE.Vector3(...scale).multiplyScalar(0.5),
      rotation: new THREE.Quaternion().setFromEuler(
        new THREE.Euler(...rotation),
      ),
    });
  }
  // 柱门不跨越整条航路；柱间净空九十米，门楣上方也能绕行。
  for (const [index, x, z, opening, height] of [
    [0, -55, -275, 92, 43],
    [1, 40, -510, 96, 48],
  ]) {
    const bucket = createOdysseyMergeBucket(keep, resources);
    const tops = [];
    for (const side of [-1, 1]) {
      const px = x + side * (opening * 0.5 + 4),
        samples = [-6, 6].flatMap((dx) =>
          [-6.5, 6.5].map((dz) => heightAt(px + dx, z + dz)),
        ),
        floor = Math.max(...samples),
        lowest = Math.min(...samples);
      boxSolid(
        bucket,
        "gateway_plinth",
        [px, (floor + 3 + lowest) * 0.5, z],
        [12, floor + 3 - lowest, 13],
        m.limestone,
      );
      bucket.emit(
        column,
        m.marble,
        [px, floor + 3 + height * 0.5, z],
        [3.5, height, 3.5],
      );
      colliders.push({
        type: "ellipsoid",
        id: `odyssey_gateway_column_${index}_${side}`,
        x: px,
        y: floor + 3 + height * 0.5,
        z,
        axes: new THREE.Vector3(3.9, height * 0.5, 3.9),
      });
      bucket.emit(disk, m.marble, [px, floor + height + 4, z], [5, 2, 5]);
      boxSolid(
        bucket,
        "gateway_capital",
        [px, floor + height + 6, z],
        [11, 3, 12],
        m.marble,
      );
      for (let ring = 0; ring < 3; ring++)
        bucket.emit(
          torus,
          m.bronze,
          [px, floor + 5 + ring * 2.2, z],
          [3.75, 3.75, 3.75],
          [Math.PI * 0.5, 0, 0],
        );
      tops.push(floor + height + 7.5);
    }
    // 连续水平门楣采用两侧较高顶部，低侧补独立承托，避免斜坡悬浮。
    const top = Math.max(...tops);
    for (const [j, side] of [
      [0, -1],
      [1, 1],
    ])
      if (top > tops[j] + 0.2)
        boxSolid(
          bucket,
          "gateway_upper_support",
          [x + side * (opening * 0.5 + 4), (top + tops[j]) * 0.5, z],
          [10, top - tops[j], 10],
          m.marble,
        );
    boxSolid(
      bucket,
      "gateway_lintel",
      [x, top + 2, z],
      [opening + 20, 4, 11],
      m.marble,
    );
    for (let n = 0; n < 13; n++)
      bucket.emit(
        torus,
        m.bronze,
        [x + (n - 6) * 7.4, top + 2.2, z + 5.58],
        [1.05, 1.05, 0.24],
      );
    // 残存山花是开放的三角框，不用整块不可见盒子封住额外空间。
    for (const side of [-1, 1]) {
      const span = (opening + 24) * 0.5,
        rise = 14;
      const angle = -side * Math.atan2(rise, span);
      boxSolid(
        bucket,
        "gateway_pediment",
        [x + side * span * 0.5, top + 4 + rise * 0.5, z],
        [Math.hypot(span, rise), 2.2, 9],
        m.marble,
        [0, 0, angle],
      );
    }
    for (let n = 0; n < 17; n++) {
      const px = x + (n - 8) * 5.5,
        yy = top + 2.25,
        zz = z + 5.7;
      // 双层回纹带采用低对比的铜石嵌饰，不成为远方闪烁的发光点。
      bucket.emit(box, m.bronze, [px, yy + 0.65, zz], [3.9, 0.12, 0.15]);
      bucket.emit(box, m.bronze, [px + 1.9, yy, zz], [0.12, 1.35, 0.15]);
      bucket.emit(box, m.bronze, [px + 0.65, yy - 0.64, zz], [2.5, 0.12, 0.15]);
    }
    bucket.finish(parent, `odyssey_bronze_gateway_${index}`);
    landmarks.push({
      id: `odyssey_gateway_${index}`,
      name: index ? "双兽峡门" : "涅瑞伊德花园",
      position: new THREE.Vector3(x, heightAt(x, z) + 20, z),
    });
    yield "bronze-gateway";
  }
  // 散落陶罐以六个小型物流遗迹块分布，不覆盖主要转身区。
  for (let patch = 0; patch < 6; patch++) {
    const b = createOdysseyMergeBucket(keep, resources);
    const x = (patch % 2 ? 1 : -1) * (95 + (patch % 3) * 24),
      z = -170 - patch * 100;
    for (let i = 0; i < 15; i++) {
      const px = x + Math.cos(i * 2.399) * (5 + (i % 4) * 3),
        pz = z + Math.sin(i * 2.399) * (6 + (i % 5) * 2),
        y = heightAt(px, pz);
      const scale = 1.3 + (i % 4) * 0.5,
        fall = i % 4 === 0;
      b.emit(
        pot,
        m.terracotta,
        [px, y + (fall ? scale * 0.6 : 0), pz],
        [scale, scale, scale],
        [fall ? 1.15 : 0, i * 0.73, fall ? 0.3 : 0],
      );
    }
    b.finish(parent, `odyssey_amphora_cargo_${patch}`);
    yield "amphora-field";
  }
  const ship = createOdysseyMergeBucket(keep, resources);
  const shipColliderStart = colliders.length;
  const cx = -105,
    cz = -445,
    base = heightAt(cx, cz) + 6,
    length = 90,
    width = 28;
  const deck = base + 4.5;
  // 龙骨与横向肋骨由真实连续横截面形成；中部南侧整段破口开放。
  boxSolid(ship, "galley_keel", [cx, base - 6, cz], [84, 1.1, 2.4], m.wood);
  for (let rib = 0; rib < 19; rib++) {
    const lx = -42 + rib * 4.65,
      taper = Math.max(0.3, Math.sin((Math.PI * (rib + 1)) / 20)),
      half = width * 0.5 * taper;
    for (const side of [-1, 1]) {
      if (side === 1 && Math.abs(lx) < 25) continue;
      const a = new THREE.Vector3(cx + lx, base - 5, cz + side * 0.75),
        end = new THREE.Vector3(cx + lx, deck, cz + side * half);
      const d = end.clone().sub(a),
        center = a.clone().add(end).multiplyScalar(0.5),
        angle = Math.atan2(d.z, d.y);
      boxSolid(
        ship,
        "galley_rib",
        center.toArray(),
        [1.05, d.length(), 0.95],
        m.woodPale,
        [angle, 0, 0],
      );
    }
    if (rib % 3 === 0 && (rib < 5 || rib > 13))
      boxSolid(
        ship,
        "galley_crossbeam",
        [cx + lx, deck - 0.4, cz],
        [1.3, 0.9, half * 2],
        m.woodPale,
      );
  }
  yield "galley-ribs";
  // 外壳采用短船板随船腹收尖；破口不创建隐形整船包围盒。
  for (let section = 0; section < 18; section++) {
    const lx = -42 + section * 4.65,
      taper = Math.max(0.3, Math.sin((Math.PI * (section + 1)) / 19)),
      half = width * 0.5 * taper;
    for (const side of [-1, 1]) {
      const broken = side === 1 && Math.abs(lx) < 25;
      if (broken) continue;
      for (let row = 0; row < 6; row++) {
        const u = (row + 0.5) / 6;
        boxSolid(
          ship,
          "galley_hull_plank",
          [cx + lx, base - 5 + u * 9.5, cz + side * (0.75 + (half - 0.75) * u)],
          [4.56, 1.53, 0.7],
          row % 3 ? m.wood : m.woodPale,
          [-side * 0.72, 0, 0],
        );
      }
      if (section < 5 || section > 12)
        boxSolid(
          ship,
          "galley_bulwark",
          [cx + lx, deck + 2, cz + side * half],
          [4.55, 4.6, 0.85],
          m.wood,
        );
    }
    if (section < 5 || section > 12)
      for (let board = 0; board < 12; board++)
        boxSolid(
          ship,
          "galley_deck_plank",
          [cx + lx, deck, cz + ((board - 5.5) * half) / 6],
          [4.5, 0.6, half / 6 - 0.06],
          m.woodPale,
        );
  }
  yield "galley-planking";
  for (const side of [-1, 1]) {
    // 船首与船尾上翘铜饰由弯曲管构成，刻线与铜钉给正常距离的轮廓提供细节。
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cx + side * 40, deck, cz),
      new THREE.Vector3(cx + side * 45, deck + 5, cz),
      new THREE.Vector3(cx + side * 43, deck + 13, cz),
      new THREE.Vector3(cx + side * 39, deck + 16, cz),
    ]);
    const ornament = keep(new THREE.TubeGeometry(curve, 24, 0.7, 8, false));
    ship.emit(ornament, m.bronze, [0, 0, 0]);
  }
  const mastRotation = [0, 0, -1.09];
  boxSolid(
    ship,
    "galley_broken_mast",
    [cx + 27, deck + 9, cz - 9],
    [1.6, 23, 1.6],
    m.wood,
    mastRotation,
  );
  for (let i = 0; i < 18; i++) {
    const lx = -37 + i * 4.3;
    ship.emit(
      torus,
      m.bronze,
      [cx + lx, deck + 1, cz - 12],
      [0.42, 0.42, 0.42],
      [0, Math.PI * 0.5, 0],
    );
  }
  // 残桨、铜舵轮与残存货物形成古桨船身份；细装饰不膨胀舱内刚体。
  for (let i = 0; i < 10; i++) {
    const x = cx - 31 + i * 6.2;
    ship.emit(
      box,
      m.woodPale,
      [x, deck - 1.5, cz - 18],
      [0.38, 0.42, 15],
      [0.12, 0, 0.04],
    );
    ship.emit(
      box,
      m.wood,
      [x, deck - 2.5, cz - 25],
      [1.05, 0.22, 4.1],
      [0.12, 0, 0.04],
    );
  }
  for (let i = 0; i < 5; i++)
    ship.emit(
      pot,
      m.terracotta,
      [cx + 28 + (i % 2) * 3, deck + 0.3, cz + ((i % 3) - 1) * 2.4],
      [1.25, 1.25, 1.25],
      [0, i * 0.8, 0],
    );
  for (const side of [-1, 1]) {
    ship.emit(
      torus,
      m.bronze,
      [cx + side * 34, deck + 3, cz - 5],
      [2.2, 2.2, 2.2],
      [0, Math.PI * 0.5, 0],
    );
    for (let spoke = 0; spoke < 8; spoke++)
      ship.emit(
        box,
        m.bronze,
        [cx + side * 34, deck + 3, cz - 5],
        [0.12, 4.4, 0.14],
        [(spoke * Math.PI) / 4, 0, 0],
      );
  }
  const wreck = ship.finish(parent, "odyssey_broken_ninety_metre_galley");
  wreck.userData.length = length;
  wreck.userData.width = width;
  // 古船随海床侧坡倾覆；渲染与每一块实心船板一起变换，避免竖柱托起船体。
  const bank = -Math.atan((heightAt(cx, cz + 8) - heightAt(cx, cz - 8)) / 16);
  const bankRotation = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    bank,
  );
  const placement = new THREE.Matrix4()
    .makeTranslation(cx, base, cz)
    .multiply(new THREE.Matrix4().makeRotationX(bank))
    .multiply(new THREE.Matrix4().makeTranslation(-cx, -base, -cz));
  wreck.traverse((n) => {
    if (n.isMesh) n.geometry.applyMatrix4(placement);
  });
  const p = new THREE.Vector3();
  for (let i = shipColliderStart; i < colliders.length; i++) {
    const c = colliders[i];
    p.set(c.x, c.y, c.z).applyMatrix4(placement);
    c.x = p.x;
    c.y = p.y;
    c.z = p.z;
    c.rotation = bankRotation
      .clone()
      .multiply(c.rotation ?? new THREE.Quaternion());
  }
  wreck.userData.seabedBank = bank;
  wreck.userData.interior = new THREE.Vector3(cx, base + 3, cz).applyMatrix4(
    placement,
  );
  // 四块低矮海礁贴着当地海床，断船龙骨嵌入其间。
  const supports = createOdysseyMergeBucket(keep, resources);
  for (const lx of [-33, -12, 14, 34]) {
    const x = cx + lx,
      z = cz - 3,
      ground = heightAt(x, z),
      high = base - 5;
    const h = Math.max(2, Math.min(3.2, high - ground + 1));
    supports.emit(
      rock,
      m.limestone,
      [x, ground + h * 0.4, z],
      [7, h * 0.65, 4],
    );
    colliders.push({
      type: "ellipsoid",
      id: `odyssey_wreck_cradle_${nextId++}`,
      x,
      y: ground + h * 0.4,
      z,
      axes: new THREE.Vector3(7, h * 0.65, 4),
    });
  }
  supports.finish(parent, "odyssey_wreck_limestone_cradle");
  const landmark = {
    id: "odyssey_galley",
    name: "归航古桨船",
    position: new THREE.Vector3(cx, deck + 5, cz).applyMatrix4(placement),
  };
  landmarks.push(landmark);
  yield "galley-fittings";
  return {
    landmarks,
    wreck,
    wreckEntrance: new THREE.Vector3(cx, base + 3, cz + 22).applyMatrix4(
      placement,
    ),
  };
}
