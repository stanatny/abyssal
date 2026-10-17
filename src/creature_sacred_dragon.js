import * as T from "three";
import {
  pgGeometry,
  pgMaterial as mat,
  pgOval as oval,
  pgFeather as feather,
  pgFin as fin,
  pgPart as part,
} from "./creature_penglai_art.js";
import {
  guardianLoft as loft,
  guardianSweep as sweep,
} from "./creature_guardian_art.js";

let bodyMaterial;
/** 青龙的连续肌肉躯干与骨节共用一条轴线，鬃脊、四爪随所在躯段运动。 */
export function buildSacredDragon(b, motions, root) {
  const jade = mat("#285d59", 2),
    ridge = mat("#173f40", 2),
    bronze = mat("#9b8656", 4),
    ivory = mat("#c6bea0"),
    dark = mat("#142b2d"),
    mane = mat("#829487", 6),
    mouthMat = mat("#382f32");
  const count = 19,
    start = -0.18,
    extent = 1.18,
    bones = [];
  for (let i = 0; i < count; i++) {
    const bone = new T.Bone();
    bone.name = "azure_continuous_axial_joint";
    bone.position.z = start + (extent * i) / (count - 1);
    b.add(bone);
    bones.push(bone);
  }
  if (!bodyMaterial) {
    bodyMaterial = jade.clone();
    bodyMaterial.color.set("#ffffff");
    bodyMaterial.vertexColors = true;
    bodyMaterial.onBeforeCompile = jade.onBeforeCompile;
    bodyMaterial.customProgramCacheKey = () => "sacred_dragon_scaled_skin_v1";
  }
  const geometry = pgGeometry("sacred_azure_continuous_trunk_v1", () => {
    const ps = [],
      ix = [],
      si = [],
      sw = [],
      colors = [],
      rows = 144,
      sides = 24,
      upper = new T.Color("#316b64"),
      lower = new T.Color("#b0a383");
    for (let i = 0; i <= rows; i++) {
      const p = i / rows,
        radius =
          (0.091 * Math.pow(1 - p, 0.7) + 0.002) * Math.min(1, 0.72 + p * 3),
        u = p * (count - 1),
        a = Math.min(count - 2, Math.floor(u)),
        f = u - a;
      for (let j = 0; j <= sides; j++) {
        const angle = (j / sides) * Math.PI * 2,
          cy = Math.sin(angle),
          c = upper
            .clone()
            .lerp(lower, T.MathUtils.smoothstep(-cy, 0.15, 0.75));
        ps.push(
          Math.cos(angle) * radius,
          cy * radius * 0.9,
          start + extent * p,
        );
        si.push(a, a + 1, 0, 0);
        sw.push(1 - f, f, 0, 0);
        colors.push(c.r, c.g, c.b);
        if (i < rows && j < sides) {
          const n = i * (sides + 1) + j;
          ix.push(n, n + 1, n + sides + 1, n + 1, n + sides + 2, n + sides + 1);
        }
      }
    }
    for (const end of [0, rows]) {
      const center = ps.length / 3,
        bone = end ? count - 1 : 0;
      ps.push(0, 0, start + (extent * end) / rows);
      si.push(bone, bone, 0, 0);
      sw.push(1, 0, 0, 0);
      colors.push(upper.r, upper.g, upper.b);
      for (let j = 0; j < sides; j++) {
        const a = end * (sides + 1) + j,
          c = a + 1;
        end ? ix.push(center, a, c) : ix.push(center, c, a);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(ps, 3));
    g.setAttribute("skinIndex", new T.Uint16BufferAttribute(si, 4));
    g.setAttribute("skinWeight", new T.Float32BufferAttribute(sw, 4));
    g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    g.setIndex(ix);
    g.computeVertexNormals();
    return g;
  });
  const trunk = new T.SkinnedMesh(geometry, bodyMaterial);
  trunk.name = "sacred_azure_continuous_trunk";
  trunk.userData.anatomyKey = "dragon_v2_azure_dragon_0";
  trunk.userData.keepSeparate = trunk.userData.articulated = true;
  trunk.boundingSphere = new T.Sphere(new T.Vector3(0, 0, 0.4), 0.73);
  trunk.frustumCulled = false;
  b.add(trunk);
  root.updateMatrixWorld(true);
  trunk.bind(new T.Skeleton(bones));
  trunk.userData.penglaiGuardianSkeleton = trunk.skeleton;
  const paws = [];
  for (let i = 0; i < count - 1; i++) {
    const p = i / (count - 1),
      r = (0.091 * Math.pow(1 - p, 0.7) + 0.002) * Math.min(1, 0.72 + p * 3),
      bone = bones[i];
    const crest = fin(
      bone,
      ridge,
      [
        [-0.044, r * 0.74],
        [-0.013, r + 0.045 * (1 - p)],
        [0.04, r * 0.74],
      ],
      0.008,
      "solid_azure_back_crest",
    );
    crest.rotation.y = Math.PI / 2;
    for (const side of [-1, 1])
      for (let row = 0; row < 3; row++) {
        const angle = side * (0.18 + row * 0.6),
          geom = pgGeometry(
            `azure_imbricated_scale_${i}_${row}_${side}`,
            () => {
              const ps = [],
                ix = [];
              const zSize = 0.046;
              for (let j = 0; j < 5; j++) {
                const a = angle + (-0.4 + j * 0.2);
                ps.push(
                  Math.cos(a) * r * 1.005,
                  Math.sin(a) * r * 0.9 * 1.005,
                  -zSize,
                );
                ps.push(
                  Math.cos(a) * r * 1.018,
                  Math.sin(a) * r * 0.9 * 1.018,
                  zSize * (1 - Math.abs(j - 2) * 0.32),
                );
                if (j < 4) {
                  const n = j * 2;
                  ix.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
                }
              }
              const g = new T.BufferGeometry();
              g.setAttribute("position", new T.Float32BufferAttribute(ps, 3));
              g.setIndex(ix);
              g.computeVertexNormals();
              return g;
            },
          );
        part(
          bone,
          geom,
          row === 2 ? jade : ridge,
          [0, 0, 0],
          [1, 1, 1],
          [],
          "fitted_azure_imbricated_scale",
        );
      }
    if (i % 2 === 0)
      for (const side of [-1, 1]) {
        const f = feather(
          bone,
          mane,
          0.085 * (1 - p) + 0.035,
          0.017,
          0.014,
          "swept_axial_mane",
        );
        f.position.set(side * r * 0.45, r * 0.65, -0.01);
        f.rotation.set(-0.5, side * 0.45, 0);
      }
    if ([2, 11].includes(i))
      for (const side of [-1, 1]) {
        const leg = new T.Group();
        leg.name = "powerful_azure_grasping_limb";
        leg.position.set(side * r * 0.6, -r * 0.35, 0);
        bone.add(leg);
        sweep(
          leg,
          jade,
          [
            [0, 0, 0],
            [side * 0.085, -0.035, -0.035],
            [side * 0.108, -0.105, 0.006],
            [side * 0.15, -0.115, -0.075],
          ],
          [0.036, 0.032, 0.022, 0.024],
          "continuous_dragon_limb_muscle",
        );
        for (let j = -1; j <= 2; j++)
          sweep(
            leg,
            ivory,
            [
              [side * 0.15 + j * 0.017, -0.115, -0.07],
              [side * 0.17 + j * 0.019, -0.12, -0.105],
              [side * 0.17 + j * 0.021, -0.094, -0.13],
            ],
            [0.01, 0.007, 0.0005],
            "curved_grasping_dragon_talon",
          );
        paws.push({ leg, side, hind: i > 5 });
      }
    // 骨骼本身不是Group；包一层刚性挂点，让同材质鳞甲与鬃脊仍能合批。
    const mantle = new T.Group();
    mantle.name = "azure_rigid_axial_mantle";
    for (const child of [...bone.children]) mantle.add(child);
    bone.add(mantle);
  }
  const head = new T.Group();
  head.name = "sacred_azure_predator_head";
  head.scale.set(1.27, 1.15, 1.12);
  head.position.set(0, 0.006, -0.21);
  bones[0].add(head);
  head.position.z = -0.03;
  loft(
    head,
    "sacred_azure_ridged_skull",
    jade,
    [
      [-0.29, 0.029, 0.02, 0.023],
      [-0.24, 0.053, 0.029, 0.026],
      [-0.16, 0.064, 0.038, 0.029],
      [-0.07, 0.09, 0.07, 0.02],
      [0.015, 0.076, 0.065, 0.018],
      [0.065, 0.037, 0.047, 0.005],
    ],
    0.62,
  );
  const jaw = new T.Group();
  jaw.position.set(0, -0.025, -0.045);
  head.add(jaw);
  loft(
    jaw,
    "sacred_azure_heavy_mandible",
    ivory,
    [
      [-0.24, 0.028, 0.009, -0.018],
      [-0.18, 0.056, 0.016, -0.02],
      [-0.08, 0.068, 0.022, -0.016],
      [0.025, 0.048, 0.022, 0],
    ],
    0.7,
  );
  loft(
    jaw,
    "sacred_azure_visible_mouth",
    mouthMat,
    [
      [-0.235, 0.023, 0.005, -0.002],
      [-0.16, 0.05, 0.008, 0],
      [-0.035, 0.053, 0.008, 0.009],
      [0.02, 0.023, 0.004, 0.008],
    ],
    0.75,
  );
  for (const side of [-1, 1]) {
    oval(
      head,
      dark,
      [side * 0.071, 0.032, -0.13],
      [0.017, 0.009, 0.012],
      "deep_azure_orbit",
    );
    oval(
      head,
      bronze,
      [side * 0.078, 0.033, -0.14],
      [0.009, 0.0045, 0.006],
      "narrow_azure_iris",
    );
    oval(
      head,
      dark,
      [side * 0.082, 0.033, -0.143],
      [0.0025, 0.006, 0.004],
      "azure_vertical_pupil",
    );
    sweep(
      head,
      ridge,
      [
        [side * 0.039, 0.052, -0.184],
        [side * 0.071, 0.069, -0.14],
        [side * 0.096, 0.07, -0.082],
        [side * 0.112, 0.064, -0.014],
      ],
      [0.012, 0.02, 0.019, 0.001],
      "heavy_slanted_azure_brow",
    );
    oval(
      head,
      dark,
      [side * 0.031, 0.018, -0.264],
      [0.008, 0.005, 0.013],
      "azure_recessed_nostril",
    );
    sweep(
      head,
      bronze,
      [
        [side * 0.057, 0.067, 0.012],
        [side * 0.088, 0.136, 0.052],
        [side * 0.13, 0.202, 0.115],
        [side * 0.16, 0.235, 0.17],
      ],
      [0.026, 0.022, 0.012, 0.0005],
      "swept_azure_antler",
    );
    sweep(
      head,
      bronze,
      [
        [side * 0.091, 0.142, 0.06],
        [side * 0.145, 0.166, 0.08],
        [side * 0.18, 0.19, 0.056],
      ],
      [0.014, 0.009, 0.0005],
      "azure_antler_front_branch",
    );
    sweep(
      head,
      bronze,
      [
        [side * 0.127, 0.2, 0.113],
        [side * 0.108, 0.247, 0.13],
        [side * 0.12, 0.274, 0.145],
      ],
      [0.012, 0.007, 0.0005],
      "azure_antler_crown_branch",
    );
    for (let i = 0; i < 6; i++) {
      const f = feather(
        head,
        mane,
        0.17 + i * 0.008,
        0.023,
        0.03,
        "swept_azure_cheek_blade",
      );
      f.position.set(side * (0.06 + i * 0.005), 0.008 + i * 0.014, -0.035);
      f.rotation.set(-0.18, side * (0.27 + i * 0.055), side * 0.12);
    }
    for (let j = 0; j < 6; j++)
      sweep(
        head,
        ivory,
        [
          [
            side * (0.038 + Math.sin((j / 5) * Math.PI) * 0.022),
            -0.017,
            -0.235 + j * 0.032,
          ],
          [
            side * (0.037 + Math.sin((j / 5) * Math.PI) * 0.02),
            -0.052 - (j === 1 ? 0.016 : 0),
            -0.24 + j * 0.032,
          ],
        ],
        [j < 2 ? 0.009 : 0.005, 0.0004],
        "exposed_azure_curved_fang",
      );
    sweep(
      head,
      bronze,
      [
        [side * 0.047, -0.002, -0.267],
        [side * 0.115, -0.016, -0.279],
        [side * 0.183, 0.028, -0.165],
        [side * 0.205, 0.055, 0.01],
      ],
      [0.005, 0.0045, 0.003, 0.0003],
      "flowing_azure_whisker",
    );
  }
  sweep(
    head,
    mane,
    [
      [0, -0.039, -0.135],
      [0, -0.096, -0.08],
      [0.01, -0.12, 0.06],
    ],
    [0.021, 0.017, 0.0005],
    "long_azure_chin_beard",
  );
  const mouth = new T.Object3D();
  mouth.position.set(0, -0.026, -0.286);
  head.add(mouth);
  b.userData.mouthAnchors = [mouth];
  b.userData.headAnchor = new T.Vector3(
    0,
    0.006 - 0.026 * 1.15,
    -0.21 - 0.286 * 1.12,
  );
  const state = { effort: 0.5 },
    up = new T.Vector3(),
    down = new T.Vector3(),
    axis = new T.Vector3(0, 0, 1);
  let previous;
  const point = (p, t, out) => {
    const weight = Math.sin((Math.min(1, p * 2.5) * Math.PI) / 2);
    return out.set(
      Math.sin(t * 0.54 - p * 7.8) * (0.08 + state.effort * 0.025) * weight,
      Math.sin(t * 0.27 - p * 4.2) * 0.018 * weight,
      start + extent * p,
    );
  };
  root.userData.azureAxialRig = { bones, trunk, state };
  root.userData.resetSwimTravel = () => {
    state.effort = 0.5;
    previous = undefined;
  };
  motions.push((t, e) => {
    const dt =
      previous === undefined
        ? 0
        : Math.max(0, Math.min(0.12, (t - previous) / (1.7 + e * 1.1)));
    previous = t;
    state.effort = T.MathUtils.damp(state.effort, e, 4, dt);
    bones.forEach((bone, i) => {
      const p = i / (count - 1);
      point(p, t, bone.position);
      point(Math.min(1, p + 0.005), t, up);
      point(Math.max(0, p - 0.005), t, down);
      if (i === 0) bone.quaternion.identity();
      else bone.quaternion.setFromUnitVectors(axis, up.sub(down).normalize());
    });
    for (const { leg, side, hind } of paws) {
      leg.rotation.x = Math.sin(t * 0.42 + (hind ? 1.2 : 0)) * 0.055;
      leg.rotation.z = side * (0.07 + Math.sin(t * 0.35) * 0.025);
    }
    jaw.rotation.x = 0.07 + Math.sin(t * 0.3) * 0.015;
  });
}
