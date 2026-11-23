import * as T from "three";

// 真皮三角形裁入真实四面体；只统计有面积且质心在内部的交叉，不把AABB相交当穿皮。
export function mouthSectionIntrusions(geometry, sheet, scale = 280) {
  const p = geometry.attributes.position,
    index = geometry.index,
    vertices = Array.from({ length: p.count }, (_, i) =>
      new T.Vector3().fromBufferAttribute(p, i).multiplyScalar(scale),
    ),
    tetFaces = [
      [0, 1, 2, 3],
      [0, 1, 3, 2],
      [0, 2, 3, 1],
      [1, 2, 3, 0],
    ],
    cells = sheet.cells.filter((c) => c.gridRow < 2),
    hits = [];
  let candidatePairs = 0;
  for (let j = 0; j < index.count; j += 3) {
    const triangle = [0, 1, 2].map((k) => vertices[index.getX(j + k)]),
      bounds = new T.Box3().setFromPoints(triangle);
    for (const cell of cells) {
      if (
        !bounds.intersectsBox(
          new T.Box3(
            new T.Vector3().copy(cell.bounds.min),
            new T.Vector3().copy(cell.bounds.max),
          ),
        )
      )
        continue;
      candidatePairs++;
      for (const ids of cell.tetrahedra) {
        const tetra = ids.map((i) => new T.Vector3().copy(cell.vertices[i]));
        if (!bounds.intersectsBox(new T.Box3().setFromPoints(tetra))) continue;
        let polygon = triangle.map((p) => p.clone());
        const planes = [];
        for (const [a, b, c, opposite] of tetFaces) {
          const origin = tetra[a],
            normal = tetra[b]
              .clone()
              .sub(origin)
              .cross(tetra[c].clone().sub(origin))
              .normalize();
          if (normal.dot(tetra[opposite].clone().sub(origin)) > 0)
            normal.negate();
          planes.push({ origin, normal });
          const next = [];
          for (let i = 0; i < polygon.length; i++) {
            const u = polygon[i],
              v = polygon[(i + 1) % polygon.length],
              du = normal.dot(u.clone().sub(origin)),
              dv = normal.dot(v.clone().sub(origin));
            if (du <= 1e-8) next.push(u);
            if (du <= 1e-8 !== dv <= 1e-8)
              next.push(u.clone().lerp(v, du / (du - dv)));
          }
          polygon = next;
          if (polygon.length < 3) break;
        }
        if (polygon.length < 3) continue;
        let area = 0;
        for (let i = 1; i < polygon.length - 1; i++)
          area += new T.Triangle(
            polygon[0],
            polygon[i],
            polygon[i + 1],
          ).getArea();
        if (area < 1e-8) continue;
        const center = polygon
            .reduce((p, v) => p.add(v), new T.Vector3())
            .multiplyScalar(1 / polygon.length),
          margin = Math.min(
            ...planes.map(
              ({ normal, origin }) => -normal.dot(center.clone().sub(origin)),
            ),
          );
        if (margin > 1e-7)
          hits.push({
            face: j / 3,
            row: cell.gridRow,
            column: cell.column,
            area,
            margin,
          });
      }
    }
  }
  return { hits, candidatePairs };
}
