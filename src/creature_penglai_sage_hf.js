import * as T from "three";
import { penglaiSageHfAsset } from "./penglai_sage_hf_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { nearestChain } from "./hawaii_lord_rig.js";
import {
  pgMaterial,
  pgGeometry,
  pgPart,
  pgBakeStatic,
} from "./creature_penglai_art.js";
import { createSageJian, sageJianAsset } from "./sage_jian.js";
const smooth = (a, b, x) => T.MathUtils.smoothstep(x, a, b);
/** 身体与衣袖连续蒙皮；双脚固定承剑，施法和冲阵采用不同的上身姿态。 */
export function buildPenglaiSageHF(root, motions) {
  const body = new T.Group();
  body.name = "sword_sage_mythic_anatomy";
  root.add(body);
  const figure = new T.Group();
  figure.position.y = 0.0398;
  body.add(figure);
  const base = new T.Bone(),
    bones = [base],
    chains = [];
  figure.add(base);
  function chain(name, points, parent = 0) {
    const c = { name, points, ids: [] };
    points.forEach((p, i) => {
      const b = new T.Bone();
      b.name = name + "_" + i;
      b.position.fromArray(p);
      const parentId = i ? c.ids[i - 1] : parent;
      if (i) b.position.sub(new T.Vector3(...points[i - 1]));
      else if (parent) {
        const pc = chains.find((c) => c.ids.includes(parent));
        b.position.sub(new T.Vector3(...pc.points[pc.ids.indexOf(parent)]));
      }
      bones[parentId].add(b);
      c.ids.push(bones.length);
      bones.push(b);
    });
    chains.push(c);
    return c;
  }
  const chest = chain("sage_chest", [
      [0, 0.04, 0],
      [0, 0.19, 0],
    ]),
    head = chain(
      "sage_head",
      [
        [0, 0.275, 0],
        [0, 0.34, -0.01],
      ],
      chest.ids[1],
    ),
    arms = [-1, 1].map((side) => ({
      ...chain(
        "sage_sleeve_" + side,
        [
          [side * 0.08, 0.22, 0],
          [side * 0.135, 0.105, -0.005],
          [side * 0.19, -0.015, -0.07],
        ],
        chest.ids[1],
      ),
      side,
    })),
    hems = [1].map((side) => ({
      ...chain("sage_robe_" + side, [
        [0, -0.025, 0],
        [0, -0.18, 0],
        [0, -0.32, 0],
      ]),
      side,
    })),
    hair = chain(
      "sage_hair",
      [
        [0, 0.27, 0.065],
        [0, 0.13, 0.1],
        [0, 0.035, 0.095],
      ],
      head.ids[0],
    );
  const p = new T.Vector3();
  function bind(x, y, z, ids, w, o, sleeve) {
    p.set(x, y, z);
    const upper = smooth(0.015, 0.1, y);
    ids[o] = 0;
    w[o] = 1 - upper;
    ids[o + 1] = chest.ids[0];
    w[o + 1] = upper;
    if (y > 0.245) {
      const f = smooth(0.245, 0.285, y);
      ids[o] = chest.ids[0];
      w[o] = 1 - f;
      ids[o + 1] = head.ids[0];
      w[o + 1] = f;
    }
    if (y < -0.025) {
      const f = smooth(0.025, 0.12, -y) * (1 - smooth(0.24, 0.455, -y));
      const n = nearestChain(p, hems[0]);
      ids[o] = 0;
      w[o] = 1 - f;
      ids[o + 1] = n.a;
      w[o + 1] = f * (1 - n.t);
      ids[o + 2] = n.b;
      w[o + 2] = f * n.t;
    }
    // 按焊接后的表面邻接传播袖子归属，避免内袖和裙摆在空间重叠处跳权重。
    if (sleeve > 0) {
      const n = nearestChain(p, arms[x < 0 ? 0 : 1]);
      const combined = new Map();
      for (let j = 0; j < 4; j++)
        combined.set(
          ids[o + j],
          (combined.get(ids[o + j]) || 0) + w[o + j] * (1 - sleeve),
        );
      combined.set(n.a, (combined.get(n.a) || 0) + sleeve * (1 - n.t));
      combined.set(n.b, (combined.get(n.b) || 0) + sleeve * n.t);
      const entries = [...combined]
        .filter((e) => e[1] > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);
      const sum = entries.reduce((s, e) => s + e[1], 0);
      for (let j = 0; j < 4; j++) {
        ids[o + j] = entries[j]?.[0] || 0;
        w[o + j] = (entries[j]?.[1] || 0) / sum;
      }
    }
    const hairMix =
      smooth(0.075, 0.115, z) *
      smooth(0.025, 0.07, y) *
      (1 - smooth(0.26, 0.31, y)) *
      (1 - smooth(0.035, 0.07, Math.abs(x)));
    if (hairMix > 0) {
      const n = nearestChain(p, hair);
      ids[o] = head.ids[0];
      w[o] = 1 - hairMix;
      ids[o + 1] = n.a;
      w[o + 1] = hairMix * (1 - n.t);
      ids[o + 2] = n.b;
      w[o + 2] = hairMix * n.t;
    }
  }
  const asset = penglaiSageHfAsset(bind),
    mesh = bindOrganicBody(
      figure,
      "sword_sage_hf_skin",
      asset.geometry,
      asset.material,
      bones,
      0.18,
    );
  // 保留承重躯干和头部的动态接触，宽袖与袍摆不作为额外攻击目标。
  const parts = [[], []],
    pos = mesh.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    if (Math.abs(x) < 0.08 && Math.abs(z) < 0.085 && y > -0.02 && y < 0.39)
      parts[y > 0.265 ? 1 : 0].push(i);
  }
  mesh.userData.lordCoreParts = parts;
  // 袍摆避障与可受击躯干分开；否则上身越过障碍时，下摆仍会被剑尖穿入。
  mesh.userData.navigationSurface = {
    axis: "y",
    min: -0.52,
    max: -0.02,
    slices: 4,
    padding: 0.035,
  };
  const mount = createSageJian(body, [0, -0.45, 0], 1, true);
  mount.name = "sage_riding_greatsword";
  mount.rotation.x = -Math.PI / 2;
  mount.scale.set(4.4, 2.05, 2.2);
  mount.getObjectByName("sword_blade").userData.navigationSurface = {
    axis: "y",
    slices: 8,
    padding: 0.008,
  };
  root.userData.ridingSword = mount;
  const ring = new T.Group();
  ring.name = "orbiting_sword_array";
  body.add(ring);
  for (let j = 0; j < 7; j++) {
    const a = (j / 7) * Math.PI * 2,
      s = createSageJian(
        ring,
        [Math.cos(a) * 0.4, 0.04 + Math.sin(a) * 0.08, Math.sin(a) * 0.4],
        0.65,
      );
    s.rotation.z = -Math.cos(a) * 0.55;
  }
  const shield = new T.Group();
  shield.name = "four_symbol_ward";
  body.add(shield);
  const wardmat = pgMaterial("#a8b999", 4, 0.025),
    torus = pgGeometry(
      "sage_ward_ring_v2",
      () => new T.TorusGeometry(0.54, 0.004, 6, 96),
    );
  for (let i = 0; i < 2; i++)
    pgPart(
      shield,
      torus,
      wardmat,
      [0, 0, 0],
      [1, 1, 1],
      [Math.PI / 2, (i * Math.PI) / 2, 0.3],
      "four_symbol_halo",
    );
  root.userData.setLocked = (locked) => {
    shield.visible = locked;
  };
  pgBakeStatic(shield, "sage_hf_ward");
  // 沿用原有剑尖、护阵包络的归一化；人物高度不由宽袖重新决定。
  const factor = 1 / 1.4070461239218712;
  body.scale.setScalar(factor);
  body.position.z = 0.06802306196093561 * factor;
  const anchor = new T.Object3D();
  anchor.position
    .set(0, 0.33 - 0.0398, -0.078)
    .sub(new T.Vector3(...head.points[0]));
  bones[head.ids[0]].add(anchor);
  root.userData.getHeadWorldPositions = () => [
    anchor.getWorldPosition(new T.Vector3()),
  ];
  const swordAsset = sageJianAsset();
  const prepareMaterials = (options) =>
    Promise.all([asset.prepare(options), swordAsset.prepare(options)]).then(
      (results) => results.every(Boolean),
    );
  Object.defineProperty(prepareMaterials, "state", {
    get: () =>
      asset.prepare.state === "ready" && swordAsset.prepare.state === "ready"
        ? "ready"
        : "loading",
  });
  root.userData.prepareMaterials = prepareMaterials;
  void asset.prepare();
  root.userData.normalizedLength = 1;
  root.userData.groundSupport = 0.38648202086441014;
  root.userData.guideRadius = 0.78;
  root.userData.artRevision = "penglai_sage_silver_hair_jian_v2";
  root.userData.mythicAnatomy = "sword_sage";
  root.userData.hfRig = {
    kind: "sword_sage",
    asset,
    mesh,
    bones,
    chains,
    arms,
    hems,
    head,
    hair,
  };
  const state = {
    phase: "dormant",
    ability: "swords",
    clock: 0,
    cast: 0,
    dash: 0,
    drive: 0,
    speed: 0,
    worldTravel: false,
  };
  root.userData.sageMotion = state;
  root.userData.setBossPhase = (phase, ability) => {
    state.phase = phase;
    state.ability = ability || state.ability;
  };
  root.userData.setSwimTravel = (distance, dt) => {
    if (dt > 0 && Number.isFinite(distance)) {
      state.speed = Math.max(0, distance) / dt;
      state.worldTravel = true;
    }
  };
  let previous;
  root.userData.resetSwimTravel = () => {
    previous = undefined;
    Object.assign(state, {
      phase: "dormant",
      clock: 0,
      cast: 0,
      dash: 0,
      drive: 0,
      speed: 0,
      worldTravel: false,
    });
  };
  motions.push((t, e) => {
    const dt =
      previous === undefined
        ? 0
        : T.MathUtils.clamp((t - previous) / (1.7 + e * 1.1), 0, 0.12);
    previous = t;
    const active = state.phase === "windup" || state.phase === "attack";
    state.cast = T.MathUtils.damp(
      state.cast,
      active && state.ability === "swords" ? 1 : 0,
      5,
      dt,
    );
    state.dash = T.MathUtils.damp(
      state.dash,
      active && state.ability === "charge" ? 1 : 0,
      5,
      dt,
    );
    state.drive = T.MathUtils.damp(
      state.drive,
      state.worldTravel
        ? Math.min(1.6, state.speed / 36)
        : Math.min(1, e * 0.45),
      4,
      dt,
    );
    state.clock += dt;
    const ph = state.clock,
      flow = 0.3 + state.drive * 0.7;
    bones[chest.ids[0]].rotation.x =
      -state.dash * 0.11 + Math.sin(ph * 0.9) * 0.012;
    bones[head.ids[0]].rotation.x = state.dash * 0.07 - state.cast * 0.035;
    for (const a of arms) {
      bones[a.ids[0]].rotation.x =
        0.045 * Math.sin(ph * 1.4 + a.side) +
        state.cast * (a.side === 1 ? 0.42 : 0.25) -
        state.dash * 0.14;
      bones[a.ids[0]].rotation.z =
        -a.side * (state.cast * 0.08 + state.dash * 0.09);
      bones[a.ids[1]].rotation.x =
        state.cast * (a.side === 1 ? 0.5 : 0.3) +
        Math.sin(ph * 1.7 + a.side) * 0.055 * flow;
      bones[a.ids[2]].rotation.y = a.side * state.cast * 0.1;
    }
    for (const c of hems) {
      bones[c.ids[0]].rotation.x =
        -(0.06 * state.drive + 0.1 * state.dash) +
        Math.sin(ph * 1.6 + c.side) * 0.035 * flow;
      bones[c.ids[1]].rotation.x =
        Math.sin(ph * 1.6 + c.side - 0.8) * 0.07 * flow;
      bones[c.ids[2]].rotation.z =
        c.side * Math.sin(ph * 1.9 - 0.9) * 0.045 * flow;
    }
    for (let i = 0; i < hair.ids.length; i++)
      bones[hair.ids[i]].rotation.x =
        Math.sin(ph * 1.7 - i * 0.8) * 0.025 * flow - state.dash * 0.025;
    ring.rotation.y = ph * 0.22;
    ring.rotation.z = Math.sin(ph * 0.7) * 0.035;
  });
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    mesh.skeleton.dispose();
  };
}
