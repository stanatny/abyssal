import * as THREE from "three";
/** 根据已有壳体和肢体根部细化结构，不向未知表面随意悬挂装饰。 */
export function refineEuropaAnatomy(c) {
  const { kind, skin, edge, dark } = c;
  if (["sail_crawler", "hinge_walker"].includes(kind)) {
    const walker = kind === "hinge_walker";
    c.oval("cephalic_shield", [0, 0.026, -0.275], [0.11, 0.066, 0.092], skin);
    for (const s of [-1, 1]) {
      // 感觉器置于头甲两侧凹窝；步行型与游动型使用不同根部厚度。
      c.oval(
        `sensor_socket${s}`,
        [s * 0.083, 0.045, -0.305],
        [0.028, 0.025, 0.026],
        dark,
      );
      c.oval(
        `sensor_lens${s}`,
        [s * 0.093, 0.049, -0.314],
        [0.015, 0.016, 0.018],
        c.organ,
      );
      for (let i = 0; i < 3; i++) {
        const limb = c.anatomy.getObjectByName(`jointed_limb_${s}_${i}`);
        if (!limb) continue;
        c.oval(
          `coxa${s}_${i}`,
          [0, 0, 0],
          [0.035, walker ? 0.034 : 0.028, 0.036],
          skin,
          limb,
        );
        c.part(
          `elbow_cuff${s}_${i}`,
          c.tapered(
            `cuff${s}_${i}`,
            [
              [s * 0.13, -0.045, -0.025],
              [s * 0.17, -0.07, 0.01],
            ],
            walker ? 0.031 : 0.025,
            0.02,
            10,
          ),
          edge,
          [0, 0, 0],
          limb,
        );
        c.oval(
          `elbow_joint${s}_${i}`,
          [s * 0.17, -0.07, 0.01],
          [0.022, 0.022, 0.023],
          dark,
          limb,
        );
      }
    }
  }
  if (kind === "forkjaw_stalker") {
    c.part(
      "jaw_adductor",
      c.trunk("adductor", [
        [-0.32, 0.11, 0.075],
        [-0.22, 0.16, 0.1],
        [-0.04, 0.12, 0.08],
        [0.09, 0.06, 0.04],
      ]),
      skin,
      [0, 0, 0],
    );
    for (const s of [-1, 1]) {
      c.oval(
        `recessed_sensor${s}`,
        [s * 0.117, 0.045, -0.27],
        [0.028, 0.025, 0.044],
        dark,
      );
      c.oval(
        `sensor_globe${s}`,
        [s * 0.132, 0.05, -0.285],
        [0.017, 0.016, 0.023],
        c.organ,
      );
      const jaw = c.anatomy.getObjectByName(`split_mandible${s}`);
      c.oval(`mandible_joint${s}`, [0, 0, 0], [0.053, 0.04, 0.044], skin, jaw);
    }
  }
  if (kind === "prism_hunter") {
    for (let i = 0; i < 3; i++) {
      const a = (i * 2 * Math.PI) / 3,
        g = c.group(`faceted_sensor${i}`);
      g.rotation.z = a;
      c.oval(
        `dart_socket${i}`,
        [0, 0.105, -0.27],
        [0.034, 0.018, 0.064],
        dark,
        g,
      );
      c.oval(
        `dart_lens${i}`,
        [0, 0.119, -0.28],
        [0.018, 0.011, 0.037],
        c.organ,
        g,
      );
      c.part(
        `keel_seam${i}`,
        c.tapered(
          `keel_seam${i}`,
          [
            [0, 0.038, -0.4],
            [0, 0.143, -0.2],
            [0, 0.136, 0.04],
            [0, 0.073, 0.31],
          ],
          0.006,
          0.002,
          20,
        ),
        edge,
        [0, 0, 0],
        g,
      );
    }
  }
  if (kind === "glass_seed") {
    // 中心器官由有厚度的囊膜包裹，透明壳之间保留原有三维棱线。
    c.part(
      "inner_vesicle",
      c.trunk(
        "inner_vesicle",
        [
          [-0.24, 0.008, 0.011],
          [-0.12, 0.065, 0.06],
          [0.1, 0.07, 0.057],
          [0.23, 0.005, 0.008],
        ],
        0.008,
      ),
      skin,
    );
    for (let i = 0; i < 5; i++)
      c.oval(
        `encapsulated_granule${i}`,
        [Math.sin(i * 2) * 0.035, Math.cos(i * 2) * 0.028, -0.12 + i * 0.057],
        [0.014, 0.012, 0.023],
        c.organ,
      );
  }
  if (kind === "ribbon_spore") {
    c.part(
      "anterior_capsule",
      c.trunk("capsule", [
        [-0.49, 0.009, 0.007],
        [-0.38, 0.043, 0.035],
        [-0.2, 0.028, 0.023],
        [-0.14, 0.006, 0.008],
      ]),
      skin,
    );
    for (const s of [-1, 1])
      c.part(
        `sensory_groove${s}`,
        c.tapered(
          `groove${s}`,
          [
            [s * 0.019, 0.018, -0.42],
            [s * 0.034, 0.027, -0.35],
            [s * 0.024, 0.015, -0.23],
          ],
          0.005,
          0.002,
          16,
        ),
        edge,
      );
  }
  if (kind === "veil_glider") {
    c.part(
      "streamlined_mantle",
      c.trunk("mantle", [
        [-0.4, 0.009, 0.012],
        [-0.25, 0.056, 0.045],
        [0, 0.07, 0.055],
        [0.28, 0.023, 0.019],
        [0.43, 0.001, 0.003],
      ]),
      skin,
    );
    for (const s of [-1, 1]) {
      c.oval(
        `glider_socket${s}`,
        [s * 0.046, 0.026, -0.27],
        [0.018, 0.014, 0.023],
        dark,
      );
      c.oval(
        `glider_sensor${s}`,
        [s * 0.052, 0.03, -0.28],
        [0.008, 0.008, 0.012],
        c.organ,
      );
    }
  }
  // 口器内部薄片沿已建成的口缘局部坐标放置；不加第二个悬浮外环。
  const mouths = [];
  c.anatomy.traverse((o) => {
    if (
      o.isMesh &&
      /^(intake_rim|filter_mouth|dark_maw|serpent_maw|funnel_rim)/.test(o.name)
    )
      mouths.push(o);
  });
  for (const [j, m] of mouths.entries()) {
    const radius = m.geometry.parameters?.radius;
    if (!radius) continue;
    const socket = c.group(
      `intake_lamellae${j}`,
      m.position.toArray(),
      m.parent,
    );
    socket.quaternion.copy(m.quaternion);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4,
        cs = Math.cos(a),
        sn = Math.sin(a);
      c.part(
        `oral_fold${j}_${i}`,
        c.tapered(
          `oral_fold${j}_${i}`,
          [
            [cs * radius * 0.94, sn * radius * 0.94, 0.008],
            [cs * radius * 0.69, sn * radius * 0.69, 0.03],
            [cs * radius * 0.4, sn * radius * 0.4, 0.052],
          ],
          radius * 0.095,
          radius * 0.025,
          8,
        ),
        edge,
        [0, 0, 0],
        socket,
      );
    }
  }
  c.root.userData.artRevision = "europa_structure_v2";
}
