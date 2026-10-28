import * as T from "three";
import { createTritonTrident } from "./triton_guard_weapon.js";
import { withOdysseyWeaponMaterials } from "./odyssey_weapon_hf_asset.js";
import { odysseyPeopleHFAsset } from "./odyssey_people_hf_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { nearestChain, lordEffortSmoother } from "./hawaii_lord_rig.js";
export const ODYSSEY_HF_PEOPLE = new Set([
  "nereid",
  "hippocampus",
  "triton_guard",
  "siren_eel",
]);
const smooth = (a, b, x) => T.MathUtils.smoothstep(x, a, b);
/** 按实际网格拟合连续鱼尾、肩臂及鳍幕；不改变世界运动和战斗。 */
export function buildOdysseyPeopleHF(kind, root, motions) {
  if (!ODYSSEY_HF_PEOPLE.has(kind))
    throw Error("Unknown Odyssey people creature");
  const body = new T.Group(),
    base = new T.Bone(),
    bones = [base],
    chains = [],
    point = new T.Vector3();
  root.add(body);
  body.add(base);
  function add(name, type, points, extra = {}) {
    const chain = { name, type, points, ids: [], ...extra };
    chains.push(chain);
    points.forEach((p, i) => {
      const b = new T.Bone();
      b.name = `${kind}_${name}_${i}`;
      b.position.fromArray(p);
      if (i) {
        bones[chain.ids[i - 1]].add(b);
        b.position.sub(new T.Vector3(...points[i - 1]));
      } else base.add(b);
      chain.ids.push(bones.length);
      bones.push(b);
    });
    return chain;
  }
  let tail, head;
  const limbs = [],
    fins = [];
  if (kind === "hippocampus") {
    tail = add("tail", "tail", [
      [0, -0.055, -0.22],
      [0, -0.08, -0.08],
      [0, -0.11, 0.08],
      [0, -0.13, 0.23],
      [0, -0.11, 0.34],
    ]);
    head = add("neck", "head", [
      [0, 0.025, -0.29],
      [0, 0.14, -0.34],
    ]);
    for (const side of [-1, 1])
      limbs.push(
        add(
          "foreleg_" + side,
          "leg",
          [
            [side * 0.045, -0.025, -0.35],
            [side * 0.052, -0.07, -0.31],
            [side * 0.052, -0.16, -0.37],
          ],
          { side },
        ),
      );
  } else if (kind === "triton_guard") {
    tail = add("tail", "tail", [
      [0.03, -0.065, -0.24],
      [0.03, -0.12, -0.09],
      [0.03, -0.15, 0.08],
      [0.03, -0.14, 0.24],
      [0.03, -0.12, 0.4],
    ]);
    head = add("head", "head", [[0.03, 0.13, -0.38]]);
    for (const side of [-1, 1])
      limbs.push(
        add(
          "arm_" + side,
          "arm",
          [
            [0.03 + side * 0.13, 0.07, -0.34],
            [0.03 + side * 0.25, -0.015, -0.26],
            [0.03 + side * 0.35, -0.08, -0.26],
          ],
          { side },
        ),
      );
  } else if (kind === "siren_eel") {
    tail = add(
      "axial",
      "tail",
      Array.from({ length: 9 }, (_, i) => [
        0,
        [0.11, 0.09, 0.055, 0.02, -0.025, -0.06, -0.085, -0.08, -0.065][i],
        -0.4 + i * 0.1,
      ]),
    );
    head = add("head", "head", [[0, 0.11, -0.44]]);
    for (const side of [-1, 1])
      for (const upper of [false, true])
        fins.push(
          add(
            `veil_${side}_${upper}`,
            "fin",
            upper
              ? [
                  [side * 0.025, 0.12, -0.4],
                  [side * 0.09, 0.13, -0.27],
                  [side * 0.055, 0.09, -0.08],
                ]
              : [
                  [side * 0.035, 0.06, -0.38],
                  [side * 0.15, -0.06, -0.25],
                  [side * 0.085, -0.13, -0.06],
                ],
            { side, upper },
          ),
        );
  } else {
    tail = add("tail", "tail", [
      [0, -0.055, -0.25],
      [0, -0.1, -0.09],
      [0, -0.11, 0.08],
      [0, -0.09, 0.25],
      [0, -0.06, 0.37],
    ]);
    head = add("head", "head", [[0, 0.08, -0.37]]);
    for (const side of [-1, 1])
      limbs.push(
        add(
          "arm_" + side,
          "arm",
          [
            [side * 0.055, 0.045, -0.37],
            [side * 0.07, 0.035, -0.23],
            [side * 0.085, 0.02, -0.09],
          ],
          { side },
        ),
      );
  }
  const asset = odysseyPeopleHFAsset(
    kind,
    (x, y, z, ids, w, o, index, armOwnership) => {
      point.set(x, y, z);
      let values = new Map([[0, 1]]);
      // 一次离线式绑定最多四个权重；每个解剖分支与原有母体权重连续过渡。
      const bind = (c, blend) => {
        if (blend <= 0) return;
        const n = nearestChain(point, c);
        for (const [id, v] of values) values.set(id, v * (1 - blend));
        values.set(n.a, (values.get(n.a) || 0) + blend * (1 - n.t));
        values.set(n.b, (values.get(n.b) || 0) + blend * n.t);
      };
      const rigid = (id, blend) => {
        if (blend <= 0) return;
        for (const [k, v] of values) values.set(k, v * (1 - blend));
        values.set(id, (values.get(id) || 0) + blend);
      };
      if (kind === "siren_eel") {
        bind(tail, smooth(-0.47, -0.35, z));
        rigid(head.ids[0], 1 - smooth(-0.46, -0.38, z));
        const side = x < 0 ? -1 : 1,
          upper = smooth(0.045, 0.1, y),
          coverage =
            smooth(0.035, 0.075, Math.abs(x)) * (1 - smooth(-0.02, 0.025, z));
        bind(
          fins.find((c) => c.side === side && !c.upper),
          coverage * (1 - upper),
        );
        bind(
          fins.find((c) => c.side === side && c.upper),
          coverage * upper,
        );
      } else {
        // 尾鳍上缘也属于鱼尾；不能沿用躯干高度遮罩把它留在原地。
        const tailCoverage =
          kind === "triton_guard"
            ? T.MathUtils.lerp(
                1 - smooth(-0.015, 0.045, y),
                1,
                smooth(0.26, 0.35, z),
              )
            : 1 - smooth(-0.015, 0.045, y);
        bind(
          tail,
          smooth(kind === "hippocampus" ? -0.26 : -0.28, -0.09, z) *
            tailCoverage,
        );
        if (kind === "hippocampus") {
          bind(head, smooth(0.015, 0.1, y));
          if (z < -0.25)
            bind(
              limbs[x < 0 ? 0 : 1],
              (1 - smooth(-0.13, -0.055, y)) * smooth(0.025, 0.05, Math.abs(x)),
            );
        } else {
          rigid(
            head.ids[0],
            kind === "nereid" ? smooth(0.07, 0.11, y) : smooth(0.11, 0.17, y),
          );
          const cx = kind === "triton_guard" ? 0.03 : 0,
            side = x < cx ? 0 : 1,
            ax = Math.abs(x - cx);
          if (z < -0.06)
            bind(
              limbs[side],
              kind === "nereid"
                ? armOwnership
                : smooth(0.13, 0.21, ax) * (1 - smooth(0.075, 0.15, y)),
            );
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
    },
  );
  const mesh = bindOrganicBody(
      body,
      kind + "_hf_body",
      asset.geometry,
      asset.material,
      bones,
      0.38,
    ),
    mouth = new T.Object3D();
  mouth.name = kind + "_mouth";
  const mouthPoint = {
    nereid: [0, 0.13, -0.48],
    hippocampus: [0, 0.095, -0.49],
    triton_guard: [0.03, 0.16, -0.47],
    siren_eel: [0, 0.085, -0.49],
  }[kind];
  bones[head.ids.at(-1)].add(mouth);
  mouth.position
    .fromArray(mouthPoint)
    .sub(new T.Vector3(...head.points.at(-1)));
  Object.assign(root.userData, {
    mouthAnchors: [mouth],
    normalizedLength: 1,
    odysseyAnatomy: kind,
    hfRig: { kind, mesh, bones, chains, asset },
    artRevision: "trellis_odyssey_people_20261028",
    prepareMaterials: asset.prepare,
    aquaticUpright: true,
  });
  asset.prepare();
  if (kind === "triton_guard") {
    const hand = limbs.find((c) => c.side === 1),
      weapon = createTritonTrident();
    bones[hand.ids.at(-1)].add(weapon);
    weapon.position.set(0.009, -0.037, 0.019);
    root.userData.trident = weapon;
    root.userData.visualWeapon = weapon;
    root.userData.prepareMaterials = withOdysseyWeaponMaterials(
      asset.prepare,
      weapon,
    );
    void root.userData.prepareMaterials();
  }
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    mesh.skeleton.dispose();
  };
  const effort = lordEffortSmoother();
  motions.push((phase, speed) => {
    const drive = 0.7 + 0.3 * smooth(0.3, 3, effort(phase, speed)),
      f = kind === "siren_eel" ? 1.55 : 1.35;
    tail.ids.forEach((id, i) => {
      bones[id].rotation.y =
        Math.sin(phase * f - i * 0.65) *
        (0.035 + i * (kind === "siren_eel" ? 0.014 : 0.035)) *
        drive;
      bones[id].rotation.x =
        Math.sin(phase * f * 0.5 - i * 0.5) * 0.012 * drive;
    });
    head.ids.forEach((id, i) => {
      bones[id].rotation.y = Math.sin(phase * 0.55 + i * 0.3) * 0.022 * drive;
      bones[id].rotation.x = Math.sin(phase * 0.7 + i * 0.3) * 0.018 * drive;
    });
    limbs.forEach((c) => {
      const p = phase * 0.9 + c.side * 0.5;
      c.ids.forEach((id, i) => {
        if (kind === "hippocampus") {
          bones[id].rotation.x =
            Math.sin(p - i * 0.7) * [0.15, 0.18, 0.1][i] * drive;
          bones[id].rotation.z = c.side * Math.sin(p * 0.65) * 0.035;
        } else {
          bones[id].rotation.y =
            c.side * Math.sin(p - i * 0.4) * [0.13, 0.1, 0.05][i] * drive;
          bones[id].rotation.z =
            c.side * Math.cos(p - i * 0.4) * [0.06, 0.05, 0.03][i] * drive;
        }
      });
    });
    fins.forEach((c) =>
      c.ids.forEach((id, i) => {
        bones[id].rotation.y =
          c.side *
          Math.sin(phase * 1.3 - i * 0.75 + (c.upper ? 0.6 : 0)) *
          (0.035 + i * 0.045) *
          drive;
        bones[id].rotation.z =
          c.side *
          Math.sin(phase * 1.3 - i * 0.75) *
          (0.04 + i * 0.035) *
          drive;
      }),
    );
  });
}
