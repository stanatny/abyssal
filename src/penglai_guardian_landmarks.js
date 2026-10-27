import { createPenglaiLandmarkAsset } from "./penglai_landmark_asset.js";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PENGLAI_LANDMARK_SITES } from "./penglai_landmark_sites.js";
import { addSurfaceDetail } from "./ocean_visuals.js";

/** 一次构造、按材质合批；地基采样实际三角面，不叠加漂浮贴片。 */
export function createPenglaiGuardianLandmarks(
  parent,
  keep,
  colliders,
  heightAt,
) {
  const palette = {
    stone: "#aeb5a4",
    dark: "#4d605b",
    jade: "#618e85",
    bronze: "#b39a62",
    red: "#955044",
    ivory: "#d2ccba",
  };
  const materials = Object.fromEntries(
    Object.entries(palette).map(([key, color]) => {
      const m = keep(
        new THREE.MeshStandardMaterial({
          color,
          roughness: key === "bronze" ? 0.58 : 0.91,
          metalness: key === "bronze" ? 0.38 : 0,
          vertexColors: true,
        }),
      );
      addSurfaceDetail(m, "stone", 0.1);
      return [key, m];
    }),
  );
  const assets = new Map();
  const roots = [],
    landmarks = [];
  for (const [index, site] of PENGLAI_LANDMARK_SITES.entries()) {
    const root = new THREE.Group();
    root.name = site.id;
    root.position.set(site.x, 0, site.z);
    root.rotation.y = site.yaw;
    parent.add(root);
    roots.push(root);
    const buckets = new Map(),
      transform = new THREE.Object3D(),
      rotation = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        site.yaw,
      );
    const world = (p) =>
      new THREE.Vector3(...p).applyQuaternion(rotation).add(root.position);
    const floor = (x, z) => {
      const p = world([x, 0, z]);
      return heightAt(p.x, p.z);
    };
    function part(g, key, p = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0]) {
      transform.position.set(...p);
      transform.scale.set(...scale);
      transform.rotation.set(...rot);
      transform.updateMatrix();
      const mesh = g.index ? g.toNonIndexed() : g.clone();
      g.dispose();
      mesh.applyMatrix4(transform.matrix);
      if (!mesh.attributes.uv)
        mesh.setAttribute(
          "uv",
          new THREE.Float32BufferAttribute(
            new Float32Array(mesh.attributes.position.count * 2),
            2,
          ),
        );
      const a = mesh.attributes.position,
        colors = [];
      for (let i = 0; i < a.count; i++) {
        const tone =
          0.94 +
          0.04 *
            Math.sin(a.getX(i) * 2.1 + a.getZ(i) * 1.7) *
            Math.sin(a.getY(i) * 1.3);
        colors.push(tone, tone, tone);
      }
      mesh.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(mesh);
    }
    const box = (key, p, size, r = 0.3) =>
      part(new RoundedBoxGeometry(...size, 1, r), key, p);
    const ball = (key, p, scale) =>
      part(new THREE.SphereGeometry(1, 16, 10), key, p, scale);
    function tube(key, points, r = 0.5, segments = 24) {
      part(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(
            points.map((p) => new THREE.Vector3(...p)),
          ),
          segments,
          r,
          6,
          false,
        ),
        key,
      );
    }
    function solid(kind, p, size, type = "box") {
      const q = world(p);
      colliders.push({
        type,
        kind: "guardian_landmark_" + kind,
        x: q.x,
        y: q.y,
        z: q.z,
        rotation,
        ...(type === "box"
          ? { halfSize: { x: size[0] / 2, y: size[1] / 2, z: size[2] / 2 } }
          : { axes: { x: size[0], y: size[1], z: size[2] } }),
      });
    }
    function sculpture(kind, p, dimensions, reverse = false) {
      if (!assets.has(kind))
        assets.set(kind, createPenglaiLandmarkAsset(kind, keep));
      const asset = assets.get(kind),
        mesh = new THREE.Mesh(asset.geometry, asset.material);
      mesh.name = site.id + "_hf_" + kind;
      mesh.position.set(...p);
      const scale = dimensions.map(
        (v, a) => v / (asset.packed.max[a] - asset.packed.min[a]),
      );
      mesh.scale.set(...scale);
      if (reverse) mesh.rotation.y = Math.PI;
      mesh.userData.prepareMaterials = asset.prepare;
      mesh.userData.hfLandmarkKind = kind;
      root.add(mesh);
      for (const cell of asset.packed.contacts) {
        const center = cell.min.map(
          (v, a) =>
            (v + cell.max[a]) * 0.5 * scale[a] * (reverse && a !== 1 ? -1 : 1) +
            p[a],
        );
        const size = cell.min.map((v, a) =>
          Math.max(0.15, (cell.max[a] - v) * scale[a]),
        );
        solid(kind, center, size);
      }
    }
    function diskSolid(kind, x, y, z, r, h) {
      for (let i = 0; i < 16; i++) {
        const a = -r + (i * r) / 8,
          b = a + r / 8,
          mid = (a + b) / 2,
          width = 2 * Math.sqrt(Math.max(0, r * r - mid * mid));
        solid(kind, [x, y, z + mid], [width, h, r / 8 + 0.05]);
      }
    }
    function foundation(x, z, w, d, round = false) {
      const boundary = [],
        ys = [];
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 12; j++) {
          const t = j / 12;
          const px =
              x +
              (i === 0
                ? -w / 2 + w * t
                : i === 1
                  ? w / 2
                  : i === 2
                    ? w / 2 - w * t
                    : -w / 2),
            pz =
              z +
              (i === 0
                ? -d / 2
                : i === 1
                  ? -d / 2 + d * t
                  : i === 2
                    ? d / 2
                    : d / 2 - d * t);
          if (!round) {
            boundary.push([px, pz]);
            ys.push(floor(px, pz));
          }
        }
      if (round)
        for (let i = 0; i < 48; i++) {
          const a = (i / 48) * Math.PI * 2,
            p = [x + (Math.cos(a) * w) / 2, z + (Math.sin(a) * d) / 2];
          boundary.push(p);
          ys.push(floor(...p));
        }
      for (let xx = -w / 2; xx <= w / 2; xx += 3)
        for (let zz = -d / 2; zz <= d / 2; zz += 3)
          if (!round || (xx / (w / 2)) ** 2 + (zz / (d / 2)) ** 2 <= 1)
            ys.push(floor(x + xx, z + zz));
      const top = Math.max(...ys) + 1.4,
        low = Math.min(...ys) - 2,
        positions = [],
        indices = [];
      for (const [px, pz] of boundary) positions.push(px, low, pz, px, top, pz);
      for (let i = 0; i < boundary.length; i++) {
        const a = i * 2,
          b = ((i + 1) % boundary.length) * 2;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
      const k = positions.length / 3;
      positions.push(x, top, z, x, low, z);
      for (let i = 0; i < boundary.length; i++) {
        const a = i * 2,
          b = ((i + 1) % boundary.length) * 2;
        indices.push(k, b + 1, a + 1, k + 1, a, b);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      g.setIndex(indices);
      g.computeVertexNormals();
      part(g, "stone");
      if (round) {
        diskSolid("foundation", x, (top + low) / 2, z, w / 2, top - low);
        part(new THREE.CylinderGeometry(w / 2, w / 2, 1, 48), "ivory", [
          x,
          top + 0.5,
          z,
        ]);
        diskSolid("foundation_cap", x, top + 0.5, z, w / 2, 1);
      } else {
        solid("foundation", [x, (top + low) / 2, z], [w, top - low, d]);
        box("ivory", [x, top + 0.5, z], [w + 0.6, 1, d + 0.6]);
        solid("foundation_cap", [x, top + 0.5, z], [w + 0.6, 1, d + 0.6]);
      }
      root.userData.foundations ??= [];
      root.userData.foundations.push({ x, z, w, d, top, low, round });
      return top + 1;
    }
    function roof(x, y, z, w, d, h, key = "jade") {
      // 有厚度的曲面瓦檐，檐脊与底面封口；代理只占逐格实际檐体。
      const positions = [],
        indices = [],
        n = 16,
        m = 8,
        at = (u, v) =>
          h * (1 - Math.abs(u) ** 0.8) +
          h * 0.36 * Math.abs(u) ** 5 +
          h * 0.18 * Math.abs(v) ** 5;
      for (let side = 0; side < 2; side++)
        for (let j = 0; j <= m; j++)
          for (let i = 0; i <= n; i++) {
            const u = (i / n) * 2 - 1,
              v = (j / m) * 2 - 1;
            positions.push(
              x + (u * w) / 2,
              y + at(u, v) - (side ? 1.1 : 0),
              z + (v * d) / 2,
            );
          }
      const layer = (n + 1) * (m + 1);
      for (let j = 0; j < m; j++)
        for (let i = 0; i < n; i++) {
          const a = j * (n + 1) + i,
            b = a + n + 1;
          indices.push(
            a,
            b,
            a + 1,
            a + 1,
            b,
            b + 1,
            a + layer,
            a + 1 + layer,
            b + layer,
            a + 1 + layer,
            b + 1 + layer,
            b + layer,
          );
        }
      const edge = [];
      for (let i = 0; i <= n; i++) edge.push(i);
      for (let j = 1; j <= m; j++) edge.push(j * (n + 1) + n);
      for (let i = n - 1; i >= 0; i--) edge.push(m * (n + 1) + i);
      for (let j = m - 1; j > 0; j--) edge.push(j * (n + 1));
      for (let i = 0; i < edge.length; i++) {
        const a = edge[i],
          b = edge[(i + 1) % edge.length];
        indices.push(a, b, a + layer, b, b + layer, a + layer);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      g.setIndex(indices);
      g.computeVertexNormals();
      part(g, key);
      for (let i = 0; i < 8; i++) {
        const u = ((i + 0.5) / 8) * 2 - 1,
          ys = [at((i / 8) * 2 - 1, 0), at(((i + 1) / 8) * 2 - 1, 1)];
        solid(
          "eaves",
          [
            x + (u * w) / 2,
            y + (Math.max(...ys) + Math.min(...ys)) / 2 - 0.55,
            z,
          ],
          [w / 8, Math.max(...ys) - Math.min(...ys) + 1.2, d],
        );
      }
      for (const side of [-1, 1]) {
        const pts = [];
        for (let i = 0; i <= 20; i++) {
          const u = i / 10 - 1;
          pts.push([
            x + (u * w) / 2,
            y + at(u, side) + 0.4,
            z + (side * d) / 2,
          ]);
        }
        tube("bronze", pts, 0.45, 24);
      }
      for (let i = -7; i <= 7; i++) {
        const u = i / 8;
        box(key, [x + (u * w) / 2, y + at(u, 0) + 0.42, z], [0.45, 0.4, d]);
      }
    }
    if (index === 0) {
      const pads = [foundation(-43, 0, 22, 26), foundation(43, 0, 22, 26)],
        lintel = Math.max(...pads) + 76;
      for (const [side, k] of [
        [-1, 0],
        [1, 1],
      ]) {
        const x = side * 43,
          y = pads[k];
        const carvingHeight = 72,
          carvingBottom = lintel - 1 - carvingHeight;
        const supportHeight = carvingBottom - y;
        box("dark", [x, y + supportHeight / 2, 0], [16, supportHeight, 18]);
        solid(
          "column_support",
          [x, y + supportHeight / 2, 0],
          [16, supportHeight, 18],
        );
        sculpture(
          "dragon_column",
          [x, carvingBottom + carvingHeight / 2, 0],
          [17.5, carvingHeight, 17.5],
          true,
        );
        roof(x, lintel + 7, 0, 25, 29, 5);
        solid("capital", [x, lintel + 3, 0], [19, 8, 22]);
        box("stone", [x, lintel + 3, 0], [19, 8, 22]);
      }
      box("jade", [0, lintel, 0], [86, 7, 13]);
      solid("lintel", [0, lintel, 0], [86, 7, 13]);
      roof(0, lintel + 7, 0, 66, 25, 10);
      ball("bronze", [0, lintel + 22, 0], [4, 4, 4]);
      solid("pearl", [0, lintel + 22, 0], [4, 4, 4], "ellipsoid");
      for (const s of [-1, 1])
        tube(
          "stone",
          [
            [s * 31, lintel + 3, -7.3],
            [s * 22, lintel + 8, -7.3],
            [s * 15, lintel + 8, -7.3],
            [s * 12, lintel + 5, -7.3],
            [s * 16, lintel + 3, -7.3],
            [s * 21, lintel + 4, -7.3],
          ],
          0.8,
          24,
        );
      root.userData.focus = [0, lintel - 27, 0];
    } else if (index === 1) {
      for (const side of [-1, 1]) {
        const x = side * 35,
          y = foundation(x, 0, 22, 24);
        sculpture("tiger_que", [x, y + 33, 0], [28, 66, 26]);
      }
      root.userData.focus = [0, Math.max(floor(-35, 0), floor(35, 0)) + 29, 0];
    } else {
      const base = foundation(0, 0, 64, 64, true),
        y = base;
      for (let i = 0; i < 3; i++) {
        part(
          new THREE.CylinderGeometry(29 - i * 3, 30 - i * 3, 2, 48),
          "stone",
          [0, y + 1 + i * 2, 0],
        );
        diskSolid("altar_tier", 0, y + 1 + i * 2, 0, 29.5 - i * 3, 2);
      }
      sculpture("vermilion_statue", [0, y + 29, 0], [72, 46, 31.7]);
      for (let i = 0; i < 8; i++) {
        const z = -31 - i * 3,
          heights = [];
        for (const x of [-8, 0, 8])
          for (const zz of [-2.25, 0, 2.25]) heights.push(floor(x, z + zz));
        const top =
            Math.max(...heights) + 0.8 > y + 1 - i * 2.3
              ? Math.max(...heights) + 0.8
              : y + 1 - i * 2.3,
          low = Math.min(...heights) - 1;
        box("stone", [0, (top + low) / 2, z], [16, top - low, 4.5]);
        solid("altar_steps", [0, (top + low) / 2, z], [16, top - low, 4.5]);
      }
      part(new THREE.TorusGeometry(19, 0.85, 8, 64), "bronze", [0, y + 37, 16]);
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2,
          b = ((i + 1) / 32) * Math.PI * 2;
        colliders.push({
          type: "capsule",
          kind: "guardian_landmark_sun_ring",
          a: world([Math.cos(a) * 19, y + 37 + Math.sin(a) * 19, 16]),
          b: world([Math.cos(b) * 19, y + 37 + Math.sin(b) * 19, 16]),
          radius: 0.85,
        });
      }
      root.userData.focus = [0, y + 30, 0];
    }
    for (const [key, parts] of buckets) {
      const g = keep(mergeGeometries(parts, false));
      parts.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(g, materials[key]);
      mesh.name = site.id + "_" + key;
      root.add(mesh);
    }
    const focus = world(root.userData.focus);
    landmarks.push({ name: site.name, position: focus });
    root.userData.site = site;
  }
  return { roots, landmarks };
}
