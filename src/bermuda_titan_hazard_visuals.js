import * as THREE from "three";
import { acquireBermudaGeologyAsset } from "./bermuda_geology_asset.js";
import { acquireBermudaLavaHfMaterial } from "./bermuda_lava_hf_material.js";

/** 任务提供经过完整实体检查的世界熔流；画面不再另算几根独立射线。 */
export const BERMUDA_TITAN_HAZARD_LIMITS = Object.freeze({
  paths: 3,
  segments: 12,
  rocks: 6,
  radialSegments: 12,
  drawCalls: 6,
});

const L = BERMUDA_TITAN_HAZARD_LIMITS,
  MAX_POINTS = L.segments + 1,
  MAX_VISUAL_POINTS = MAX_POINTS * 7,
  MAX_RINGS = MAX_VISUAL_POINTS + 4,
  STRIDE = L.radialSegments + 1,
  MAX_VERTICES = L.paths * (MAX_RINGS * STRIDE + 2),
  MAX_INDICES =
    L.paths * ((MAX_RINGS - 1) * L.radialSegments * 6 + L.radialSegments * 6),
  IMPACT_RADIAL = 24,
  IMPACT_VERTICES = 2 + 6 * (IMPACT_RADIAL + 1),
  IMPACT_INDICES = IMPACT_RADIAL * 6 + 4 * IMPACT_RADIAL * 6,
  IMPACT_RING_RADII = [0.28, 0.6, 0.88, 1, 1, 1],
  TERMINAL_RING_RADII = [0.28, 0.5, 0.78, 0.96, 0.96, 1],
  STEAM_INSTANCES = L.paths * 3 + L.rocks,
  UP = new THREE.Vector3(0, 1, 0),
  FRONT = new THREE.Vector3(0, 0, 1);

const clamp01 = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0)),
  finite = (v) =>
    Number.isFinite(v?.x) && Number.isFinite(v?.y) && Number.isFinite(v?.z),
  seedOf = (id) => {
    let h = 2166136261;
    for (const c of String(id ?? ""))
      h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return (h >>> 0) / 4294967296;
  };

function groundNormal(target, value) {
  target.copy(finite(value) ? value : UP);
  if (target.lengthSq() < 1e-8) target.copy(UP);
  return target.normalize();
}

const noise = `
float hotNoise(vec3 p) {
  return .5+.25*sin(p.x*1.71+sin(p.z*1.13))
    +.15*sin(p.y*2.31-p.z*.83+sin(p.x*.67))
    +.10*sin(p.z*4.1+p.x*2.7);
}
`;

const instanceVertex = `
  attribute float aLife; attribute float aKind; attribute float aSeed;
  varying vec2 vHazardUv; varying float vLife; varying float vKind; varying float vSeed;
  varying vec3 vHazardWorld; varying vec3 vHazardNormal; varying vec3 vHazardView;
  uniform vec3 uSheetFootprint[32];uniform vec3 uSheetFootCenter;uniform float uSheetFootCount;
  #include <fog_pars_vertex>
  void main(){
    vec4 world=modelMatrix*instanceMatrix*vec4(position,1.);
    if(aKind>1.5&&aKind<2.5&&uSheetFootCount>2.){
      float part=mod(atan(position.y,position.x)+6.2831853,6.2831853)/6.2831853*uSheetFootCount;
      int a=int(floor(part));int b=int(mod(float(a+1),uSheetFootCount));
      vec3 edge=mix(uSheetFootprint[a],uSheetFootprint[b],fract(part));
      world=vec4(mix(uSheetFootCenter,edge,length(position.xy)),1.);world.y+=.16;
    }
    vec4 mvPosition=viewMatrix*world;
    vHazardUv=uv;vLife=aLife;vKind=aKind;vSeed=aSeed;vHazardWorld=world.xyz;
    vHazardNormal=normalize(normalMatrix*mat3(instanceMatrix)*normal);vHazardView=-mvPosition.xyz;
    gl_Position=projectionMatrix*mvPosition;
    #include <fog_vertex>
  }`;

function instanceMaterial(clock, motion, steam = false) {
  return new THREE.ShaderMaterial({
    name: steam ? "titan_submerged_steam" : "titan_ground_heat_warning",
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uClock: clock,
      uMotion: motion,
      uSheetFootprint: {
        value: Array.from({ length: 32 }, () => new THREE.Vector3()),
      },
      uSheetFootCenter: { value: new THREE.Vector3() },
      uSheetFootCount: { value: 0 },
    },
    vertexShader: instanceVertex,
    fragmentShader: `
      uniform float uClock;uniform float uMotion;
      varying vec2 vHazardUv;varying float vLife;varying float vKind;varying float vSeed;
      varying vec3 vHazardWorld;varying vec3 vHazardNormal;varying vec3 vHazardView;
      #include <fog_pars_fragment>
      ${noise}
      void main(){
        vec2 p=(vHazardUv-.5)*2.; float r=length(p),a=atan(p.y,p.x);
        vec3 color; float alpha;
        ${
          steam
            ? `
          float facing=abs(dot(normalize(vHazardNormal),normalize(vHazardView)));
          float density=hotNoise(vHazardWorld*.24+vec3(0.,-uClock*.7*uMotion,0.));
          color=mix(vec3(.13,.17,.17),vec3(.42,.40,.32),vKind*.3);
          alpha=pow(facing,1.7)*(.07+.09*density)*vLife;
        `
            : `
          float outer=(1.-smoothstep(.94,1.,r))*smoothstep(.82,.88,r);
          float dashes=step(.22,fract(a*3.8197+vSeed));
          float inner=(1.-smoothstep(.59,.63,r))*smoothstep(.53,.57,r)*dashes;
          float cross=(1.-smoothstep(.014,.035,min(abs(p.x),abs(p.y))))*(1.-smoothstep(.15,.25,r));
          float pulse=.88+.12*sin(uClock*3.*uMotion+vSeed*6.28);
          if(vKind<.5||(vKind>1.5&&vKind<2.5)){
            color=vec3(1.1,.24,.018);alpha=(outer+inner*.72+cross*.7)*pulse*(.58+.32*vLife);
          }else{ color=vec3(0.);alpha=0.; }
        `
        }
        if(alpha<.004)discard;
        gl_FragColor=vec4(color,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    side: steam ? THREE.FrontSide : THREE.DoubleSide,
    fog: true,
  });
}

function instanceAttributes(geometry, count) {
  for (const name of ["aLife", "aKind", "aSeed"])
    geometry.setAttribute(
      name,
      new THREE.InstancedBufferAttribute(new Float32Array(count), 1).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
  return geometry;
}

/** No timers, private animation loop, random frame state, lights or texture creation. */
export function createBermudaTitanHazardVisuals(parent) {
  const root = new THREE.Group();
  root.name = "bermuda_titan_molten_hazards";
  parent.add(root);
  const owned = new Set(),
    keep = (r) => (owned.add(r), r),
    clock = { value: 0 },
    motion = { value: 1 },
    streamGeometry = keep(new THREE.BufferGeometry()),
    positions = new Float32Array(MAX_VERTICES * 3),
    normals = new Float32Array(MAX_VERTICES * 3),
    uv = new Float32Array(MAX_VERTICES * 2),
    indices = new Uint16Array(MAX_INDICES),
    streamExposure = new Uint8Array(MAX_VERTICES);
  for (const [name, data, size] of [
    ["position", positions, 3],
    ["normal", normals, 3],
    ["uv", uv, 2],
  ])
    streamGeometry.setAttribute(
      name,
      new THREE.BufferAttribute(data, size).setUsage(THREE.DynamicDrawUsage),
    );
  streamGeometry.setAttribute(
    "aLavaExposure",
    new THREE.BufferAttribute(streamExposure, 1, true).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  streamGeometry.setIndex(
    new THREE.BufferAttribute(indices, 1).setUsage(THREE.DynamicDrawUsage),
  );
  streamGeometry.setDrawRange(0, 0);
  const lavaStream = acquireBermudaLavaHfMaterial({
      kind: "sheet",
      exposureAttributes: true,
    }),
    lavaPool = acquireBermudaLavaHfMaterial({ kind: "pool" }),
    lavaResidue = acquireBermudaLavaHfMaterial({
      kind: "residue",
      thermalAttributes: true,
      exposureAttributes: true,
    }),
    molten = lavaStream.material,
    stream = new THREE.Mesh(streamGeometry, molten),
    impactGeometry = keep(new THREE.BufferGeometry()),
    impactPositions = new Float32Array(L.paths * IMPACT_VERTICES * 3),
    impactNormals = new Float32Array(impactPositions.length),
    impactUvs = new Float32Array(L.paths * IMPACT_VERTICES * 2),
    impactIndices = new Uint16Array(L.paths * IMPACT_INDICES),
    impactThermals = new Float32Array(L.paths * IMPACT_VERTICES * 2),
    impactExposure = new Uint8Array(L.paths * IMPACT_VERTICES),
    impacts = new THREE.Mesh(impactGeometry, lavaPool.material),
    discsGeometry = keep(
      instanceAttributes(new THREE.CircleGeometry(1, 52), L.paths + L.rocks),
    ),
    discs = new THREE.InstancedMesh(
      discsGeometry,
      keep(instanceMaterial(clock, motion)),
      L.paths + L.rocks,
    ),
    steamGeometry = keep(
      instanceAttributes(new THREE.SphereGeometry(1, 14, 9), STEAM_INSTANCES),
    ),
    steam = new THREE.InstancedMesh(
      steamGeometry,
      keep(instanceMaterial(clock, motion, true)),
      STEAM_INSTANCES,
    ),
    rockAsset = acquireBermudaGeologyAsset("rock"),
    rocks = new THREE.InstancedMesh(
      rockAsset.geometry,
      rockAsset.material,
      L.rocks,
    ),
    chargeGeometry = keep(new THREE.SphereGeometry(1, 20, 12)),
    charge = new THREE.Mesh(chargeGeometry, molten);
  stream.name = "titan_complete_molten_salvo";
  stream.userData.pathRanges = Array.from({ length: L.paths }, () => ({
    firstVertex: 0,
    vertexCount: 0,
  }));
  impacts.name = "titan_four_metre_molten_impact_crowns";
  impacts.userData.poolRanges = Array.from({ length: 2 }, () => ({
    active: false,
    firstVertex: 0,
    vertexCount: 0,
    firstIndex: 0,
    indexCount: 0,
    temperature: 0,
    opacity: 0,
  }));
  discs.name = "titan_hazard_ground_marks";
  steam.name = "titan_impact_underwater_steam";
  rocks.name = "titan_real_falling_hf_rocks";
  charge.name = "titan_mouth_molten_charge";
  for (const [name, data, size] of [
    ["position", impactPositions, 3],
    ["normal", impactNormals, 3],
    ["uv", impactUvs, 2],
  ])
    impactGeometry.setAttribute(
      name,
      new THREE.BufferAttribute(data, size).setUsage(THREE.DynamicDrawUsage),
    );
  impactGeometry.setAttribute(
    "aLavaThermal",
    new THREE.BufferAttribute(impactThermals, 2).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  impactGeometry.setAttribute(
    "aLavaExposure",
    new THREE.BufferAttribute(impactExposure, 1, true).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  impactGeometry.setIndex(
    new THREE.BufferAttribute(impactIndices, 1).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  impactGeometry.setDrawRange(0, 0);
  function restoreImpactIndices() {
    for (let path = 0; path < L.paths; path++) {
      const offset = path * IMPACT_VERTICES;
      let at = path * IMPACT_INDICES;
      for (let j = 0; j < IMPACT_RADIAL; j++) {
        impactIndices[at++] = offset;
        impactIndices[at++] = offset + j + 2;
        impactIndices[at++] = offset + j + 1;
      }
      for (let ring = 0; ring < 5; ring++) {
        // 顶面与侧壁位置相接，但UV独立；重复边界环之间不创建零面积三角。
        if (ring === 3) continue;
        for (let j = 0; j < IMPACT_RADIAL; j++) {
          const a = offset + 1 + ring * (IMPACT_RADIAL + 1) + j,
            b = a + IMPACT_RADIAL + 1;
          impactIndices[at++] = a;
          impactIndices[at++] = a + 1;
          impactIndices[at++] = b;
          impactIndices[at++] = a + 1;
          impactIndices[at++] = b + 1;
          impactIndices[at++] = b;
        }
      }
      const bottom = offset + IMPACT_VERTICES - 1,
        last = offset + 1 + 5 * (IMPACT_RADIAL + 1);
      for (let j = 0; j < IMPACT_RADIAL; j++) {
        impactIndices[at++] = bottom;
        impactIndices[at++] = last + j;
        impactIndices[at++] = last + j + 1;
      }
    }
  }
  restoreImpactIndices();
  for (const mesh of [stream, impacts, discs, steam, rocks, charge]) {
    mesh.frustumCulled = false;
    mesh.visible = false;
    root.add(mesh);
  }
  rockAsset.geometry.computeBoundingSphere();
  const rockRadius = rockAsset.geometry.boundingSphere.radius,
    matrix = new THREE.Matrix4(),
    rotation = new THREE.Quaternion(),
    euler = new THREE.Euler(),
    position = new THREE.Vector3(),
    scale = new THREE.Vector3(),
    normal = new THREE.Vector3(),
    tangent = new THREE.Vector3(),
    right = new THREE.Vector3(),
    up = new THREE.Vector3(),
    next = new THREE.Vector3(),
    cache = Array.from({ length: L.paths }, () => ({
      points: Array.from({ length: MAX_POINTS }, () => new THREE.Vector3()),
      visualPoints: Array.from(
        { length: MAX_VISUAL_POINTS },
        () => new THREE.Vector3(),
      ),
      count: 0,
      radius: 1,
      impact: new THREE.Vector3(),
      impactRadius: 1,
      impactHeight: 4,
      impactNormal: new THREE.Vector3(0, 1, 0),
      seed: 0,
    })),
    rockCache = Array.from({ length: L.rocks }, () => ({
      point: new THREE.Vector3(),
      normal: new THREE.Vector3(0, 1, 0),
      radius: 2,
      seed: 0,
    })),
    terminalPool = {
      impact: new THREE.Vector3(),
      impactNormal: new THREE.Vector3(0, 1, 0),
      impactRadius: 128,
      impactHeight: 1,
      seed: 0.37,
      terminal: true,
    },
    cornerStart = new THREE.Vector3(),
    cornerEnd = new THREE.Vector3(),
    closest = new THREE.Vector3();
  let disposed = false,
    cachedPaths = 0,
    cachedRocks = 0,
    vertexCount = 0,
    indexCount = 0;
  const stats = {
    maxPaths: L.paths,
    maxSegments: L.segments,
    maxRocks: L.rocks,
    maxDrawCalls: L.drawCalls,
    vertices: 0,
    triangles: 0,
    impactTriangles: 0,
    pools: 0,
    paths: 0,
    groundMarks: 0,
    rocks: 0,
    steam: 0,
    visibleDrawCalls: 0,
    bufferBytes:
      positions.byteLength +
      normals.byteLength +
      uv.byteLength +
      indices.byteLength +
      impactPositions.byteLength +
      impactNormals.byteLength +
      impactUvs.byteLength +
      impactIndices.byteLength +
      impactThermals.byteLength +
      streamExposure.byteLength +
      impactExposure.byteLength,
    rockTriangles: rockAsset.geometry.index.count / 3,
  };

  function addVertex(x, y, z, nx, ny, nz, u, v) {
    const i = vertexCount++;
    streamExposure[i] = 0;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    normals[i * 3] = nx;
    normals[i * 3 + 1] = ny;
    normals[i * 3 + 2] = nz;
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
    return i;
  }
  function frame(points, i, count, transport = false) {
    tangent
      .copy(points[Math.min(count - 1, i + 1)])
      .sub(points[Math.max(0, i - 1)])
      .normalize();
    if (tangent.lengthSq() < 0.5) tangent.set(1, 0, 0);
    if (transport) right.addScaledVector(tangent, -right.dot(tangent));
    if (!transport || right.lengthSq() < 1e-8)
      right.crossVectors(tangent, Math.abs(tangent.y) > 0.94 ? FRONT : UP);
    right.normalize();
    up.crossVectors(right, tangent).normalize();
  }
  function ring(point, radius, axial, radial, distance, seed) {
    const start = vertexCount;
    const time = clock.value * motion.value,
      pressure = distance * 0.45 - time * 2.7 + seed * 6.28,
      major = 0.74 + 0.2 * Math.sin(pressure),
      minor = major * (0.67 + 0.1 * Math.sin(pressure * 0.63 + seed * 3.1)),
      twist = 0.45 * Math.sin(distance * 0.09 - time * 0.4 + seed * 4),
      ct = Math.cos(twist),
      st = Math.sin(twist);
    for (let j = 0; j <= L.radialSegments; j++) {
      const angle = (j / L.radialSegments) * Math.PI * 2,
        c = Math.cos(angle),
        s = Math.sin(angle),
        fold =
          0.94 +
          0.055 *
            Math.sin(angle * 3 + distance * 0.1 - time * 0.8 + seed * 6.28),
        x = (c * major * ct - s * minor * st) * radial * fold,
        y = (c * major * st + s * minor * ct) * radial * fold,
        nx = right.x * x + up.x * y + tangent.x * axial * 0.88,
        ny = right.y * x + up.y * y + tangent.y * axial * 0.88,
        nz = right.z * x + up.z * y + tangent.z * axial * 0.88;
      addVertex(
        point.x + nx * radius,
        point.y + ny * radius,
        point.z + nz * radius,
        nx,
        ny,
        nz,
        j / L.radialSegments + seed,
        distance * 0.14,
      );
    }
    return start;
  }
  function distanceToPath(point, path) {
    let nearest = Infinity;
    for (let i = 1; i < path.count; i++) {
      const a = path.points[i - 1],
        b = path.points[i],
        dx = b.x - a.x,
        dy = b.y - a.y,
        dz = b.z - a.z,
        lengthSq = dx * dx + dy * dy + dz * dz,
        t =
          lengthSq > 1e-12
            ? Math.max(
                0,
                Math.min(
                  1,
                  ((point.x - a.x) * dx +
                    (point.y - a.y) * dy +
                    (point.z - a.z) * dz) /
                    lengthSq,
                ),
              )
            : 0;
      nearest = Math.min(
        nearest,
        (point.x - a.x - t * dx) ** 2 +
          (point.y - a.y - t * dy) ** 2 +
          (point.z - a.z - t * dz) ** 2,
      );
    }
    return Math.sqrt(nearest);
  }
  function roundedPath(path) {
    const points = path.visualPoints;
    let count = 0;
    function append(point, subdivide = false) {
      if (count) {
        const previous = points[count - 1],
          dx = point.x - previous.x,
          dy = point.y - previous.y,
          dz = point.z - previous.z,
          distance = Math.hypot(dx, dy, dz);
        if (distance < 1e-8) return;
        if (subdivide && distance > path.radius * 3)
          for (let i = 1; i <= 2; i++)
            points[count++].set(
              previous.x + (dx * i) / 3,
              previous.y + (dy * i) / 3,
              previous.z + (dz * i) / 3,
            );
      }
      points[count++].copy(point);
    }
    append(path.points[0]);
    for (let i = 1; i < path.count - 1; i++) {
      const a = path.points[i - 1],
        b = path.points[i],
        c = path.points[i + 1],
        before = a.distanceTo(b),
        after = b.distanceTo(c),
        cut = Math.min(path.radius * 0.8, before * 0.23, after * 0.23);
      if (before < 1e-8 || after < 1e-8) {
        append(b, true);
        continue;
      }
      cornerStart.copy(b).lerp(a, cut / before);
      cornerEnd.copy(b).lerp(c, cut / after);
      append(cornerStart, true);
      for (let j = 1; j <= 4; j++) {
        const t = j / 4,
          s = 1 - t;
        closest.set(
          cornerStart.x * s * s + 2 * b.x * s * t + cornerEnd.x * t * t,
          cornerStart.y * s * s + 2 * b.y * s * t + cornerEnd.y * t * t,
          cornerStart.z * s * s + 2 * b.z * s * t + cornerEnd.z * t * t,
        );
        append(closest);
      }
    }
    append(path.points[path.count - 1], true);
    path.visualCount = count;
    return count;
  }
  function join(a, b) {
    for (let j = 0; j < L.radialSegments; j++) {
      indices[indexCount++] = a + j;
      indices[indexCount++] = b + j;
      indices[indexCount++] = a + j + 1;
      indices[indexCount++] = b + j;
      indices[indexCount++] = b + j + 1;
      indices[indexCount++] = a + j + 1;
    }
  }
  function impactMesh(path, slot, reducedMotion) {
    normal.copy(path.impactNormal);
    right
      .crossVectors(normal, Math.abs(normal.y) > 0.94 ? FRONT : UP)
      .normalize();
    up.crossVectors(right, normal).normalize();
    const base = slot * IMPACT_VERTICES,
      height = path.impactHeight;
    impactThermals.fill(1, base * 2, (base + IMPACT_VERTICES) * 2);
    function vertex(i, r, angle, y) {
      const c = Math.cos(angle),
        s = Math.sin(angle),
        ix = base + i,
        rx = right.x * c + up.x * s,
        ry = right.y * c + up.y * s,
        rz = right.z * c + up.z * s;
      impactPositions[ix * 3] = path.impact.x + rx * r + normal.x * y;
      impactPositions[ix * 3 + 1] = path.impact.y + ry * r + normal.y * y;
      impactPositions[ix * 3 + 2] = path.impact.z + rz * r + normal.z * y;
      const side = i >= 1 + 4 * (IMPACT_RADIAL + 1) && i < IMPACT_VERTICES - 1;
      impactUvs[ix * 2] = side
        ? (angle / (Math.PI * 2)) *
            Math.max(1, Math.round(path.impactRadius * Math.PI * 2 * 0.12)) +
          path.seed
        : c * r * 0.12 + path.seed;
      impactUvs[ix * 2 + 1] =
        (side ? y * 0.12 : s * r * 0.12) + path.seed * 1.7;
    }
    vertex(
      0,
      0,
      0,
      path.terminal
        ? height -
            0.22 *
              (0.5 + 0.5 * Math.sin(path.seed * 6.28 + (path.progress || 0)))
        : height * 0.21,
    );
    for (let ring = 0; ring < 6; ring++)
      for (let j = 0; j <= IMPACT_RADIAL; j++) {
        const angle = (j / IMPACT_RADIAL) * Math.PI * 2,
          phase =
            path.seed * 6.28 +
            clock.value * (reducedMotion ? 0.035 : 0.2) +
            (path.terminal
              ? (path.progress || 0) * (reducedMotion ? 0.15 : 0.85)
              : 0),
          fold = 0.5 + 0.5 * Math.cos(angle - phase),
          fraction = path.terminal
            ? TERMINAL_RING_RADII[ring]
            : IMPACT_RING_RADII[ring],
          outline = path.terminal
            ? 0.94 +
              0.04 * Math.sin(angle * 2 + phase) +
              0.02 * Math.sin(angle * 3 - phase * 0.7)
            : 1,
          radius = path.impactRadius * fraction * outline,
          shoulder = path.terminal ? Math.max(0, (fraction - 0.45) / 0.55) : 0,
          roll = path.terminal
            ? (1 - fraction) *
              0.85 *
              Math.max(
                0,
                Math.min(
                  1,
                  0.5 +
                    0.5 * Math.sin(angle * 2 + phase) +
                    0.18 * Math.sin(angle * 3 - phase * 0.4),
                ),
              )
            : 0,
          y =
            ring === 5
              ? 0
              : path.terminal
                ? Math.max(
                    0.02,
                    height * 0.5 * (1 + Math.cos(Math.PI * shoulder)) - roll,
                  )
                : height *
                  (ring === 0
                    ? 0.23 + 0.77 * fold * fold
                    : ring === 1
                      ? 0.2 + 0.06 * Math.sin(angle * 2 - phase)
                      : ring === 2
                        ? 0.09 + 0.015 * Math.sin(angle * 3 + phase)
                        : 0.03);
        vertex(1 + ring * (IMPACT_RADIAL + 1) + j, radius, angle, y);
      }
    vertex(IMPACT_VERTICES - 1, 0, 0, 0);
  }

  function surfaceNormals(geometry, vertices, count, stride) {
    const p = geometry.attributes.position.array,
      n = geometry.attributes.normal.array,
      idx = geometry.index.array;
    n.fill(0, 0, vertices * 3);
    for (let i = 0; i < count; i += 3) {
      const a = idx[i] * 3,
        b = idx[i + 1] * 3,
        c = idx[i + 2] * 3,
        x1 = p[b] - p[a],
        y1 = p[b + 1] - p[a + 1],
        z1 = p[b + 2] - p[a + 2],
        x2 = p[c] - p[a],
        y2 = p[c + 1] - p[a + 1],
        z2 = p[c + 2] - p[a + 2],
        rawX = y1 * z2 - z1 * y2,
        rawY = z1 * x2 - x1 * z2,
        rawZ = x1 * y2 - y1 * x2,
        // 池面按单位面法线加权，避免薄侧壁被大面积顶底面压成几乎竖直的法线。
        weight =
          geometry === impactGeometry
            ? 1 / (Math.hypot(rawX, rawY, rawZ) || 1)
            : 1,
        x = rawX * weight,
        y = rawY * weight,
        z = rawZ * weight;
      n[a] += x;
      n[a + 1] += y;
      n[a + 2] += z;
      n[b] += x;
      n[b + 1] += y;
      n[b + 2] += z;
      n[c] += x;
      n[c + 1] += y;
      n[c + 2] += z;
    }
    const ranges =
      geometry === streamGeometry ? stream.userData.pathRanges : null;
    for (
      let slot = 0;
      slot <
      (geometry === impactGeometry && impactGeometry.userData.fieldSkin
        ? 0
        : ranges
          ? L.paths
          : vertices / IMPACT_VERTICES);
      slot++
    ) {
      if (ranges?.[slot].sheet) continue;
      const first = ranges ? ranges[slot].firstVertex : slot * IMPACT_VERTICES,
        length = ranges ? ranges[slot].vertexCount : IMPACT_VERTICES;
      for (let i = first + 1; i < first + length - 1; i += stride) {
        const a = i * 3,
          b = (i + stride - 1) * 3;
        for (let k = 0; k < 3; k++) {
          const sum = n[a + k] + n[b + k];
          n[a + k] = n[b + k] = sum;
        }
      }
    }
    for (let i = 0; i < vertices; i++) {
      const at = i * 3,
        length = Math.hypot(n[at], n[at + 1], n[at + 2]) || 1;
      n[at] /= length;
      n[at + 1] /= length;
      n[at + 2] /= length;
    }
  }
  const perimeterCache = new Map();
  function fieldPerimeter(field) {
    const key = `${field.rows}/${field.columns}`;
    if (perimeterCache.has(key)) return perimeterCache.get(key);
    const ids = [],
      rows = field.rows,
      columns = field.columns;
    for (let c = 0; c < columns; c++) ids.push(c);
    for (let r = 1; r < rows; r++) ids.push(r * columns + columns - 1);
    for (let c = columns - 2; c >= 0; c--) ids.push((rows - 1) * columns + c);
    for (let r = rows - 2; r > 0; r--) ids.push(r * columns);
    const lookup = new Map(ids.map((id, index) => [id, index])),
      result = { ids, lookup };
    perimeterCache.set(key, result);
    return result;
  }
  // 厚边不再共用上下面退化成直线的UV；原权威顶点仍保留在缓冲首段。
  function fieldSkin(
    field,
    vertexStart,
    indexStart,
    writeVertex,
    writeIndex,
    exposure,
  ) {
    const n = field.rows * field.columns,
      { ids, lookup } = fieldPerimeter(field),
      wallStart = vertexStart + field.vertices.length;
    let length = 0;
    for (let edge = 0; edge <= ids.length; edge++) {
      const id = ids[edge % ids.length],
        low = field.vertices[id],
        high = field.vertices[n + id];
      if (edge) {
        const before = field.vertices[ids[(edge - 1) % ids.length]];
        length += Math.hypot(
          low.x - before.x,
          low.y - before.y,
          low.z - before.z,
        );
      }
      const cap = id < field.columns || id >= (field.rows - 1) * field.columns;
      writeVertex(wallStart + edge * 2, low, length * 0.12, 0, exposure(cap));
      writeVertex(
        wallStart + edge * 2 + 1,
        high,
        length * 0.12,
        Math.hypot(high.x - low.x, high.y - low.y, high.z - low.z) * 0.16,
        exposure(cap),
      );
    }
    for (let triangle = 0; triangle < field.boundary.length; triangle += 3) {
      const face = field.boundary.slice(triangle, triangle + 3),
        mixed = face.some((id) => id < n) && face.some((id) => id >= n),
        seam =
          mixed && face.some((id) => lookup.get(id % n) === ids.length - 1);
      for (let k = 0; k < 3; k++) {
        const id = face[k];
        let mapped = vertexStart + id;
        if (mixed) {
          let edge = lookup.get(id % n);
          if (seam && edge === 0) edge = ids.length;
          mapped = wallStart + edge * 2 + (id >= n ? 1 : 0);
        }
        writeIndex(indexStart + triangle + k, mapped);
      }
    }
    return field.vertices.length + (ids.length + 1) * 2;
  }
  function sheetMesh(sheet, slot) {
    const range = stream.userData.pathRanges[slot],
      start = vertexCount,
      added =
        sheet.vertices.length + (2 * sheet.rows + 2 * sheet.columns - 3) * 2;
    if (
      start + added > MAX_VERTICES ||
      indexCount + sheet.boundary.length > MAX_INDICES
    )
      return;
    range.firstVertex = start;
    range.vertexCount = sheet.vertices.length;
    range.sheet = true;
    for (let i = 0; i < sheet.vertices.length; i++) {
      const p = sheet.vertices[i],
        row = Math.floor((i % (sheet.rows * sheet.columns)) / sheet.columns),
        column = i % sheet.columns,
        distance =
          sheet.rowDistances?.[row] ??
          Math.hypot(
            p.x - sheet.vertices[column].x,
            p.y - sheet.vertices[column].y,
            p.z - sheet.vertices[column].z,
          );
      addVertex(
        p.x,
        p.y,
        p.z,
        0,
        1,
        0,
        (column / (sheet.columns - 1)) * Math.max(1, sheet.width * 0.035),
        distance * 0.14,
      );
      // 下表皮是新鲜熔融截面，保留HF纹理但不成为背光的纯黑平板。
      streamExposure[vertexCount - 1] =
        i < sheet.rows * sheet.columns ? 200 : 0;
    }
    range.skinVertexCount = fieldSkin(
      sheet,
      start,
      indexCount,
      (index, p, u, v, cut) => {
        positions[index * 3] = p.x;
        positions[index * 3 + 1] = p.y;
        positions[index * 3 + 2] = p.z;
        uv[index * 2] = u;
        uv[index * 2 + 1] = v;
        streamExposure[index] = cut;
      },
      (index, value) => {
        indices[index] = value;
      },
      (cap) => (cap ? 255 : 80),
    );
    vertexCount = start + range.skinVertexCount;
    indexCount += sheet.boundary.length;
  }
  function muzzleMesh(sheet) {
    if (!sheet.flow?.connectedToMouth || sheet.rows < 2) return;
    const n = sheet.rows * sheet.columns,
      middle = Math.floor((sheet.columns - 1) / 2),
      other = Math.ceil((sheet.columns - 1) / 2),
      a = sheet.vertices[middle],
      b = sheet.vertices[n + middle],
      a1 = sheet.vertices[other],
      b1 = sheet.vertices[n + other],
      c = sheet.vertices[sheet.columns + middle],
      d = sheet.vertices[n + sheet.columns + middle],
      c1 = sheet.vertices[sheet.columns + other],
      d1 = sheet.vertices[n + sheet.columns + other];
    position.copy(a).add(b).add(a1).add(b1).multiplyScalar(0.25);
    next.copy(c).add(d).add(c1).add(d1).multiplyScalar(0.25);
    tangent.copy(next).sub(position);
    const length = Math.min(3.5, tangent.length());
    if (length < 0.03) return;
    tangent.normalize();
    right
      .crossVectors(Math.abs(tangent.y) > 0.94 ? FRONT : UP, tangent)
      .normalize();
    up.crossVectors(tangent, right).normalize();
    rotation.setFromRotationMatrix(matrix.makeBasis(right, up, tangent));
    // 短喷头位于第一个真实单元内部，主流片仍从嘴面开始，不能是脱唇的光球。
    charge.position.copy(position).addScaledVector(tangent, length * 0.55);
    charge.quaternion.copy(rotation);
    charge.scale.set(
      Math.min(1.8, length * 0.35),
      Math.min(Math.abs(b.y - a.y) * 0.3, length * 0.15),
      length * 0.45,
    );
    charge.visible = true;
  }
  function poolMesh(pool, vertexStart, indexStart, slot) {
    const field = pool.geometry,
      temperature = clamp01(pool.temperature),
      opacity = clamp01(pool.opacity);
    if (
      !field?.vertices?.length ||
      !field.vertices.every(finite) ||
      !field.boundary?.length ||
      opacity <= 0 ||
      temperature <= 0
    )
      return null;
    const added =
      field.vertices.length + (2 * field.rows + 2 * field.columns - 3) * 2;
    if (
      vertexStart + added > impactPositions.length / 3 ||
      indexStart + field.boundary.length > impactIndices.length
    )
      return null;
    const seed = seedOf(pool.id),
      range = impacts.userData.poolRanges[slot],
      writeVertex = (index, p, u, v, cut) => {
        impactPositions[index * 3] = p.x;
        impactPositions[index * 3 + 1] = p.y;
        impactPositions[index * 3 + 2] = p.z;
        impactUvs[index * 2] = u;
        impactUvs[index * 2 + 1] = v;
        impactThermals[index * 2] = temperature;
        impactThermals[index * 2 + 1] = opacity;
        impactExposure[index] = cut;
      };
    Object.assign(range, {
      active: true,
      id: pool.id,
      firstVertex: vertexStart,
      vertexCount: field.vertices.length,
      firstIndex: indexStart,
      indexCount: field.boundary.length,
      temperature,
      opacity,
      harmful: pool.harmful === true,
    });
    for (let i = 0; i < field.vertices.length; i++) {
      const p = field.vertices[i];
      writeVertex(
        vertexStart + i,
        p,
        p.x * 0.1 + seed,
        p.z * 0.1 + seed * 0.7,
        0,
      );
    }
    range.skinVertexCount = fieldSkin(
      field,
      vertexStart,
      indexStart,
      writeVertex,
      (index, value) => {
        impactIndices[index] = value;
      },
      () => 90,
    );
    return { vertices: range.skinVertexCount, indices: field.boundary.length };
  }
  function sheetWarning(sheet, progress, slot) {
    const uniforms = discs.material.uniforms,
      points = sheet.footprint;
    uniforms.uSheetFootCount.value = Math.min(32, points.length);
    uniforms.uSheetFootCenter.value.set(0, 0, 0);
    for (let i = 0; i < points.length && i < 32; i++) {
      uniforms.uSheetFootprint.value[i].copy(points[i]);
      uniforms.uSheetFootCenter.value.add(points[i]);
    }
    uniforms.uSheetFootCenter.value.multiplyScalar(1 / points.length);
    instance(
      discs,
      slot,
      uniforms.uSheetFootCenter.value,
      1,
      UP,
      2,
      progress,
      seedOf(sheet.id),
    );
  }
  function pathMesh(path, slot) {
    const points = path.visualPoints,
      count = roundedPath(path),
      radius = path.radius * 0.92,
      range = stream.userData.pathRanges[slot];
    range.firstVertex = vertexCount;
    range.sheet = false;
    frame(points, 0, count);
    const startPole = addVertex(
      points[0].x - tangent.x * radius,
      points[0].y - tangent.y * radius,
      points[0].z - tangent.z * radius,
      -tangent.x,
      -tangent.y,
      -tangent.z,
      path.seed,
      0,
    );
    let previous = -1,
      first = -1,
      distance = 0;
    for (const angle of [Math.PI / 6, Math.PI / 3]) {
      const row = ring(
        points[0],
        radius,
        -Math.cos(angle),
        Math.sin(angle),
        0,
        path.seed,
      );
      if (previous >= 0) join(previous, row);
      else first = row;
      previous = row;
    }
    for (let j = 0; j < L.radialSegments; j++) {
      indices[indexCount++] = startPole;
      indices[indexCount++] = first + j;
      indices[indexCount++] = first + j + 1;
    }
    for (let i = 0; i < count; i++) {
      frame(points, i, count, i > 0);
      if (i) distance += points[i].distanceTo(points[i - 1]);
      // The rounded centreline may move slightly off the original polyline.
      // Subtract that exact distance before adding any surface volume.
      const safeRadius = Math.max(
          path.radius * 0.01,
          path.radius - distanceToPath(points[i], path) - path.radius * 0.001,
        ),
        row = ring(points[i], safeRadius, 0, 1, distance, path.seed);
      join(previous, row);
      previous = row;
    }
    for (const angle of [Math.PI / 3, Math.PI / 6]) {
      const row = ring(
        points[count - 1],
        radius,
        Math.cos(angle),
        Math.sin(angle),
        distance,
        path.seed,
      );
      join(previous, row);
      previous = row;
    }
    const end = points[count - 1],
      pole = addVertex(
        end.x + tangent.x * radius,
        end.y + tangent.y * radius,
        end.z + tangent.z * radius,
        tangent.x,
        tangent.y,
        tangent.z,
        path.seed,
        distance * 0.14,
      );
    for (let j = 0; j < L.radialSegments; j++) {
      indices[indexCount++] = previous + j;
      indices[indexCount++] = pole;
      indices[indexCount++] = previous + j + 1;
    }
    range.vertexCount = vertexCount - range.firstVertex;
  }
  function instance(mesh, i, point, radius, n, kind, life, seed, vertical = 1) {
    position.copy(point);
    if (mesh === discs) position.addScaledVector(n, 0.12);
    rotation.setFromUnitVectors(mesh === discs ? FRONT : UP, n);
    scale.set(radius, radius * vertical, radius);
    matrix.compose(position, rotation, scale);
    mesh.setMatrixAt(i, matrix);
    const a = mesh.geometry.attributes;
    a.aKind.setX(i, kind);
    a.aLife.setX(i, life);
    a.aSeed.setX(i, seed);
  }
  function finishInstances(mesh, count) {
    mesh.count = count;
    mesh.visible = count > 0;
    mesh.instanceMatrix.needsUpdate = true;
    for (const name of ["aKind", "aLife", "aSeed"])
      mesh.geometry.attributes[name].needsUpdate = true;
  }
  function clear() {
    stream.visible = charge.visible = impacts.visible = false;
    streamGeometry.setDrawRange(0, 0);
    impactGeometry.setDrawRange(0, 0);
    for (const mesh of [discs, steam, rocks]) {
      mesh.count = 0;
      mesh.visible = false;
    }
    for (const range of stream.userData.pathRanges) range.vertexCount = 0;
    for (const range of impacts.userData.poolRanges) range.active = false;
    Object.assign(stats, {
      vertices: 0,
      triangles: 0,
      impactTriangles: 0,
      pools: 0,
      paths: 0,
      groundMarks: 0,
      rocks: 0,
      steam: 0,
      visibleDrawCalls: 0,
    });
  }

  return {
    root,
    stats,
    prepare(options) {
      return disposed
        ? Promise.resolve(false)
        : Promise.all([
            rockAsset.prepare(options),
            lavaStream.prepare(options),
            lavaPool.prepare(options),
            lavaResidue.prepare(options),
          ]).then((results) => results.every(Boolean));
    },
    update(snapshot, { reducedMotion = false } = {}) {
      if (disposed) return;
      clear();
      restoreImpactIndices();
      impactGeometry.userData.fieldSkin = false;
      impacts.material = lavaPool.material;
      clock.value = Number.isFinite(snapshot?.clock) ? snapshot.clock : 0;
      motion.value = reducedMotion ? 0.18 : 1;
      lavaStream.setTime(clock.value, { reducedMotion });
      lavaPool.setTime(clock.value, { reducedMotion });
      lavaResidue.setTime(clock.value, { reducedMotion });
      const lava = snapshot?.lava,
        terminal = !!snapshot?.terminal?.active,
        terminalProgress = clamp01(snapshot?.terminal?.progress),
        paths =
          lava?.phase === "warning"
            ? (lava.warningSheets ?? lava.sheets ?? lava.paths ?? [])
            : (lava?.sheets ?? lava?.paths ?? []),
        poolRows = terminal ? [] : (lava?.pools ?? []),
        rockRows = snapshot?.rocks || [];
      if (paths.length) {
        cachedPaths = 0;
        for (const path of paths.slice(0, L.paths)) {
          if (path.type === "molten_sheet") {
            if (
              path.vertices?.length <= MAX_VERTICES &&
              path.boundary?.length <= MAX_INDICES &&
              path.vertices.every(finite)
            )
              cachedPaths++;
            continue;
          }
          if (
            !Array.isArray(path.points) ||
            path.points.length < 2 ||
            path.points.length > MAX_POINTS ||
            !path.points.every(finite) ||
            !finite(path.impact) ||
            !(path.radius > 0)
          )
            continue;
          const item = cache[cachedPaths++];
          item.count = path.points.length;
          for (let i = 0; i < item.count; i++)
            item.points[i].copy(path.points[i]);
          item.radius = path.radius;
          item.impact.copy(path.impact);
          item.impactRadius = Math.max(
            path.radius,
            path.impactRadius || path.radius,
          );
          item.impactHeight = Math.max(
            0.1,
            Number.isFinite(path.impactHeight) ? path.impactHeight : 4,
          );
          groundNormal(item.impactNormal, path.impactNormal);
          item.seed = seedOf(path.id);
        }
      }
      if (rockRows.length) {
        cachedRocks = 0;
        for (const row of rockRows.slice(0, L.rocks)) {
          if (!finite(row.warningPoint) || !(row.radius > 0)) continue;
          const item = rockCache[cachedRocks++];
          item.point.copy(row.warningPoint);
          groundNormal(item.normal, row.warningNormal);
          item.radius = row.radius;
          item.seed = seedOf(row.id);
        }
      }
      const active = lava?.phase === "active" && !terminal,
        warning = lava?.phase === "warning" && !terminal,
        count = active || warning ? Math.min(paths.length, cachedPaths) : 0;
      let discCount = 0,
        steamCount = 0,
        rockCount = 0,
        poolCount = 0,
        poolVertices = 0,
        poolIndices = 0,
        impactCount = active
          ? paths.filter((p) => p.type !== "molten_sheet").length
          : 0;
      vertexCount = indexCount = 0;
      for (let i = 0; i < count; i++) {
        if (paths[i]?.type === "molten_sheet") {
          const sheet = paths[i];
          if (active) {
            sheetMesh(sheet, i);
            muzzleMesh(sheet);
            for (const column of sheet.flow ? [] : [1, 5, 9]) {
              next.copy(
                sheet.vertices[(sheet.rows - 1) * sheet.columns + column],
              );
              next.y += 2.6;
              instance(
                steam,
                steamCount++,
                next,
                4.5,
                UP,
                1,
                reducedMotion ? 0.65 : 0.9,
                seedOf(sheet.id) + column * 0.1,
                1.4,
              );
            }
          } else if (warning)
            sheetWarning(sheet, clamp01(lava.progress), discCount++);
          continue;
        }
        const path = cache[i];
        if (active) {
          pathMesh(path, i);
          impactMesh(path, i, reducedMotion);
        }
        if (warning)
          instance(
            discs,
            discCount++,
            path.impact,
            path.impactRadius,
            path.impactNormal,
            active ? 1 : 0,
            clamp01(lava.progress),
            path.seed,
          );
        if (active) {
          next.copy(path.impact).addScaledVector(path.impactNormal, 2.2);
          instance(
            steam,
            steamCount++,
            next,
            Math.min(6, path.impactRadius * 0.42),
            path.impactNormal,
            1,
            reducedMotion ? 0.7 : 1,
            path.seed,
            1.4,
          );
          // Only two very light wisps well away from the mouth. They share the
          // existing steam draw and cannot turn into an opaque cloud on the head.
          for (const fraction of [0.36, 0.68]) {
            const source =
              path.visualPoints[Math.floor((path.visualCount - 1) * fraction)];
            if (source.distanceTo(path.points[0]) < 12) continue;
            next.copy(source).addScaledVector(UP, path.radius * 0.8);
            instance(
              steam,
              steamCount++,
              next,
              path.radius * 1.2,
              UP,
              0,
              0.28,
              path.seed + fraction,
              1.75,
            );
          }
        }
      }
      for (const pool of poolRows.slice(0, 2)) {
        const added = poolMesh(pool, poolVertices, poolIndices, poolCount);
        if (!added) continue;
        poolVertices += added.vertices;
        poolIndices += added.indices;
        poolCount++;
        const field = pool.geometry;
        for (const column of [
          1,
          Math.floor(field.columns / 2),
          field.columns - 2,
        ]) {
          if (steamCount >= STEAM_INSTANCES) break;
          const index = (field.rows - 1) * field.columns + column;
          next.copy(field.vertices[index]);
          next.y += Math.max(0.25, pool.temperature * 2);
          instance(
            steam,
            steamCount++,
            next,
            2.2,
            UP,
            1,
            clamp01(pool.opacity) * clamp01(pool.temperature) * 0.38,
            seedOf(pool.id) + column * 0.1,
            1.3,
          );
        }
      }
      if (poolCount) {
        impactGeometry.userData.fieldSkin = true;
        impacts.material = lavaResidue.material;
      }
      if (warning && count) {
        charge.position.copy(paths[0].points[0]);
        charge.scale.setScalar(
          Math.min(
            1.35,
            (paths[0].radius || 1.6) * (0.48 + 0.18 * clamp01(lava.progress)),
          ),
        );
        charge.visible = true;
      }
      for (
        let i = 0;
        i < (terminal ? 0 : Math.min(L.rocks, rockRows.length));
        i++
      ) {
        const row = rockRows[i],
          item = rockCache[i];
        if (!item || !finite(row?.warningPoint) || !(row.radius > 0)) continue;
        const phase = row.phase,
          progress = clamp01(row.progress);
        if (phase === "warning")
          instance(
            discs,
            discCount++,
            item.point,
            item.radius,
            item.normal,
            0,
            progress,
            item.seed,
          );
        else if (phase === "falling") {
          if (finite(row.position)) position.copy(row.position);
          else continue;
          rotation.setFromEuler(
            euler.set(
              item.seed * 4.7 + progress * 0.5,
              item.seed * 9.1,
              item.seed * 3.3 - progress * 0.4,
            ),
          );
          scale.setScalar(item.radius / rockRadius);
          matrix.compose(position, rotation, scale);
          rocks.setMatrixAt(rockCount++, matrix);
          instance(
            discs,
            discCount++,
            item.point,
            item.radius,
            item.normal,
            0,
            1,
            item.seed,
          );
        } else if (phase === "impact") {
          next
            .copy(item.point)
            .addScaledVector(item.normal, 1.3 + progress * 1.8);
          instance(
            steam,
            steamCount++,
            next,
            item.radius * (1 + progress),
            item.normal,
            0,
            1 - progress,
            item.seed,
            0.55,
          );
        }
      }
      // The failure is already fatal. Its short world-space epilogue rises at
      // the final real player, never by projecting an old mouth beam through rock.
      const final = snapshot?.terminal;
      if (
        terminal &&
        finite(final.center) &&
        finite(final.ground) &&
        finite(final.roof)
      ) {
        terminalPool.impact.copy(final.ground);
        terminalPool.progress = terminalProgress;
        terminalPool.impactHeight =
          Math.max(0.5, final.center.y - final.ground.y + 7) *
          (0.05 + 0.95 * terminalProgress);
        impactMesh(terminalPool, 0, reducedMotion);
        impactCount = 1;
        next.copy(final.ground);
        next.y += terminalPool.impactHeight * 0.7;
        instance(
          steam,
          steamCount++,
          next,
          10,
          UP,
          1,
          1,
          terminalPool.seed,
          Math.max(1, terminalPool.impactHeight / 12),
        );
        for (let i = 0; i < L.rocks; i++) {
          const seed = (i * 0.61803398875 + 0.17) % 1,
            angle = (i / L.rocks) * Math.PI * 2,
            radius = 2.3 + seed * 0.5,
            travel = clamp01(terminalProgress * (1.1 + seed * 0.25));
          position.set(
            final.center.x + Math.cos(angle) * (4 + seed * 3),
            THREE.MathUtils.lerp(
              final.roof.y - radius - 0.4,
              final.center.y - radius * 0.3,
              travel,
            ),
            final.center.z + Math.sin(angle) * (4 + seed * 3),
          );
          rotation.setFromEuler(
            euler.set(seed * 5 + travel, seed * 8, seed * 3 - travel * 0.7),
          );
          scale.setScalar(radius / rockRadius);
          matrix.compose(position, rotation, scale);
          rocks.setMatrixAt(rockCount++, matrix);
        }
      }
      streamGeometry.setDrawRange(0, indexCount);
      stream.visible = indexCount > 0;
      impacts.visible = impactCount > 0 || poolCount > 0;
      const actualImpactVertices = poolCount
          ? poolVertices
          : impactCount * IMPACT_VERTICES,
        actualImpactIndices = poolCount
          ? poolIndices
          : impactCount * IMPACT_INDICES;
      impactGeometry.setDrawRange(0, actualImpactIndices);
      if (impacts.visible)
        surfaceNormals(
          impactGeometry,
          actualImpactVertices,
          actualImpactIndices,
          IMPACT_RADIAL + 1,
        );
      if (impacts.visible) {
        impactGeometry.index.needsUpdate = true;
        impactGeometry.attributes.aLavaThermal.needsUpdate = true;
        impactGeometry.attributes.aLavaExposure.needsUpdate = true;
      }
      if (impacts.visible)
        for (const name of ["position", "normal", "uv"])
          impactGeometry.attributes[name].needsUpdate = true;
      if (stream.visible) {
        surfaceNormals(streamGeometry, vertexCount, indexCount, STRIDE);
        for (const name of ["position", "normal", "uv"])
          streamGeometry.attributes[name].needsUpdate = true;
        streamGeometry.index.needsUpdate = true;
        streamGeometry.attributes.aLavaExposure.needsUpdate = true;
      }
      finishInstances(discs, discCount);
      finishInstances(steam, steamCount);
      rocks.count = rockCount;
      rocks.visible = rockCount > 0;
      rocks.instanceMatrix.needsUpdate = true;
      Object.assign(stats, {
        vertices: vertexCount,
        triangles: indexCount / 3,
        impactTriangles: actualImpactIndices / 3,
        pools: poolCount,
        paths: active ? count : 0,
        groundMarks: discCount,
        rocks: rockCount,
        steam: steamCount,
        visibleDrawCalls: root.children.filter((m) => m.visible).length,
      });
    },
    reset() {
      if (disposed) return;
      cachedPaths = cachedRocks = 0;
      clock.value = 0;
      lavaStream.setTime(0);
      lavaPool.setTime(0);
      lavaResidue.setTime(0);
      clear();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      for (const mesh of [discs, steam, rocks]) mesh.dispose();
      for (const resource of owned) resource.dispose();
      rockAsset.release();
      lavaStream.release();
      lavaPool.release();
      lavaResidue.release();
      clear();
    },
  };
}
