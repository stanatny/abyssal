import * as T from "three";

/** 八种可辨认的厚浮雕，与壁画和旋转盘复用同一几何，不用字体符号代替图案。 */
export function createMuralGlyphs(material, keep) {
  const groups = Array.from({ length: 8 }, () => new T.Group());
  function shape(i, points) {
    const s = new T.Shape();
    points.forEach(([x, y], n) => (n ? s.lineTo(x, y) : s.moveTo(x, y)));
    s.closePath();
    const g = keep(
      new T.ExtrudeGeometry(s, {
        depth: 0.1,
        bevelEnabled: true,
        bevelThickness: 0.035,
        bevelSize: 0.035,
        bevelSegments: 2,
        steps: 1,
      }),
    );
    groups[i].add(new T.Mesh(g, material));
  }
  function ellipse(i, x, y, rx, ry) {
    shape(
      i,
      Array.from({ length: 32 }, (_, n) => [
        x + Math.cos((n * Math.PI) / 16) * rx,
        y + Math.sin((n * Math.PI) / 16) * ry,
      ]),
    );
  }
  function line(i, points, r = 0.055) {
    const curve = new T.CatmullRomCurve3(
      points.map(([x, y]) => new T.Vector3(x, y, 0.13)),
    );
    groups[i].add(
      new T.Mesh(keep(new T.TubeGeometry(curve, 32, r, 8, false)), material),
    );
  }
  shape(0, [
    [-0.95, 0.1],
    [-0.66, 0.23],
    [-0.5, 0.42],
    [-0.2, 0.58],
    [0.12, 0.61],
    [0.44, 0.47],
    [0.65, 0.25],
    [0.95, 0.1],
    [0.75, 0.04],
    [0.56, 0.1],
    [0.32, 0.02],
    [0.12, -0.18],
    [0.05, -0.48],
    [-0.12, -0.27],
    [-0.45, -0.18],
    [-0.65, -0.35],
    [-0.9, -0.38],
    [-0.72, -0.1],
  ]);
  ellipse(0, 0.65, 0.19, 0.09, 0.09);
  ellipse(1, -0.08, 0, 0.7, 0.55);
  shape(1, [
    [0.25, 0.22],
    [0.96, 0.05],
    [0.37, -0.55],
    [0.05, -0.35],
  ]);
  line(
    1,
    Array.from({ length: 60 }, (_, n) => {
      const a = n * 0.18,
        r = 0.025 + n * 0.008;
      return [Math.cos(a) * r - 0.08, Math.sin(a) * r];
    }),
    0.045,
  );
  shape(
    2,
    Array.from({ length: 10 }, (_, n) => {
      const a = (n * Math.PI) / 5 + Math.PI / 2,
        r = n % 2 ? 0.38 : 0.95;
      return [Math.cos(a) * r, Math.sin(a) * r];
    }),
  );
  ellipse(3, 0, 0, 0.48, 0.65);
  ellipse(3, 0, 0.85, 0.18, 0.23);
  for (const x of [-1, 1])
    for (const y of [-1, 1])
      shape(3, [
        [x * 0.3, y * 0.3],
        [x * 0.86, y * 0.7],
        [x * 0.67, y * 0.16],
      ]);
  line(3, [
    [-0.3, -0.2],
    [0, 0.25],
    [0.3, -0.2],
  ]);
  line(3, [
    [0, -0.48],
    [0, 0.25],
    [0, 0.55],
  ]);
  line(
    4,
    [
      [0, -1],
      [0, 0.95],
    ],
    0.075,
  );
  line(
    4,
    [
      [-0.65, 0.7],
      [-0.6, 0.15],
      [0, -0.1],
      [0.6, 0.15],
      [0.65, 0.7],
    ],
    0.075,
  );
  for (const x of [-0.65, 0, 0.65])
    shape(4, [
      [x - 0.18, 0.6],
      [x, 0.99],
      [x + 0.18, 0.6],
    ]);
  shape(5, [
    [-0.3, 0.9],
    [0.3, 0.9],
    [0.24, 0.48],
    [0.59, 0.1],
    [0.51, -0.52],
    [0.24, -0.82],
    [0.3, -0.94],
    [-0.3, -0.94],
    [-0.24, -0.82],
    [-0.51, -0.52],
    [-0.59, 0.1],
    [-0.24, 0.48],
  ]);
  for (const x of [-1, 1])
    line(
      5,
      [
        [x * 0.26, 0.5],
        [x * 0.8, 0.45],
        [x * 0.75, -0.1],
        [x * 0.5, -0.3],
      ],
      0.065,
    );
  line(
    6,
    [
      [0, 0.6],
      [0, -0.75],
    ],
    0.075,
  );
  line(
    6,
    [
      [-0.85, -0.1],
      [-0.65, -0.55],
      [0, -0.82],
      [0.65, -0.55],
      [0.85, -0.1],
    ],
    0.09,
  );
  line(
    6,
    [
      [-0.45, 0.38],
      [0.45, 0.38],
    ],
    0.06,
  );
  const ring = keep(new T.TorusGeometry(0.19, 0.06, 8, 32));
  const m = new T.Mesh(ring, material);
  m.position.y = 0.8;
  groups[6].add(m);
  shape(6, [
    [-0.98, -0.25],
    [-0.84, 0.02],
    [-0.59, -0.17],
  ]);
  shape(6, [
    [0.98, -0.25],
    [0.84, 0.02],
    [0.59, -0.17],
  ]);
  const fan = [
    [-0.22, -0.65],
    [-0.88, -0.1],
    [-0.97, 0.35],
    [-0.75, 0.73],
    [-0.4, 0.9],
    [0, 0.94],
    [0.4, 0.9],
    [0.75, 0.73],
    [0.97, 0.35],
    [0.88, -0.1],
    [0.22, -0.65],
  ];
  shape(7, fan);
  for (let n = -3; n <= 3; n++)
    line(
      7,
      [
        [0, -0.6],
        [n * 0.15, 0.05],
        [Math.sin(n * 0.38) * 0.84, Math.cos(n * 0.38) * 0.84],
      ],
      0.03,
    );
  return groups;
}
