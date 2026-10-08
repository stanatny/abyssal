import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import {
  pgMaterial as mat,
  pgOval as oval,
  pgTaper as taper,
  pgDrape as drape,
  pgFin as fin,
  pgSword as sword,
  pgPart as part,
  pgGeometry,
} from "./creature_penglai_art.js";

/** 御剑真君采用正面人像、分层衣褶与指诀；不是套用走兽眼睛的球头人物。 */
export function buildPenglaiSage(b, motions, root) {
  const robe = mat("#244c59", 3),
    ivory = mat("#ddd4b1", 3),
    gold = mat("#b3924c", 4),
    skin = mat("#ba9e7a"),
    shadow = mat("#7d6350"),
    hair = mat("#c5c4b2", 3),
    dark = mat("#26302e"),
    jade = mat("#3e8073", 4);
  const mantle = new THREE.Group();
  mantle.name = "wind_borne_brocade_robe";
  b.add(mantle);
  drape(
    mantle,
    robe,
    "sage_outer",
    [
      [0.08, 0.115, 0.065],
      [-0.08, 0.14, 0.082],
      [-0.25, 0.19, 0.105],
      [-0.42, 0.245, 0.15],
    ],
    16,
  );
  const front = drape(
    mantle,
    ivory,
    "sage_inner",
    [
      [0.08, 0.083, 0.064],
      [-0.12, 0.101, 0.081],
      [-0.4, 0.158, 0.13],
    ],
    14,
  );
  front.position.z = -0.031;
  // 长袍内也保留完整骨盆、双腿和脚踝，从下方和侧方观察不会成为空壳。
  oval(b, robe, [0, -0.02, 0.012], [0.095, 0.085, 0.066], "clothed_pelvis");
  const boot = pgGeometry("sage_supported_cloth_boot_v2", () => {
    const profiles = [
        [-0.093, 0.002, 0.009],
        [-0.085, 0.012, 0.018],
        [-0.07, 0.022, 0.023],
        [-0.031, 0.027, 0.033],
        [0.006, 0.025, 0.065],
        [0.034, 0.023, 0.04],
        [0.052, 0.008, 0.018],
      ],
      positions = [],
      indices = [],
      sides = 20,
      rings = 28;
    for (let i = 0; i <= rings; i++) {
      const u = (i / rings) * (profiles.length - 1),
        k = Math.min(profiles.length - 2, Math.floor(u)),
        f = u - k,
        [za, xa, ya] = profiles[k],
        [zb, xb, yb] = profiles[k + 1],
        z = THREE.MathUtils.lerp(za, zb, f),
        width = THREE.MathUtils.lerp(xa, xb, f),
        height = THREE.MathUtils.lerp(ya, yb, f);
      for (let j = 0; j < sides; j++) {
        const a = (j / sides) * Math.PI * 2;
        positions.push(
          Math.cos(a) * width,
          height * THREE.MathUtils.smoothstep(Math.sin(a), -0.6, 1),
          z,
        );
        if (i < rings) {
          const v = i * sides + j,
            w = i * sides + ((j + 1) % sides);
          indices.push(v, w, v + sides, w, w + sides, v + sides);
        }
      }
    }
    for (const end of [0, rings]) {
      const center = positions.length / 3,
        profile = profiles[end ? profiles.length - 1 : 0],
        base = end * sides;
      positions.push(0, profile[2] * 0.5, profile[0]);
      for (let j = 0; j < sides; j++)
        end
          ? indices.push(center, base + j, base + ((j + 1) % sides))
          : indices.push(center, base + ((j + 1) % sides), base + j);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  });
  for (const side of [-1, 1]) {
    const stanceZ = side * 0.038;
    taper(
      b,
      robe,
      [
        [side * 0.047, -0.055, 0.016],
        [side * 0.046, -0.19, stanceZ - 0.02],
        [side * 0.048, -0.31, stanceZ + 0.012],
        [side * 0.047, -0.393, stanceZ + 0.006],
      ],
      [0.044, 0.033, 0.03, 0.022],
      "continuous_robed_leg",
    );
    // 鞋底保持水平支撑面；一前一后的脚位和微屈膝形成稳定御剑站姿。
    part(
      b,
      boot,
      dark,
      [side * 0.047, -0.4302, stanceZ],
      [1, 1, 1],
      [0, -side * 0.07, 0],
      "raised_toe_cloth_boot",
    );
  }
  for (const side of [-1, 1]) {
    const lapel = fin(
      b,
      ivory,
      [
        [side * 0.035, 0.24],
        [side * 0.095, 0.165],
        [side * 0.065, 0.035],
        [0, 0.02],
      ],
      0.014,
      "overlapping_collar",
    );
    lapel.position.z = -0.085;
    taper(
      mantle,
      gold,
      [
        [side * 0.09, 0.12, -0.09],
        [side * 0.116, -0.1, -0.112],
        [side * 0.185, -0.4, -0.123],
      ],
      [0.006, 0.006, 0.003],
      "embroidered_robe_border",
    );
    // 护肩与长袖共用肩关节，指诀手掌和五指均有明确的腕部连接。
    const arm = new THREE.Group();
    arm.position.set(side * 0.095, 0.195, 0);
    b.add(arm);
    taper(
      arm,
      robe,
      [
        [0, 0, 0],
        [side * 0.055, -0.037, -0.033],
        [side * 0.107, -0.057, -0.093],
        [side * 0.125, -0.064, -0.121],
      ],
      [0.044, 0.057, 0.047, 0.034],
      "connected_broad_sleeve",
    );
    const sleeve = drape(
      arm,
      robe,
      `sage_hanging_sleeve_${side}`,
      [
        [0, 0.036, 0.027],
        [-0.14, 0.056, 0.05],
        [-0.22, 0.034, 0.028],
      ],
      8,
    );
    sleeve.position.set(side * 0.081, -0.047, -0.07);
    sleeve.rotation.z = side * 0.3;
    taper(
      arm,
      gold,
      [
        [side * 0.094, -0.035, -0.13],
        [side * 0.124, -0.072, -0.15],
        [side * 0.151, -0.09, -0.115],
      ],
      [0.003, 0.003, 0.003],
      "embroidered_sleeve_cuff",
    );
    const shoulder = fin(
      arm,
      jade,
      [
        [-0.045, 0.016],
        [0, 0.04],
        [0.048, 0.0],
        [0.057, -0.024],
        [0, -0.044],
        [-0.037, -0.011],
      ],
      0.015,
      "layered_cloud_mantle",
    );
    shoulder.rotation.x = -0.28;
    shoulder.position.z = -0.01;
    const hand = new THREE.Group();
    hand.position.set(side * 0.122, -0.065, -0.124);
    hand.rotation.set(-0.35, side * 0.35, side * 0.28);
    arm.add(hand);
    oval(hand, skin, [0, 0, 0], [0.023, 0.034, 0.014], "anatomical_palm");
    for (let j = 0; j < 4; j++) {
      const x = (j - 1.5) * 0.01,
        extended = j < 2;
      taper(
        hand,
        skin,
        [
          [x, 0.018, -0.002],
          [x, 0.041, extended ? -0.003 : -0.015],
          [x, 0.068 - j * 0.004, extended ? -0.005 : -0.023],
        ],
        [0.005, 0.004, 0.0025],
        extended ? "sword_command_finger" : "curled_finger",
      );
    }
    taper(
      hand,
      skin,
      [
        [side * 0.02, -0.004, 0],
        [side * 0.032, 0.012, -0.004],
        [side * 0.027, 0.024, -0.015],
      ],
      [0.007, 0.005, 0.002],
      "opposing_thumb",
    );
    motions.push((t) => {
      arm.rotation.x = Math.sin(t * 0.48 + side) * 0.04;
      arm.rotation.z = side * Math.sin(t * 0.3) * 0.035;
    });
    const tail = new THREE.Group();
    tail.position.set(side * 0.09, 0.11, 0.045);
    mantle.add(tail);
    drape(
      tail,
      robe,
      `sage_ribbon_${side}`,
      [
        [0, 0.032, 0.018],
        [-0.18, 0.046, 0.025],
        [-0.48, 0.026, 0.015],
      ],
      5,
    );
    tail.rotation.x = -0.28;
    tail.rotation.z = side * 0.14;
    motions.push(
      (t) => (tail.rotation.x = -0.28 + Math.sin(t * 0.6 + side) * 0.065),
    );
  }
  for (const side of [-1, 1])
    for (let j = 0; j < 4; j++) {
      const y = -0.1 - j * 0.065,
        x = side * (0.125 + j * 0.017);
      taper(
        mantle,
        gold,
        [
          [x, y, -0.055],
          [x + side * 0.018, y + 0.022, -0.055],
          [x + side * 0.03, y + 0.002, -0.062],
          [x + side * 0.016, y - 0.012, -0.07],
          [x, y + 0.002, -0.08],
        ],
        [0.0018, 0.0018, 0.0018, 0.0016, 0.0004],
        "brocade_cloud_scroll",
      );
    }
  oval(b, robe, [0, 0.15, 0.015], [0.12, 0.125, 0.076], "broad_robed_torso");
  oval(b, ivory, [0, 0.075, -0.068], [0.105, 0.035, 0.026], "crossed_sash");
  part(
    b,
    pgGeometry("sage_belt", () => new THREE.TorusGeometry(0.113, 0.011, 6, 40)),
    gold,
    [0, 0.056, 0],
    [1, 0.72, 1],
    [Math.PI / 2, 0, 0],
    "bronze_cloud_belt",
  );
  oval(b, jade, [0, 0.045, -0.094], [0.023, 0.04, 0.013], "jade_seal_pendant");
  taper(
    b,
    skin,
    [
      [0, 0.225, 0],
      [0, 0.28, 0],
    ],
    [0.037, 0.034],
    "visible_neck",
  );
  // 颅骨、颧骨、眼窝、鼻梁与下颌分别定形，双眼朝前而非贴在耳侧。
  const skull = pgGeometry("sage_sculpted_skull_v3", () => {
    const g = new THREE.SphereGeometry(1, 32, 24),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        jaw = 0.76 + 0.24 * THREE.MathUtils.smoothstep(y, -0.7, -0.18),
        face = Math.max(0, -z),
        lowerFace = 1 - THREE.MathUtils.smoothstep(y, -0.05, 0.35),
        faceX = x * 0.049 * jaw,
        faceY = y * 0.076 + 0.323,
        orbit = [-1, 1].reduce(
          (sum, side) =>
            sum +
            Math.exp(
              -(
                ((faceX - side * 0.024) / 0.014) ** 2 +
                ((faceY - 0.333) / 0.009) ** 2
              ),
            ),
          0,
        );
      p.setXYZ(
        i,
        faceX,
        y * 0.076,
        z * 0.045 - 0.005 * (1 - y) * face * lowerFace + 0.0035 * orbit * face,
      );
    }
    // 连续形变后焊合球面的经线与极点，避免浮点正负号把闭合头部撕开。
    g.deleteAttribute("uv");
    g.deleteAttribute("normal");
    const closed = mergeVertices(g, 1e-7);
    g.dispose();
    closed.computeVertexNormals();
    return closed;
  });
  part(
    b,
    skull,
    skin,
    [0, 0.323, -0.009],
    [1, 1, 1],
    [],
    "sculpted_human_head",
  );
  // 在同一张闭合脸面上采样眼窝和眉弓，薄眼睑随曲面法线嵌合，不悬在脸外。
  const faceProbe = new THREE.Mesh(skull, skin),
    faceRay = new THREE.Raycaster(),
    faceDirection = new THREE.Vector3(0, 0, 1);
  const faceAt = (x, y) => {
    faceRay.set(new THREE.Vector3(x, y - 0.323, -0.2), faceDirection);
    const hit = faceRay.intersectObject(faceProbe, false)[0];
    if (!hit) throw new Error("Sage facial attachment misses the skull");
    return {
      point: hit.point.clone().add(new THREE.Vector3(0, 0.323, -0.009)),
      normal: hit.normal.clone().normalize(),
    };
  };
  for (const side of [-1, 1]) {
    const orbit = faceAt(side * 0.024, 0.333),
      eyeFrame = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        orbit.normal,
      );
    const socket = oval(
      b,
      shadow,
      orbit.point.clone().addScaledVector(orbit.normal, -0.0006).toArray(),
      [0.013, 0.006, 0.002],
      "deep_eye_socket",
    );
    socket.quaternion.copy(eyeFrame);
    const eye = oval(
      b,
      ivory,
      orbit.point.clone().addScaledVector(orbit.normal, 0.0008).toArray(),
      [0.009, 0.0026, 0.0015],
      "narrow_forward_eye",
    );
    eye.quaternion.copy(eyeFrame);
    const iris = oval(
      b,
      dark,
      orbit.point.clone().addScaledVector(orbit.normal, 0.0021).toArray(),
      [0.0018, 0.002, 0.00065],
      "focused_human_iris",
    );
    iris.quaternion.copy(eyeFrame);
    taper(
      b,
      hair,
      [
        [side * 0.009, 0.342],
        [side * 0.026, 0.349],
        [side * 0.043, 0.348],
      ].map(([x, y]) => [x, y, faceAt(x, y).point.z - 0.001]),
      [0.0025, 0.003, 0.001],
      "stern_sloping_brow",
    );

    oval(
      b,
      skin,
      [side * 0.052, 0.321, 0.004],
      [0.008, 0.018, 0.008],
      "human_ear",
    );
    taper(
      b,
      hair,
      [
        [side * 0.042, 0.353, -0.003],
        [side * 0.053, 0.286, 0.018],
        [side * 0.036, 0.222, 0.058],
      ],
      [0.012, 0.015, 0.0015],
      "flowing_silver_temples",
    );
  }
  taper(
    b,
    skin,
    [
      [0, 0.343, -0.051],
      [0, 0.315, -0.069],
      [0, 0.305, -0.064],
    ],
    [0.006, 0.008, 0.004],
    "sculpted_nose_bridge",
  );
  oval(
    b,
    shadow,
    [0, 0.29, -0.057],
    [0.023, 0.003, 0.004],
    "firm_closed_mouth",
  );
  for (let j = -4; j <= 4; j++) {
    const x = j * 0.006;
    taper(
      b,
      hair,
      [
        [x, 0.285, -0.052],
        [x * 1.15, 0.249, -0.07],
        [x * 0.7 + 0.014, 0.185, -0.063],
        [x * 0.45 + 0.022, 0.157, -0.027],
      ],
      [0.0045, 0.004, 0.0025, 0.0004],
      "flowing_beard_lock",
    );
  }
  for (const side of [-1, 1])
    taper(
      b,
      hair,
      [
        [0, 0.304, -0.069],
        [side * 0.024, 0.295, -0.071],
        [side * 0.032, 0.26, -0.061],
      ],
      [0.004, 0.005, 0.0008],
      "downturned_moustache",
    );
  oval(b, dark, [0, 0.377, 0.012], [0.053, 0.029, 0.045], "swept_back_hair");
  oval(b, hair, [0, 0.392, 0.021], [0.035, 0.032, 0.031], "bound_topknot");
  const crown = fin(
    b,
    gold,
    [
      [-0.041, 0.377],
      [-0.033, 0.424],
      [-0.024, 0.418],
      [-0.015, 0.454],
      [0, 0.433],
      [0.015, 0.454],
      [0.024, 0.418],
      [0.033, 0.424],
      [0.041, 0.377],
    ],
    0.018,
    "taoist_mountain_crown",
  );
  crown.position.z = -0.012;
  oval(b, jade, [0, 0.415, -0.023], [0.012, 0.022, 0.007], "crown_jade_inlay");
  // 双脚踩在同一柄宽刃巨剑上；+Y 剑尖旋转到模型前方 -Z，剑面承接鞋底。
  const mount = sword(b, [0, -0.45, 0.0]);
  mount.name = "sage_riding_greatsword";
  mount.rotation.x = -Math.PI / 2;
  mount.scale.set(4.4, 2.05, 2.2);
  root.userData.ridingSword = mount;
  for (let j = -1; j <= 1; j++)
    taper(
      b,
      gold,
      [
        [j * 0.022, 0.39, -0.024],
        [j * 0.018, 0.42, -0.025],
      ],
      [0.002, 0.001],
      "crown_engraving",
    );
  const ring = new THREE.Group();
  ring.name = "orbiting_sword_array";
  b.add(ring);
  for (let j = 0; j < 7; j++) {
    const a = (j / 7) * Math.PI * 2,
      s = sword(
        ring,
        [Math.cos(a) * 0.4, 0.04 + Math.sin(a) * 0.08, Math.sin(a) * 0.4],
        0.65,
      );
    s.rotation.z = -Math.cos(a) * 0.55;
  }
  motions.push((t) => {
    ring.rotation.y = t * 0.12;
    mantle.rotation.x = Math.sin(t * 0.4) * 0.015;
  });
  const shield = new THREE.Group();
  shield.name = "four_symbol_ward";
  const wardmat = mat("#a8b999", 4, 0.025),
    torus = pgGeometry(
      "sage_ward_ring_v2",
      () => new THREE.TorusGeometry(0.54, 0.004, 6, 96),
    );
  for (let i = 0; i < 2; i++)
    part(
      shield,
      torus,
      wardmat,
      [0, 0, 0],
      [1, 1, 1],
      [Math.PI / 2, (i * Math.PI) / 2, 0.3],
      "four_symbol_halo",
    );
  b.add(shield);
  root.userData.setLocked = (locked) =>
    shield.traverse((n) => (n.visible = locked));
  root.userData.headAnchor = new THREE.Vector3(0, 0.33, -0.078);
}
