import { europaWorldPoint } from "./europa_config.js";
import * as THREE from "three";
import { acquireAtlantisQuestAsset } from "./atlantis_quest_asset.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { addSurfaceDetail } from "./ocean_visuals.js";
import { amazonChannels } from "./amazon_config.js";
import { ATLANTIS_EXCAVATION_SITES } from "./atlantis_terrain.js";
import {
  DEEP_HAZARD_RULES,
  DEEP_HAZARD_PROFILES,
  createDeepHazardState,
  stepDeepHazard,
  deepHazardContact,
  deepHazardTerrainBlocked,
} from "./deep_hazard_rules.js";

/** 合批统一为无索引位置/法线，石皮与标准几何不保留多余UV。 */
function combine(parts) {
  const normalized = parts.map((g) => {
    const n = g.index ? g.toNonIndexed() : g.clone();
    for (const key of Object.keys(n.attributes))
      if (!["position", "normal"].includes(key)) n.deleteAttribute(key);
    if (!n.attributes.normal) n.computeVertexNormals();
    return n;
  });
  const result = mergeGeometries(normalized);
  for (const n of normalized) n.dispose();
  return result;
}

/** 只缓存足迹附近的最终三角面，避免为每个装饰顶点重投整张岩台。 */
function localShelfSampler(mesh, x, z, extent = 22) {
  const p = mesh.geometry.attributes.position,
    index = mesh.geometry.index,
    triangles = [];
  const vertices = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
  ];
  for (let i = 0; i < (index?.count || p.count); i += 3) {
    for (let k = 0; k < 3; k++)
      vertices[k]
        .fromBufferAttribute(p, index ? index.getX(i + k) : i + k)
        .applyMatrix4(mesh.matrixWorld);
    const [a, b, c] = vertices,
      minX = Math.min(a.x, b.x, c.x),
      maxX = Math.max(a.x, b.x, c.x),
      minZ = Math.min(a.z, b.z, c.z),
      maxZ = Math.max(a.z, b.z, c.z);
    if (
      maxX < x - extent ||
      minX > x + extent ||
      maxZ < z - extent ||
      minZ > z + extent
    )
      continue;
    const denominator = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
    if (Math.abs(denominator) < 1e-8) continue;
    triangles.push({
      a: a.clone(),
      b: b.clone(),
      c: c.clone(),
      denominator,
      minX,
      maxX,
      minZ,
      maxZ,
    });
  }
  return (px, pz) => {
    let top = -Infinity;
    for (const { a, b, c, denominator, minX, maxX, minZ, maxZ } of triangles) {
      if (px < minX || px > maxX || pz < minZ || pz > maxZ) continue;
      const u =
          ((b.z - c.z) * (px - c.x) + (c.x - b.x) * (pz - c.z)) / denominator,
        v = ((c.z - a.z) * (px - c.x) + (a.x - c.x) * (pz - c.z)) / denominator;
      if (u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6)
        top = Math.max(top, u * a.y + v * b.y + (1 - u - v) * c.y);
    }
    return Number.isFinite(top) ? top : null;
  };
}

/** 数据只定义侧路地点；天然底座仍须采样当前海域的最终表面。 */
export function deepHazardAnchors(ocean, regionId) {
  if (regionId === "atlantis") {
    const galleries = ocean.city?.underways.records || [];
    return galleries
      .filter((r) => r.id !== "harbor_sanctuary")
      .map((r) => ({
        id: r.id,
        x: r.x,
        z: r.z + (r.variant === "bridges" ? 46 : -25),
        y: r.y,
        yaw: 0,
        floor: () => r.y,
      }))
      .concat(
        ATLANTIS_EXCAVATION_SITES.filter(
          (r) => r.id !== "poseidon_temple_vault",
        ).map((r) => ({
          id: r.id,
          x: r.id === "harbor_sunken_halls" ? -218 : 215,
          z: r.id === "harbor_sunken_halls" ? -254 : -447.5,
          y: r.floorY,
          yaw: 0,
          floor: () => r.floorY,
        })),
      );
  }
  if (regionId === "amazon")
    return [-740, -1030].map((z, i) => ({
      id: `deep_pool_${i}`,
      x: amazonChannels(z)[i].center,
      z,
      yaw: 0,
    }));
  const sites =
    {
      hawaii: [
        [-120, -740, 0.45],
        [110, -1020, -0.5],
      ],
      bermuda: [
        [-225, -770, 0.3],
        [45, -1065, -0.4],
      ],
      europa: [
        [-160, -820, 0.5],
        [150, -890, -0.4],
      ],
      odyssey: [
        // 新古桨船占用原侧路锚点；机关移到船尾外侧，保留完整预警足迹。
        [-250, -650, 0],
        [-125, -1030, 0],
      ],
      penglai: [
        [-470, -800, 0],
        [500, -350, 0],
      ],
      mariana: [
        [-125, -995, -540],
        [125, -2145, -525],
      ],
    }[regionId] || [];
  if (regionId !== "mariana")
    return sites.map(([x, z, yaw], i) => {
      const p = regionId === "europa" ? europaWorldPoint([x, 0, z]) : [x, 0, z];
      return { id: `side_site_${i}`, x: p[0], z: p[2], yaw };
    });
  ocean.root.updateMatrixWorld(true);
  const meshes = [];
  ocean.root.traverse((n) => {
    if (n.isMesh && n.name.startsWith("trench_layer_")) meshes.push(n);
  });
  return sites.flatMap(([x, y, z], i) => {
    const sample = (px, pz) => {
      const ray = new THREE.Raycaster(
        new THREE.Vector3(px, y + 100, pz),
        new THREE.Vector3(0, -1, 0),
        0,
        240,
      );
      return ray.intersectObjects(meshes, false)[0];
    };
    const hit = sample(x, z);
    if (!hit) return [];
    const fittedFloor = localShelfSampler(hit.object, x, z);
    for (let n = 0; n < 16; n++)
      if (
        fittedFloor(
          x + Math.cos((n * Math.PI) / 8) * 18,
          z + Math.sin((n * Math.PI) / 8) * 18,
        ) === null
      )
        return [];
    return [
      {
        id: `side_site_${i}`,
        x,
        y: hit.point.y,
        z,
        yaw: 0,
        host: hit.object.name,
        floor: (px, pz) => fittedFloor(px, pz) ?? hit.point.y,
      },
    ];
  });
}

/** 一张海域持有一个有界的机关池，不另起时钟、灯光或输入路径。 */
export function attachDeepHazards(
  ocean,
  regionId,
  { heightAt = ocean.heightAt } = {},
) {
  const profile = DEEP_HAZARD_PROFILES[regionId];
  if (!profile) return ocean;
  const root = new THREE.Group();
  root.name = "deep_regional_hazards";
  ocean.root.add(root);
  const owned = new Set(),
    keep = (r) => (owned.add(r), r);
  try {
    const conch =
      regionId === "atlantis" ? acquireAtlantisQuestAsset("sluice") : null;
    if (conch) {
      owned.add({ dispose: conch.release });
      conch.prepare();
      root.userData.prepareMaterials = conch.prepare;
    }
    const clock = { value: 0 };
    const stone = keep(
      new THREE.MeshStandardMaterial({ color: profile.stone, roughness: 0.93 }),
    );
    addSurfaceDetail(stone, "stone", 0.62);
    const bronze = keep(
      new THREE.MeshStandardMaterial({
        color: profile.style === "ruin" ? 0x99856a : 0x343d3d,
        metalness: profile.style === "ruin" ? 0.52 : 0.08,
        roughness: 0.72,
      }),
    );
    addSurfaceDetail(bronze, "stone", 0.25);
    const sites = deepHazardAnchors(ocean, regionId).flatMap(
      (anchor, index) => {
        const y = anchor.y ?? heightAt?.(anchor.x, anchor.z);
        // 蓬莱外围是浅水仙境，其余新场所避开出生水层。
        if (!Number.isFinite(y) || y > (regionId === "penglai" ? -25 : -70))
          return [];
        const site = {
          ...anchor,
          y,
          index,
          profile,
          state: createDeepHazardState(),
        };
        const floor = anchor.floor || heightAt;
        const group = new THREE.Group();
        group.name = `deep_hazard_${anchor.id}`;
        group.position.set(anchor.x, y, anchor.z);
        group.rotation.y = anchor.yaw || 0;
        root.add(group);
        const mesh = (geometry, material, name) => {
          const m = new THREE.Mesh(keep(geometry), material);
          m.name = name;
          group.add(m);
          return m;
        };
        const stoneParts = [],
          metalParts = [],
          marks = [];
        const c = Math.cos(site.yaw),
          s = Math.sin(site.yaw);
        const ground = (x, z) =>
          (floor?.(site.x + x * c + z * s, site.z - x * s + z * c) ?? site.y) -
          site.y;
        function part(geometry, x, y, z, metal = false, angle = 0) {
          geometry.rotateY(angle);
          geometry.translate(x, y + ground(x, z), z);
          if (profile.style !== "ruin") {
            const p = geometry.attributes.position;
            for (let i = 0; i < p.count; i++)
              p.setY(
                i,
                p.getY(i) + ground(p.getX(i), p.getZ(i)) - ground(x, z),
              );
            geometry.computeVertexNormals();
          }
          (metal ? metalParts : stoneParts).push(geometry);
        }
        // 底座和刻纹逐点贴地；每处最终仅合并两张实体网格与一张预警网格。
        if (profile.style === "ruin") {
          const half = profile.length / 2,
            borderStep = (profile.length - 4) / 10;
          for (let i = 0; i < 11; i++) {
            const x = -half + 2 + i * borderStep;
            for (const side of [-1, 1]) {
              // 石边顶面高于遗迹现有的+0.22m城砖；底部仍埋地，接缝不共面交叠。
              part(
                new THREE.BoxGeometry(borderStep - 0.4, 1.26, 1.4),
                x,
                -0.23,
                side * (profile.width / 2 + 0.8),
                false,
                Math.sin(i * 3) * 0.13,
              );
              const g = new THREE.BoxGeometry(2.2, 0.05, 0.22);
              g.translate(
                x,
                ground(x, (side * profile.width) / 2) + 0.3,
                (side * profile.width) / 2,
              );
              marks.push(g);
            }
            const groove = new THREE.BoxGeometry(0.18, 0.05, profile.width - 1);
            groove.translate(x, ground(x, 0) + 0.22, 0);
            marks.push(groove);
            part(
              new THREE.CylinderGeometry(0.5, 0.9, 0.65, 9),
              x,
              0.15,
              0,
              true,
            );
          }
          for (const side of [-1, 1]) {
            const x = side * (half + 1);
            part(new THREE.CylinderGeometry(3, 3.6, 1.1, 12), x, -0.1, 0);
            const rim = new THREE.TorusGeometry(2.6, 0.22, 6, 24);
            rim.rotateX(-Math.PI / 2);
            part(rim, x, 0.7, 0, true);
            for (let i = 0; i < 9; i++) {
              const a = (i / 9) * Math.PI * 2;
              part(
                new THREE.BoxGeometry(0.2, 0.3, 1.05),
                x + Math.cos(a) * 1.7,
                0.65,
                Math.sin(a) * 1.7,
                true,
                -a,
              );
            }
            if (conch) {
              const shell = conch.create();
              shell.position.set(x, ground(x, 0) + 1.95, 0);
              shell.rotation.y = (-side * Math.PI) / 2;
              group.add(shell);
            }
          }
        } else {
          // 裂隙是贴合坡面的不规则石皮和分叉缝，不把天然海床围成人造石圈。
          const ribbon = (points, width, offset) => {
            const vertices = [],
              indices = [];
            for (let i = 0; i < points.length; i++) {
              const [x, z] = points[i],
                previous = points[Math.max(0, i - 1)],
                next = points[Math.min(points.length - 1, i + 1)];
              const dx = next[0] - previous[0],
                dz = next[1] - previous[1],
                length = Math.hypot(dx, dz) || 1;
              for (const side of [-1, 1]) {
                const px = x - (dz / length) * width * side,
                  pz = z + (dx / length) * width * side;
                vertices.push(px, ground(px, pz) + offset, pz);
              }
              if (i > 0) {
                const k = i * 2;
                indices.push(k - 2, k, k - 1, k - 1, k, k + 1);
              }
            }
            const g = new THREE.BufferGeometry();
            g.setAttribute(
              "position",
              new THREE.Float32BufferAttribute(vertices, 3),
            );
            g.setIndex(indices);
            g.computeVertexNormals();
            return g;
          };
          const lane = profile.pattern === "lane";
          for (let branch = 0; branch < (lane ? 3 : 5); branch++) {
            const points = [];
            for (let i = 0; i < 13; i++) {
              const u = i / 12;
              if (lane)
                points.push([
                  (u - 0.5) * (profile.length - 3),
                  Math.sin(u * 9 + branch * 2) * 1.1 + (branch - 1) * 2.1,
                ]);
              else {
                const a = branch * 2.39996 + Math.sin(u * 7 + branch) * 0.22,
                  r = 1 + u * profile.radius * 0.83;
                points.push([Math.cos(a) * r, Math.sin(a) * r]);
              }
            }
            stoneParts.push(ribbon(points, 1.1, 0.07));
            metalParts.push(ribbon(points, 0.35, 0.11));
            marks.push(ribbon(points, 0.08, 0.15));
          }
          // 外围虚线只表达危险的精确边界，实体碎片沿裂缝分布而非规则围栏。
          if (lane)
            for (const side of [-1, 1])
              for (let i = 0; i < 11; i++) {
                const x = (i / 10 - 0.5) * profile.length,
                  z = (side * profile.width) / 2;
                const mark = new THREE.BoxGeometry(1.5, 0.035, 0.15);
                mark.translate(x, ground(x, z) + 0.17, z);
                marks.push(mark);
              }
          else {
            const g = new THREE.RingGeometry(
              profile.radius - 0.09,
              profile.radius + 0.09,
              64,
            );
            g.rotateX(-Math.PI / 2);
            const p = g.attributes.position;
            for (let i = 0; i < p.count; i++)
              p.setY(i, ground(p.getX(i), p.getZ(i)) + 0.16);
            marks.push(g);
          }
          for (let i = 0; i < 17; i++) {
            const a = i * 2.39996,
              radius = 2 + Math.sqrt(i) * 2.4;
            const x = lane
                ? (i / 16 - 0.5) * (profile.length - 3)
                : Math.cos(a) * radius,
              z = lane ? Math.sin(i * 3.1) * 3 : Math.sin(a) * radius;
            const rock = new THREE.IcosahedronGeometry(1, 1),
              p = rock.attributes.position;
            for (let j = 0; j < p.count; j++) {
              const d = 1 + 0.2 * Math.sin(p.getX(j) * 7 + p.getZ(j) * 11 + i);
              p.setXYZ(j, p.getX(j) * d, p.getY(j) * d, p.getZ(j) * d);
            }
            rock.scale(
              1.5 + (i % 3) * 0.4,
              0.35 + (i % 4) * 0.12,
              1.1 + (i % 2) * 0.6,
            );
            part(rock, x, -0.16, z, false, a);
            if (profile.style === "crystal") {
              const shard = new THREE.ConeGeometry(0.32, 0.9, 5);
              shard.rotateZ(0.3);
              part(shard, x + 0.4, 0.18, z, true, a);
            } else if (profile.style === "shell" && i % 3 === 0) {
              const shell = new THREE.SphereGeometry(
                1,
                12,
                6,
                0,
                Math.PI * 2,
                0,
                Math.PI / 2,
              );
              shell.scale(1.4, 0.35, 0.9);
              part(shell, x + 0.7, 0.04, z, true, a);
            }
          }
        }
        for (const [parts, material, name] of [
          [stoneParts, stone, "eroded_fitted_stone"],
          [metalParts, bronze, "carved_grilles_and_mineral_rims"],
        ]) {
          if (!parts.length) continue;
          mesh(combine(parts), material, name);
          for (const g of parts) g.dispose();
        }
        const signal = keep(
          new THREE.MeshBasicMaterial({
            color: profile.color,
            transparent: true,
            opacity: 0.2,
            depthWrite: false,
          }),
        );
        const markings = mesh(
          combine(marks),
          signal,
          "fixed_warning_footprint",
        );
        for (const g of marks) g.dispose();
        const geometry = keep(new THREE.BufferGeometry());
        const seeds = [];
        for (let i = 0; i < 160; i++)
          seeds.push(i / 160, i * 2.399963, (i * 0.618034) % 1);
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(new Float32Array(480), 3),
        );
        geometry.setAttribute(
          "hazardSeed",
          new THREE.Float32BufferAttribute(seeds, 3),
        );
        const material = keep(
          new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            uniforms: {
              hazardTime: clock,
              strength: { value: 0 },
              power: { value: 0 },
              tint: { value: new THREE.Color(profile.color) },
            },
            vertexShader: `attribute vec3 hazardSeed;uniform float hazardTime;uniform float power;varying float life;varying float seed;
      void main(){life=fract(hazardSeed.x+hazardTime*.35);seed=hazardSeed.y;
        float width=${profile.pattern === "lane" ? profile.width / 2 : profile.radius}.;
        float r=sqrt(hazardSeed.z)*width*.9;
        vec3 p=vec3(${profile.pattern === "lane" ? `(hazardSeed.z-.5)*${profile.length}.` : "cos(seed)*r"},1.+life*${profile.height}. * mix(.18,1.,power),sin(seed+life*.9)*${profile.pattern === "lane" ? "width*.75" : "r"});
        vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
        gl_PointSize=clamp((1.5+power*3.)/max(3.,-view.z)*130.,1.,18.);}`,
            fragmentShader: `uniform float strength;uniform vec3 tint;varying float life;varying float seed;
      void main(){vec2 p=gl_PointCoord-.5;float d=length(p);if(d>.49)discard;
        float rim=exp(-pow((d-.34)/.07,2.));
        float gleam=exp(-length(p-vec2(-.14,.15))*16.);
        float alpha=(rim*.5+gleam*.35)*strength*sin(life*3.14159);
        gl_FragColor=vec4(mix(tint,vec3(.82,.94,.98),.6),alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
          }),
        );
        const plume = new THREE.Points(geometry, material);
        plume.name = "bounded_pressure_release";
        plume.frustumCulled = false;
        group.add(plume);
        plume.visible = false;
        site.art = { group, signal, material, plume, markings };
        return [site];
      },
    );
    const baseUpdate = ocean.update.bind(ocean),
      baseReset = ocean.reset?.bind(ocean),
      baseDispose = ocean.dispose.bind(ocean);
    let disposed = false;
    const origin = new THREE.Vector3();
    ocean.deepHazards = {
      sites,
      onMovement(
        a,
        b,
        now,
        { dt = 0, blocked = () => false, length = 3 } = {},
      ) {
        if (disposed) return [];
        const events = [];
        for (const site of sites) {
          const vertical = b.y - site.y;
          const near =
            Math.hypot(b.x - site.x, b.z - site.z) <
              DEEP_HAZARD_RULES.triggerRadius &&
            vertical > 0 &&
            vertical < profile.height + 18;
          origin.set(
            site.x,
            site.y + Math.min(profile.height - 1, Math.max(3, vertical)),
            site.z,
          );
          const event = stepDeepHazard(
            site.state,
            dt,
            site.state.phase === "idle" &&
              near &&
              !blocked(origin, b) &&
              !deepHazardTerrainBlocked(origin, b, heightAt),
          );
          if (event === "warning")
            events.push({ warning: profile.warning, site });
          if (site.state.phase !== "active" || site.state.spent) continue;
          const contact = deepHazardContact(
            a,
            b,
            site,
            Math.min(3, Math.max(0.6, length * 0.08)),
          );
          if (!contact) continue;
          origin.set(
            site.x,
            Math.min(
              site.y + profile.height - 1,
              Math.max(site.y + 3, contact.y),
            ),
            site.z,
          );
          if (
            blocked(origin, contact) ||
            deepHazardTerrainBlocked(origin, contact, heightAt)
          )
            continue;
          site.state.spent = true;
          events.push({
            damage: DEEP_HAZARD_RULES.damage,
            message: profile.hit,
            site,
          });
        }
        return events;
      },
    };
    ocean.update = (now, position, ...args) => {
      baseUpdate(now, position, ...args);
      if (disposed) return;
      // 降低动态模式保留静态强弱与足迹；只暂停粒子流动，不隐藏危险。
      const reduced = args[3] === true;
      clock.value = reduced ? 0 : now;
      for (const site of sites) {
        const { state, art } = site;
        art.group.visible =
          Math.abs(position.y - site.y) < 125 &&
          Math.hypot(position.x - site.x, position.z - site.z) < 200;
        const warning = state.phase === "warning",
          active = state.phase === "active";
        art.signal.opacity = active
          ? 0.9
          : warning
            ? reduced
              ? 0.65
              : 0.5 + Math.sin(now * 5) * 0.18
            : state.phase === "cooldown"
              ? 0.08
              : 0.18;
        art.plume.visible = warning || active;
        art.material.uniforms.power.value = active ? 1 : 0;
        art.material.uniforms.strength.value = active ? 0.9 : 0.42;
      }
    };
    ocean.reset = () => {
      baseReset?.();
      for (const site of sites) {
        Object.assign(site.state, createDeepHazardState());
        site.art.plume.visible = false;
        site.art.signal.opacity = 0.18;
      }
    };
    ocean.dispose = () => {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      for (const r of owned) r.dispose();
      owned.clear();
      root.clear();
      sites.length = 0;
      baseDispose();
    };
    return ocean;
  } catch (error) {
    root.removeFromParent();
    for (const resource of owned) resource.dispose();
    root.clear();
    throw error;
  }
}
