import * as T from "three";
import { odysseyFinalHFAsset } from "./odyssey_final_hf_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { nearestChain, lordEffortSmoother } from "./hawaii_lord_rig.js";
import {
  createOdysseyWeapon,
  withOdysseyWeaponMaterials,
} from "./odyssey_weapon_hf_asset.js";
export const ODYSSEY_HF_FINAL = new Set(["naga_huntress", "golden_argonaut"]);
const smooth = (a, b, x) => T.MathUtils.smoothstep(x, a, b);
/** 蛇身与船蛸软组织分别绑定；船蛸卵壳保持刚性。 */
export function buildOdysseyFinalHF(kind, root, motions) {
  if (!ODYSSEY_HF_FINAL.has(kind))
    throw Error("Unknown Odyssey final creature");
  const body = new T.Group(),
    base = new T.Bone(),
    bones = [base],
    chains = [],
    point = new T.Vector3();
  root.add(body);
  body.add(base);
  function add(name, type, points, extra = {}) {
    const c = { name, type, points, ids: [], ...extra };
    chains.push(c);
    points.forEach((p, i) => {
      const b = new T.Bone();
      b.name = kind + "_" + name + "_" + i;
      b.position.fromArray(p);
      if (i) {
        bones[c.ids[i - 1]].add(b);
        b.position.sub(new T.Vector3(...points[i - 1]));
      } else base.add(b);
      c.ids.push(bones.length);
      bones.push(b);
    });
    return c;
  }
  let tail, head;
  const limbs = [],
    arms = [];
  if (kind === "naga_huntress") {
    tail = add("axial", "tail", [
      [0, -0.04, -0.38],
      [0, -0.145, -0.28],
      [0, -0.21, -0.16],
      [0, -0.195, -0.04],
      [0, -0.15, 0.08],
      [0, -0.14, 0.2],
      [0, -0.18, 0.32],
      [0, -0.17, 0.42],
      [0, -0.12, 0.48],
    ]);
    head = add("head", "head", [[0, 0.13, -0.44]]);
    for (const side of [-1, 1])
      limbs.push(
        add(
          "arm_" + side,
          "arm",
          [
            [side * 0.075, 0.1, -0.43],
            [side * 0.125, 0.005, -0.405],
            [side * 0.16, -0.075, -0.425],
          ],
          { side },
        ),
      );
  } else {
    head = add("mantle", "head", [[0, 0.04, -0.15]]);
    // 末端腕链在实际壳口前展开，根部连续融合，避免牵动硬壳。
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI * 0.9 + (i / 5) * Math.PI * 0.8;
      arms.push(
        add(
          "arm_" + i,
          "tentacle",
          [
            [Math.cos(a) * 0.025, -0.035, -0.2],
            [Math.cos(a) * 0.1, Math.sin(a) * 0.12, -0.32],
            [Math.cos(a) * 0.18, Math.sin(a) * 0.19, -0.45],
          ],
          { angle: a },
        ),
      );
    }
  }
  const asset = odysseyFinalHFAsset(kind, (x, y, z, ids, w, o) => {
    point.set(x, y, z);
    let values = new Map([[0, 1]]);
    const bind = (c, blend) => {
      if (blend <= 0) return;
      const n = nearestChain(point, c);
      for (const [id, v] of values) values.set(id, v * (1 - blend));
      values.set(n.a, (values.get(n.a) || 0) + blend * (1 - n.t));
      values.set(n.b, (values.get(n.b) || 0) + blend * n.t);
    };
    if (kind === "naga_huntress") {
      bind(tail, smooth(-0.42, -0.29, z) * (1 - smooth(-0.055, 0.025, y)));
      bind(head, smooth(0.085, 0.16, y));
      const armBlend =
        smooth(0.065, 0.11, Math.abs(x)) *
        (1 - smooth(0.08, 0.125, y)) *
        (1 - smooth(-0.3, -0.24, z));
      bind(limbs[x < 0 ? 0 : 1], armBlend);
    } else {
      const blend = (1 - smooth(-0.28, -0.18, z)) * (1 - smooth(0.04, 0.1, y));
      if (blend > 0) {
        const u = T.MathUtils.clamp(
            ((Math.atan2(x, Math.sqrt(y * y + 0.0036)) + Math.PI * 0.4) /
              (Math.PI * 0.8)) *
              5,
            0,
            5,
          ),
          lo = Math.min(4, Math.floor(u)),
          f = smooth(0, 1, u - lo);
        values = new Map([[0, 1 - blend]]);
        [lo, lo + 1].forEach((k, j) => {
          // 沿腕足纵向连续插值，避免最近线段在腕根切换时权重跳变。
          const c = arms[k],
            distal = z < -0.32,
            t = distal
              ? smooth(0, 1, (-0.32 - z) / 0.13)
              : smooth(0, 1, (-0.2 - z) / 0.12),
            a = blend * (j ? f : 1 - f),
            first = distal ? c.ids[1] : 0,
            second = distal ? c.ids[2] : c.ids[1];
          values.set(first, (values.get(first) || 0) + a * (1 - t));
          values.set(second, (values.get(second) || 0) + a * t);
        });
      }
    }
    const sorted = [...values]
        .filter(([, v]) => v > 1e-8)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4),
      sum = sorted.reduce((s, a) => s + a[1], 0);
    for (let j = 0; j < 4; j++) {
      ids[o + j] = sorted[j]?.[0] || 0;
      w[o + j] = (sorted[j]?.[1] || 0) / sum;
    }
  });
  const mesh = bindOrganicBody(
      body,
      kind + "_hf_body",
      asset.geometry,
      asset.material,
      bones,
      0.4,
    ),
    mouth = new T.Object3D();
  mouth.name = kind + "_mouth";
  bones[head.ids[0]].add(mouth);
  mouth.position.fromArray(
    kind === "naga_huntress" ? [0, 0.055, -0.045] : [0, -0.055, -0.075],
  );
  Object.assign(root.userData, {
    mouthAnchors: [mouth],
    normalizedLength: 1,
    odysseyAnatomy: kind,
    hfRig: { kind, mesh, bones, chains, asset },
    artRevision: "trellis_odyssey_final_20261028",
    prepareMaterials: asset.prepare,
    aquaticUpright: true,
  });
  asset.prepare();
  if (kind === "naga_huntress") {
    const hand = limbs.find((c) => c.side === 1),
      weapon = createOdysseyWeapon("naga_spear");
    bones[hand.ids.at(-1)].add(weapon);
    weapon.position.set(0.004, -0.012, -0.005);
    root.userData.spear = weapon;
    root.userData.visualWeapon = weapon;
    root.userData.prepareMaterials = withOdysseyWeaponMaterials(
      asset.prepare,
      weapon,
    );
    void root.userData.prepareMaterials();
  }
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (!disposed) {
      disposed = true;
      mesh.skeleton.dispose();
    }
  };
  const effort = lordEffortSmoother();
  motions.push((phase, speed) => {
    const drive = 0.65 + 0.35 * smooth(0.3, 3, effort(phase, speed));
    if (kind === "naga_huntress") {
      tail.ids.forEach((id, i) => {
        bones[id].rotation.y =
          Math.sin(phase * 1.4 - i * 0.68) * (0.025 + i * 0.026) * drive;
        bones[id].rotation.x = Math.sin(phase * 0.7 - i * 0.5) * 0.009;
      });
      bones[head.ids[0]].rotation.y = Math.sin(phase * 0.65) * 0.025 * drive;
      limbs.forEach((c) =>
        c.ids.forEach((id, i) => {
          bones[id].rotation.x =
            Math.sin(phase * 0.9 + c.side * 0.7 - i * 0.4) *
            [0.09, 0.12, 0.05][i] *
            drive;
          bones[id].rotation.z =
            c.side * Math.cos(phase * 0.9 - i * 0.3) * 0.04 * drive;
        }),
      );
    } else
      arms.forEach((c, k) =>
        c.ids.forEach((id, i) => {
          bones[id].rotation.x =
            Math.sin(phase * 1.7 - k * 0.22 - i * 0.65) *
            (i ? 0.025 + i * 0.055 : 0) *
            drive;
          bones[id].rotation.y =
            Math.sin(phase * 1.4 - k * 0.25 - i * 0.5) *
            (i ? 0.02 + i * 0.035 : 0) *
            drive;
        }),
      );
  });
}
