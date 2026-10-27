import * as THREE from "three";
import { penglaiBeastAsset, penglaiBeastFit } from "./penglai_beast_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  chainWeights,
  nearestChain,
  createLordBones,
} from "./hawaii_lord_rig.js";
export const PENGLAI_HF_BEASTS = new Set([
  "lushu",
  "gudiao",
  "nine_tail_fox",
  "zheng",
]);
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const CONTACT = {
  lushu: {
    head: [0, 0.08237324821061072, -0.4869801735626098],
    ground: 0.2513454610003903,
  },
  gudiao: {
    head: [0, 0.030111984173700146, -0.5040128301707735],
    ground: 0.312520344945074,
  },
  nine_tail_fox: {
    head: [0, 0.07300561336318451, -0.49856403244793923],
    ground: 0.23357284104081288,
  },
  zheng: {
    head: [0, 0.0633821951165253, -0.49856400000036627],
    ground: 0.24320318683032616,
  },
};
/** 真实生成表面分别拟合肢体、尾束与翼骨；世界接触、大小及步态输入沿用原契约。 */
export function buildPenglaiBeastHF(kind, root, motions) {
  const bird = kind === "gudiao",
    horse = kind === "lushu",
    fox = kind === "nine_tail_fox";
  const fit = penglaiBeastFit(kind),
    point = ([x, y, z]) => [
      x + fit.xOffset,
      y * fit.yScale + fit.yOffset,
      z * (fit.zScale ?? 1) + (fit.zOffset ?? 0),
    ];
  const chains = [],
    legs = [],
    tails = [],
    wings = [];
  const add = (name, type, points, extra = {}) => {
    const fitted = points.map(point);
    if (kind === "zheng" && type === "tail")
      fitted.forEach((p) => {
        p[0] += 1.38 * (p[2] - 0.18) * smooth(0.18, 0.3, p[2]);
      });
    const c = { name, type, points: fitted, ...extra };
    chains.push(c);
    return c;
  };
  let neck;
  if (horse) {
    neck = add("neck", "neck", [
      [0.017, 0.12, -0.24],
      [0.017, 0.22, -0.35],
      [0.017, 0.14, -0.48],
    ]);
    legs.push(
      add(
        "front_right",
        "leg",
        [
          [0.085, 0.07, -0.24],
          [0.09, -0.14, -0.26],
          [0.09, -0.3, -0.31],
        ],
        { side: 1, front: true },
      ),
    );
    legs.push(
      add(
        "front_left",
        "leg",
        [
          [-0.035, 0.07, -0.2],
          [-0.033, -0.14, -0.2],
          [-0.032, -0.3, -0.22],
        ],
        { side: -1, front: true },
      ),
    );
    legs.push(
      add(
        "rear_right",
        "leg",
        [
          [0.075, 0.085, 0.13],
          [0.09, -0.12, 0.195],
          [0.085, -0.3, 0.12],
        ],
        { side: 1, front: false },
      ),
    );
    legs.push(
      add(
        "rear_left",
        "leg",
        [
          [-0.035, 0.08, 0.16],
          [-0.035, -0.13, 0.23],
          [-0.035, -0.3, 0.195],
        ],
        { side: -1, front: false },
      ),
    );
    tails.push(
      add("red_tail", "tail", [
        [0.015, 0.145, 0.19],
        [0.005, 0.09, 0.29],
        [-0.015, -0.035, 0.36],
        [-0.035, -0.15, 0.43],
        [-0.055, -0.2, 0.48],
      ]),
    );
  } else if (bird) {
    neck = add("neck", "neck", [
      [0, 0.03, -0.18],
      [0, 0.12, -0.34],
      [0, 0.14, -0.48],
    ]);
    for (const side of [-1, 1])
      wings.push(
        add(
          "wing_" + side,
          "wing",
          [
            [side * 0.085, 0.035, -0.08],
            [side * 0.34, 0.1, -0.02],
            [side * 0.6, 0.19, 0.01],
            [side * 0.83, 0.24, 0.02],
          ],
          { side },
        ),
      );
    tails.push(
      add("steering_tail", "tail", [
        [0, -0.12, 0.16],
        [0, -0.24, 0.31],
        [0, -0.36, 0.47],
      ]),
    );
  } else if (!fox) {
    neck = add("neck", "neck", [
      [0.18, 0.13, -0.27],
      [0.18, 0.19, -0.39],
      [0.18, 0.15, -0.48],
    ]);
    legs.push(
      add(
        "front_left",
        "leg",
        [
          [0.14, 0.04, -0.25],
          [0.145, -0.15, -0.26],
          [0.133, -0.3, -0.314],
        ],
        { side: -1, front: true },
      ),
    );
    legs.push(
      add(
        "front_right",
        "leg",
        [
          [0.28, 0.04, -0.25],
          [0.28, -0.15, -0.29],
          [0.265, -0.3, -0.366],
        ],
        { side: 1, front: true },
      ),
    );
    legs.push(
      add(
        "rear_left",
        "leg",
        [
          [0.035, 0.04, 0.15],
          [0, -0.15, 0.21],
          [-0.033, -0.3, 0.186],
        ],
        { side: -1, front: false },
      ),
    );
    legs.push(
      add(
        "rear_right",
        "leg",
        [
          [0.2, 0.04, 0.14],
          [0.195, -0.15, 0.18],
          [0.238, -0.3, 0.114],
        ],
        { side: 1, front: false },
      ),
    );
    for (let i = 0; i < 5; i++) {
      const y = 0.285 - i * 0.11;
      tails.push(
        add("tail_" + i, "tail", [
          [0.1, 0.1, 0.17],
          [-0.025, 0.1 + (y - 0.1) * 0.25, 0.28],
          [-0.16, y + 0.035, 0.39],
          [-0.285, y, 0.47],
        ]),
      );
    }
  } else {
    // 九尾狐的关节由本批最终实体表面拟合，不能复用其他四足的比例。
    const c = fit.rig;
    neck = add("neck", "neck", c.neck);
    c.legs.forEach((p, i) =>
      legs.push(
        add("leg_" + i, "leg", p, { side: i % 2 ? 1 : -1, front: i < 2 }),
      ),
    );
    c.tails.forEach((p, i) => tails.push(add("tail_" + i, "tail", p)));
  }
  const bones = createLordBones(root, chains),
    base = bones[0],
    p = new THREE.Vector3();
  const asset = penglaiBeastAsset(kind, (x, y, z, ids, w, o) => {
    p.set(x, y, z);
    ids[o] = 0;
    w[o] = 1;
    const rawY = (y - fit.yOffset) / fit.yScale,
      rawX = x - fit.xOffset;
    if (bird) {
      const edge =
        smooth(0.075, 0.2, Math.abs(x)) * (1 - smooth(0.13, 0.24, z));
      if (edge > 0) {
        chainWeights(wings[x < 0 ? 0 : 1], p, edge, ids, w, o);
        return;
      }
      if (z > 0.16) {
        chainWeights(tails[0], p, smooth(0.16, 0.3, z), ids, w, o);
        return;
      }
    } else {
      let tail, near;
      for (const c of tails) {
        const n = nearestChain(p, c);
        if (!near || n.distance < near.distance) {
          tail = c;
          near = n;
        }
      }
      const start = horse ? 0.2 : fox ? fit.rig.tailStart : 0.19;
      const weight = fox
        ? smooth(
            0.04,
            0.12,
            p.distanceTo(new THREE.Vector3(...tails[0].points[0])),
          ) *
          Math.max(
            smooth(0.085, 0.135, z),
            smooth(0.025, 0.09, rawY) * smooth(-0.15, -0.055, z),
          )
        : smooth(start, start + 0.1, z) *
          (1 -
            smooth(
              horse ? 0.065 : 0.05,
              horse ? 0.12 : 0.11,
              Math.sqrt(near.distance),
            ));
      if (weight > 0.001) {
        if (horse) chainWeights(tail, p, weight, ids, w, o);
        else {
          const nearby = tails.map((c) => nearestChain(p, c));
          const total = nearby.reduce(
            (sum, n) => sum + Math.exp(-(n.distance - near.distance) / 0.0005),
            0,
          );
          const contributions = new Map([[0, 1 - weight]]);
          for (const n of nearby) {
            const k =
              (weight * Math.exp(-(n.distance - near.distance) / 0.0005)) /
              total;
            contributions.set(
              n.a,
              (contributions.get(n.a) || 0) + k * (1 - n.t),
            );
            contributions.set(n.b, (contributions.get(n.b) || 0) + k * n.t);
          }
          const sorted = [...contributions]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 4),
            sum = sorted.reduce((s, a) => s + a[1], 0);
          for (let j = 0; j < 4; j++) {
            ids[o + j] = sorted[j]?.[0] || 0;
            w[o + j] = (sorted[j]?.[1] || 0) / sum;
          }
        }
        return;
      }
      if (kind === "zheng" || fox || horse) {
        const nearLegs = legs.map((c) => ({ c, near: nearestChain(p, c) }));
        const closest = Math.min(...nearLegs.map((q) => q.near.distance));
        const lower = 1 - smooth(-0.19, -0.1, rawY);
        const coverage =
          (fox ? 1 - smooth(0.045, 0.085, z) : 1) *
          (1 - smooth(0.1, 0.15, Math.sqrt(closest))) *
          (1 -
            smooth(
              fox ? -0.2 : horse ? -0.24 : -0.16,
              fox ? -0.05 : horse ? -0.09 : 0.045,
              rawY,
            )) *
          (lower + (1 - lower) * (1 - smooth(0.04, 0.085, Math.sqrt(closest))));
        if (coverage > 0) {
          const contributions = new Map([[0, 1 - coverage]]);
          let spatial = 0;
          for (const q of nearLegs) {
            q.k = Math.exp(
              -(q.near.distance - closest) /
                (fox ? 0.0008 : horse ? 0.0012 : 0.00025),
            );
            spatial += q.k;
          }
          for (const { near, k } of nearLegs) {
            const w = (coverage * k) / spatial;
            contributions.set(
              near.a,
              (contributions.get(near.a) || 0) + w * (1 - near.t),
            );
            contributions.set(
              near.b,
              (contributions.get(near.b) || 0) + w * near.t,
            );
          }
          const sorted = [...contributions]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 4),
            sum = sorted.reduce((s, a) => s + a[1], 0);
          for (let j = 0; j < 4; j++) {
            ids[o + j] = sorted[j]?.[0] || 0;
            w[o + j] = (sorted[j]?.[1] || 0) / sum;
          }
          return;
        }
      }
    }
    chainWeights(
      neck,
      p,
      smooth(horse ? 0.22 : 0.25, horse ? 0.34 : 0.38, -z) *
        (fox
          ? smooth(-0.11, -0.035, rawY)
          : horse
            ? smooth(-0.1, 0.025, rawY)
            : 1),
      ids,
      w,
      o,
    );
  });
  if (!bird && !asset.geometry.userData.terrainRigidVertexIndices) {
    // Continuous HF skin still distinguishes flexible paws/tails from the load-bearing body.
    // Use the fitted joint weights rather than treating a lowered foot as a rigid terrain probe.
    const flexible = new Set([...legs, ...tails].flatMap((c) => c.ids));
    const a = asset.geometry.attributes,
      rigid = [];
    for (let i = 0; i < a.position.count; i++) {
      let weight = 0;
      for (let j = 0; j < 4; j++)
        if (flexible.has(a.skinIndex.array[i * 4 + j]))
          weight += a.skinWeight.array[i * 4 + j];
      if (weight < 0.25) rigid.push(i);
    }
    asset.geometry.userData.terrainRigidVertexIndices = rigid;
  }
  const mesh = bindOrganicBody(
    root,
    `${kind}_hf_body`,
    asset.geometry,
    asset.material,
    bones,
    0.55,
  );
  root.userData.hfRig = { kind, mesh, bones, chains, legs, tails, wings, neck };
  root.userData.mythicAnatomy = kind;
  const head = new THREE.Vector3(...CONTACT[kind].head);
  root.userData.getHeadWorldPositions = () => [root.localToWorld(head.clone())];
  root.userData.groundSupport = CONTACT[kind].ground;
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "trellis_penglai_beasts_20261027";
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (!disposed) {
      disposed = true;
      mesh.skeleton.dispose();
    }
  };
  for (const c of legs) {
    c.rest = c.points.map((a) => new THREE.Vector3(...a));
    c.lengths = [
      c.rest[0].distanceTo(c.rest[1]),
      c.rest[1].distanceTo(c.rest[2]),
    ];
    const axis = c.rest[2].clone().sub(c.rest[0]).normalize();
    c.bend = c.rest[1].clone().sub(c.rest[0]);
    c.bend.addScaledVector(axis, -c.bend.dot(axis)).normalize();
    let sole = Infinity;
    const g = mesh.geometry,
      a = g.attributes;
    for (let i = 0; i < a.position.count; i++) {
      let w = 0;
      for (let j = 0; j < 4; j++)
        if (c.ids.includes(a.skinIndex.array[i * 4 + j]))
          w += a.skinWeight.array[i * 4 + j];
      if (w > 0.9) sole = Math.min(sole, a.position.getY(i));
    }
    c.soleCorrection = Number.isFinite(sole) ? -CONTACT[kind].ground - sole : 0;
  }
  const target = new THREE.Vector3(),
    delta = new THREE.Vector3(),
    dir = new THREE.Vector3(),
    normal = new THREE.Vector3(),
    knee = new THREE.Vector3(),
    v0 = new THREE.Vector3(),
    v1 = new THREE.Vector3(),
    q0 = new THREE.Quaternion(),
    q1 = new THREE.Quaternion();
  function solve(c, dy, dz) {
    const [a, b, d] = c.rest,
      [l1, l2] = c.lengths;
    target.set(0, dy + c.soleCorrection - base.position.y, dz).add(d);
    delta.copy(target).sub(a);
    const len = Math.min(l1 + l2 - 0.00001, Math.max(0.0001, delta.length()));
    dir.copy(delta).normalize();
    const along = (l1 * l1 - l2 * l2 + len * len) / (2 * len),
      height = Math.sqrt(Math.max(0, l1 * l1 - along * along));
    normal.copy(c.bend).addScaledVector(dir, -c.bend.dot(dir)).normalize();
    knee.copy(a).addScaledVector(dir, along).addScaledVector(normal, height);
    target.copy(a).addScaledVector(dir, len);
    q0.setFromUnitVectors(
      v0.copy(b).sub(a).normalize(),
      v1.copy(knee).sub(a).normalize(),
    );
    q1.setFromUnitVectors(
      v0.copy(d).sub(b).normalize(),
      v1.copy(target).sub(knee).normalize(),
    );
    bones[c.ids[0]].quaternion.copy(q0);
    bones[c.ids[1]].quaternion.copy(q0).invert().multiply(q1);
    bones[c.ids[2]].quaternion.copy(q1).invert();
  }
  motions.push((phase, speed, state) => {
    if (bird) {
      const beat = phase * 0.85,
        glide = 0.35 + 0.65 * smooth(-0.65, 0.45, Math.sin(phase * 0.13));
      for (const c of wings)
        c.ids.forEach((id, j) => {
          bones[id].rotation.z =
            c.side *
            ((j === 0 ? -0.11 : 0) +
              Math.sin(beat - j * 0.42) *
                (j === 0 ? 0.48 : j === 1 ? 0.17 : 0.09) *
                glide);
          bones[id].rotation.y =
            c.side * Math.max(0, Math.cos(beat - j * 0.35)) * 0.04;
        });
    } else {
      const crouch =
          state?.phase === "windup" ? smooth(0, 0.45, state.progress ?? 1) : 0,
        leap =
          state?.phase === "leap"
            ? Math.sin(Math.PI * (state.progress ?? 0.5))
            : 0;
      const moving = state
          ? Math.min(1, state.speed / Math.max(0.01, root.scale.x * 0.15))
          : 1,
        walk = (1 - crouch) * (1 - leap),
        duty = 0.67;
      base.position.y = (horse ? -0.017 : -0.007) - 0.022 * crouch;
      for (const c of legs) {
        const cycle =
            (((phase / (2 * Math.PI) +
              (c.side === 1 ? 0.5 : 0) +
              (c.front ? 0.25 : 0)) %
              1) +
              1) %
            1,
          stance = cycle < duty,
          u = stance ? cycle / duty : (cycle - duty) / (1 - duty),
          step =
            (stance ? -1 + 2 * u : 1 - 2 * u * u * (3 - 2 * u)) *
            (horse ? 0.105 : fox ? 0.045 : 0.065) *
            moving *
            walk,
          lift =
            (stance
              ? 0
              : Math.sin(Math.PI * u) ** 2 * (horse ? 0.035 : 0.025)) *
            moving *
            walk;
        solve(
          c,
          lift + (c.front ? 0.065 : 0.04) * leap,
          step + (c.front ? -0.07 : 0.055) * leap - 0.012 * crouch,
        );
      }
      bones[neck.ids[0]].rotation.x =
        -0.045 * crouch +
        0.025 * leap +
        Math.sin(phase * 2) * 0.008 * moving * walk;
    }
    tails.forEach((c, i) =>
      c.ids.forEach((id, j) => {
        bones[id].rotation.y =
          Math.sin(phase * (bird ? 0.42 : 0.36) - j * 0.5 - i * 0.25) *
          (bird ? 0.009 : horse ? 0.024 : 0.052) *
          (j ? 1 : 0.4);
        bones[id].rotation.x =
          Math.sin(phase * 0.32 - j * 0.4 - i * 0.4) *
          (bird ? 0.013 : horse ? 0.009 : 0.026);
      }),
    );
  });
}
