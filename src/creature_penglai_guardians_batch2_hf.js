import * as T from "three";
import { penglaiGuardianBatch2Asset } from "./penglai_guardian_batch2_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { createAzureDragonMotion } from "./azure_dragon_motion.js";
import {
  nearestChain,
  chainWeights,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";
export const PENGLAI_HF_GUARDIANS_BATCH2 = new Set([
  "azure_dragon",
  "black_tortoise",
]);
const smooth = (a, b, x) => T.MathUtils.smoothstep(x, a, b);
/** 按原始 HF 的三视图拟合骨轴；分支接在承重骨上，不能独立浮在身外。 */
export function buildPenglaiGuardianBatch2HF(kind, root, motions) {
  const dragon = kind === "azure_dragon",
    base = new T.Bone(),
    bones = [base],
    chains = [],
    legs = [];
  root.add(base);
  function add(name, points, type, parent = 0, extra = {}) {
    const c = { name, points, type, ids: [], ...extra };
    points.forEach((p, i) => {
      const b = new T.Bone();
      b.name = name + "_" + i;
      b.position.fromArray(p);
      const parentId = i ? c.ids[i - 1] : parent;
      if (i) b.position.sub(new T.Vector3(...points[i - 1]));
      else if (parent) {
        const parentChain = chains.find((c) => c.ids.includes(parent));
        b.position.sub(
          new T.Vector3(...parentChain.points[parentChain.ids.indexOf(parent)]),
        );
      }
      bones[parentId].add(b);
      c.ids.push(bones.length);
      bones.push(b);
    });
    chains.push(c);
    return c;
  }
  let axial, head, snake, tail;
  if (dragon) {
    axial = add(
      "dragon_axis",
      [
        [0, -0.075, -0.27],
        [0, -0.065, -0.2],
        [0, -0.04, -0.12],
        [0, -0.045, -0.04],
        [0, -0.07, 0.04],
        [0, -0.095, 0.12],
        [0, -0.1, 0.2],
        [0, -0.11, 0.29],
        [0, -0.11, 0.36],
        [0, -0.065, 0.4],
        [0, 0.005, 0.435],
        [0, 0.025, 0.48],
      ],
      "axis",
    );
    head = add(
      "dragon_neck",
      [
        [0, -0.065, -0.29],
        [0, 0.015, -0.29],
        [0, 0.08, -0.335],
        [0, 0.06, -0.42],
      ],
      "head",
      axial.ids[0],
    );
    for (const side of [-1, 1])
      for (const front of [true, false]) {
        legs.push(
          add(
            `dragon_claw_${side}_${front}`,
            front
              ? [
                  [side * 0.05, -0.075, -0.29],
                  [side * 0.1, -0.12, -0.29],
                  [side * 0.145, -0.175, -0.35],
                ]
              : [
                  [side * 0.05, -0.075, 0.04],
                  [side * 0.14, -0.105, 0.035],
                  [side * 0.185, -0.175, 0.065],
                ],
            "leg",
            axial.ids[front ? 0 : 4],
            { side, front },
          ),
        );
      }
  } else {
    // 玄武的坐标由实际导出表面拟合，甲壳与贴壳蛇盘保持刚性。
    head = add(
      "tortoise_neck",
      [
        [0.02, -0.08, -0.25],
        [0.025, 0.025, -0.36],
        [0.025, 0.075, -0.46],
      ],
      "head",
    );
    snake = add(
      "serpent_neck",
      [
        [-0.25, 0.095, 0.15],
        [-0.245, 0.185, 0.08],
        [-0.22, 0.22, -0.025],
      ],
      "snake",
    );
    tail = add(
      "tortoise_tail",
      [
        [0, -0.12, 0.28],
        [0, -0.1, 0.43],
      ],
      "tail",
    );
    for (const side of [-1, 1])
      for (const front of [true, false])
        legs.push(
          add(
            `tortoise_paddle_${side}_${front}`,
            front
              ? [
                  [side * 0.2, -0.12, side === 1 ? -0.17 : -0.22],
                  [side * 0.31, -0.17, side === 1 ? -0.19 : -0.29],
                  [side * 0.43, -0.18, side === 1 ? -0.205 : -0.32],
                ]
              : [
                  [side * 0.21, -0.14, 0.23],
                  [side * 0.33, -0.19, 0.27],
                  [side * 0.42, -0.2, side === 1 ? 0.35 : 0.31],
                ],
            "leg",
            0,
            { side, front },
          ),
        );
  }
  const p = new T.Vector3();
  const bind = (x, y, z, ids, w, o) => {
    p.set(x, y, z);
    ids[o] = 0;
    w[o] = 1;
    if (dragon) {
      // 先沿连续躯干绑定，再以四个槽混入肢体；相邻皮肤保留相同权重。
      const n = nearestChain(p, axial);
      ids[o] = n.a;
      ids[o + 1] = n.b;
      w[o] = 1 - n.t;
      w[o + 1] = n.t;
      if (z < -0.28 || (z < -0.22 && y > -0.03)) {
        const neck = smooth(0.245, 0.305, -z),
          hn = nearestChain(p, head);
        ids[o] = axial.ids[0];
        ids[o + 1] = hn.a;
        ids[o + 2] = hn.b;
        w[o] = 1 - neck;
        w[o + 1] = neck * (1 - hn.t);
        w[o + 2] = neck * hn.t;
        if (z < -0.35 || y > 0.085) {
          ids[o] = head.ids[2];
          w[o] = 1;
          w[o + 1] = w[o + 2] = 0;
        }
      }
      let leg, best;
      for (const c of legs) {
        const v = nearestChain(p, c);
        if (!best || v.distance < best.distance) {
          best = v;
          leg = c;
        }
      }
      const k =
        smooth(0.045, 0.105, Math.abs(x)) *
        (1 - smooth(-0.08, -0.035, y)) *
        (1 - smooth(0.045, 0.085, Math.sqrt(best.distance)));
      if (k > 0.001) {
        const support = axial.ids[leg.front ? 0 : 4];
        ids[o] = support;
        ids[o + 1] = best.a;
        ids[o + 2] = best.b;
        w[o] = 1 - k;
        w[o + 1] = k * (1 - best.t);
        w[o + 2] = k * best.t;
      }
    } else {
      // 以下阈值围绕甲缘外的真实肢根，不让划水牵扯龟甲。
      let leg, best;
      for (const c of legs) {
        const n = nearestChain(p, c);
        if (!best || n.distance < best.distance) {
          best = n;
          leg = c;
        }
      }
      const k =
        smooth(0.19, 0.29, Math.abs(x)) *
        (1 - smooth(-0.1, -0.03, y)) *
        (1 - smooth(0.08, 0.15, Math.sqrt(best.distance)));
      if (k > 0.001) {
        chainWeights(leg, p, k, ids, w, o);
        return;
      }
      if (z < -0.26 && Math.abs(x) < 0.16) {
        chainWeights(head, p, smooth(0.26, 0.37, -z), ids, w, o);
        return;
      }
      if (y > 0.14 && x < -0.12 && z > -0.08 && z < 0.2) {
        chainWeights(snake, p, smooth(0.14, 0.2, y), ids, w, o);
        return;
      }
      if (z > 0.33 && Math.abs(x) < 0.12) {
        chainWeights(tail, p, smooth(0.32, 0.41, z), ids, w, o);
      }
    }
  };
  const asset = penglaiGuardianBatch2Asset(kind, bind),
    mesh = bindOrganicBody(
      root,
      kind + "_continuous_hf",
      asset.geometry,
      asset.material,
      bones,
      0.5,
    );
  const pos = asset.geometry.attributes.position,
    parts = Array.from({ length: dragon ? 12 : 5 }, () => []);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    if (
      dragon
        ? Math.abs(x) < 0.055 && y < 0.12 && y > -0.14
        : Math.abs(x) < 0.24 && y > -0.18 && y < 0.15 && z < 0.32 && z > -0.44
    ) {
      const j = Math.min(
        parts.length - 1,
        Math.max(0, Math.floor((z + 0.5) * parts.length)),
      );
      parts[j].push(i);
    }
  }
  mesh.userData.lordCoreParts = parts.filter((a) => a.length > 20);
  const mouth = new T.Object3D(),
    mouthPoint = dragon ? [0, 0.035, -0.49] : [0.025, 0.05, -0.49];
  const mouthId = dragon ? head.ids[2] : head.ids[2];
  mouth.position.fromArray(mouthPoint).sub(new T.Vector3(...head.points[2]));
  bones[mouthId].add(mouth);
  root.userData.mouthAnchors = [mouth];
  root.userData.getHeadWorldPositions = () => [
    mouth.getWorldPosition(new T.Vector3()),
  ];
  root.userData.prepareMaterials = asset.prepare;
  void asset.prepare();
  root.userData.artRevision = "penglai_guardians_hf_v2";
  root.userData.normalizedLength = 1;
  root.userData.mythicAnatomy = kind;
  root.userData.guideRadius = dragon ? 0.72 : 0.86;
  root.userData.hfRig = {
    kind,
    asset,
    mesh,
    bones,
    chains,
    legs,
    head,
    axial,
    snake,
    tail,
  };
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    mesh.skeleton.dispose();
  };
  let previous,
    phase = "dormant",
    brace = 0;
  const ease = lordEffortSmoother();
  root.userData.setBossPhase = (p) => {
    phase = p;
  };
  const state = {
    strokePhase: 0,
    drive: 0,
    brace: 0,
    speed: 0,
    worldTravel: false,
  };
  if (!dragon) {
    root.userData.aquaticUpright = true;
    root.userData.aquaticPitchLimit = 0.22;
    root.userData.tortoiseSwimRig = {
      state,
      limbs: legs.map((c) => ({
        limb: bones[c.ids[0]],
        wrist: bones[c.ids[1]],
        side: c.side,
        hind: !c.front,
        chain: c,
      })),
    };
    root.userData.setSwimTravel = (distance, dt) => {
      if (!(dt > 0) || !Number.isFinite(distance)) return;
      state.worldTravel = true;
      state.speed = Math.max(0, distance) / dt;
    };
    root.userData.resetSwimTravel = () => {
      Object.assign(state, {
        strokePhase: 0,
        drive: 0,
        brace: 0,
        speed: 0,
        worldTravel: false,
      });
      previous = undefined;
      phase = "dormant";
    };
  }
  const dragonMotion = dragon
    ? createAzureDragonMotion(root, bones, axial, head, legs)
    : null;
  motions.push((t, e) => {
    const dt =
      previous === undefined
        ? 0
        : Math.max(0, Math.min(0.12, (t - previous) / (1.7 + e * 1.1)));
    previous = t;
    const effort = ease(t, e);
    brace = T.MathUtils.damp(
      brace,
      phase === "windup" || phase === "attack" ? 1 : 0,
      5,
      dt,
    );
    if (dragon) {
      dragonMotion(dt, effort, brace);
    } else {
      const target = state.worldTravel
        ? Math.min(1.4, state.speed / Math.max(1, root.userData.length * 0.25))
        : Math.min(1.4, e * 0.75);
      state.drive = T.MathUtils.damp(state.drive, target, 4, dt);
      state.brace = T.MathUtils.damp(
        state.brace,
        phase === "windup" || phase === "attack" ? 1 : 0,
        4.5,
        dt,
      );
      state.strokePhase += dt * (0.7 + state.drive * 2.55);
      const sprint = smooth(0.55, 1.2, state.drive),
        activity = smooth(0.025, 0.3, state.drive);
      for (const c of legs) {
        const ph =
            state.strokePhase +
            (c.front ? c.side * 0.07 * (1 - sprint) : Math.PI + c.side * 0.1),
          cycle = (((ph / (2 * Math.PI)) % 1) + 1) % 1,
          power = cycle < 0.58,
          u = power ? cycle / 0.58 : (cycle - 0.58) / 0.42,
          s = u * u * (3 - 2 * u),
          recover = power ? 0 : Math.sin(u * Math.PI),
          amp =
            (0.012 +
              activity *
                (c.front
                  ? 0.25 + state.drive * 0.15
                  : (0.09 + state.drive * 0.035) * (1 - sprint * 0.3))) *
            (1 - state.brace * 0.94),
          sweep = (power ? 1 - 2 * s : -1 + 2 * s) * amp;
        bones[c.ids[0]].rotation.y = c.side * (sweep - state.brace * 0.12);
        bones[c.ids[0]].rotation.z =
          c.side * (recover * activity * 0.12 + state.brace * 0.14);
        bones[c.ids[1]].rotation.y = -c.side * sweep * 0.22;
        bones[c.ids[1]].rotation.x =
          recover * activity * (c.front ? 0.55 : 0.22);
      }
      bones[head.ids[0]].rotation.x =
        Math.sin(state.strokePhase * 0.32) * 0.012 * (1 - state.brace * 0.7);
      bones[snake.ids[0]].rotation.y =
        Math.sin(state.strokePhase * 0.37) * 0.025;
      bones[snake.ids[1]].rotation.x =
        Math.sin(state.strokePhase * 0.45) * 0.035;
      bones[tail.ids[0]].rotation.y = Math.sin(state.strokePhase * 0.6) * 0.025;
    }
  });
}
