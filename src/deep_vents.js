import * as THREE from "three";
import { addSurfaceDetail } from "./ocean_visuals.js";

export const DEEP_VENT_RULES = Object.freeze({
  period: 24,
  warning: 3,
  active: 4,
  damage: 12,
  interval: 2.5,
  radius: 10,
  height: 42,
});
const SITES = Object.freeze({
  hawaii: [
    [-100, -620],
    [80, -950],
    [-140, -1050],
  ],
  atlantis: [
    [-240, -850],
    [270, -1080],
    [-200, -1240],
  ],
  bermuda: [
    [-180, -710],
    [150, -1030],
    [-120, -1250],
  ],
  europa: [
    [-170, -700],
    [170, -990],
    [-120, -1250],
  ],
  mariana: [
    [-150, -990, -470],
    [150, -2140, -480],
  ],
});

/** 由同一时钟计算喷口状态；先提示三秒，再喷发四秒，随后安静十七秒。 */
export function deepVentPhase(now, index = 0) {
  const phase =
    (((now + index * 7) % DEEP_VENT_RULES.period) + DEEP_VENT_RULES.period) %
    DEEP_VENT_RULES.period;
  return phase <
    DEEP_VENT_RULES.period - DEEP_VENT_RULES.warning - DEEP_VENT_RULES.active
    ? "quiet"
    : phase < DEEP_VENT_RULES.period - DEEP_VENT_RULES.active
      ? "warning"
      : "active";
}

/** 热流按玩家中心扫掠，有界高度及半径；体型不放大危险范围。 */
export function intersectsDeepVent(a, b, site) {
  const dy = b.y - a.y,
    bottom = site.y + 1,
    top = site.y + DEEP_VENT_RULES.height;
  let start = 0,
    end = 1;
  if (Math.abs(dy) < 1e-9) {
    if (a.y < bottom || a.y > top) return false;
  } else {
    const t0 = (bottom - a.y) / dy,
      t1 = (top - a.y) / dy;
    start = Math.max(0, Math.min(t0, t1));
    end = Math.min(1, Math.max(t0, t1));
    if (start > end) return false;
  }
  const dx = b.x - a.x,
    dz = b.z - a.z,
    px = a.x - site.x,
    pz = a.z - site.z,
    length = dx * dx + dz * dz;
  const t = Math.max(
    start,
    Math.min(end, length > 1e-9 ? -(px * dx + pz * dz) / length : start),
  );
  return (px + dx * t) ** 2 + (pz + dz * t) ** 2 <= DEEP_VENT_RULES.radius ** 2;
}

/** 给海域追加小型热流能力，资源与旧海域共同释放，既有地形和生态不变。 */
export function attachDeepVents(
  ocean,
  regionId,
  { heightAt = ocean.heightAt } = {},
) {
  const root = new THREE.Group();
  root.name = "deep_thermal_vents";
  ocean.root.add(root);
  const resources = new Set(),
    keep = (r) => (resources.add(r), r);
  // 静态点云交给GPU做上升与翻滚，柔边矿物云避免规则的发光管道。
  const geometry = keep(new THREE.BufferGeometry());
  const positions = [],
    phases = [];
  for (let n = 0; n < 128; n++) {
    positions.push(0, 0, 0);
    phases.push(n / 128, n * 2.399963, 0.3 + (n % 7) / 10);
  }
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute(
    "ventPhase",
    new THREE.Float32BufferAttribute(phases, 3),
  );
  const lipGeometry = keep(new THREE.TorusGeometry(3.5, 0.65, 8, 20));
  const lipMaterial = keep(
    new THREE.MeshStandardMaterial({
      color: 0x55483d,
      roughness: 0.98,
      emissive: 0x42170c,
      emissiveIntensity: 0.25,
    }),
  );
  addSurfaceDetail(lipMaterial, "stone", 1.8);
  const rim = lipGeometry.attributes.position;
  for (let i = 0; i < rim.count; i++) {
    const x = rim.getX(i),
      y = rim.getY(i),
      z = rim.getZ(i),
      a = Math.atan2(y, x);
    const r = 1 + Math.sin(a * 5) * 0.09 + Math.cos(a * 9) * 0.05;
    rim.setXYZ(i, x * r, y * r, z + Math.sin(a * 7) * 0.2);
  }
  lipGeometry.computeVertexNormals();
  const time = { value: 0 };
  const jets = [];
  const sites = (SITES[regionId] || [])
    .map((point, i) => {
      const [x, yOrZ, zOptional] = point;
      const z = zOptional ?? yOrZ;
      let y = zOptional === undefined ? heightAt?.(x, z) + 0.3 : yOrZ;
      let host = null;
      if (zOptional !== undefined) {
        const meshes = [];
        ocean.root.updateMatrixWorld(true);
        ocean.root.traverse((n) => {
          if (n.isMesh && n.name.startsWith("trench_layer_")) meshes.push(n);
        });
        const ray = new THREE.Raycaster(
          new THREE.Vector3(x, y + 80, z),
          new THREE.Vector3(0, -1, 0),
          0,
          240,
        );
        const hit = ray.intersectObjects(meshes, false)[0];
        if (!hit) return null;
        y = hit.point.y + 0.3;
        host = hit.object.name;
      }
      if (!Number.isFinite(y) || y >= -260) return null;
      const site = {
        x,
        y,
        z,
        host,
        index: i,
        nextDamage: 0,
        lastWarning: -Infinity,
      };
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.name = `thermal_vent_${i}`;
      root.add(g);
      const lip = new THREE.Mesh(lipGeometry, lipMaterial);
      lip.rotation.x = -Math.PI / 2;
      g.add(lip);
      const mat = keep(
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          uniforms: { ventTime: time, strength: { value: 0.08 } },
          vertexShader: `uniform float ventTime;attribute vec3 ventPhase;varying float life;varying float seed;
          void main(){life=fract(ventPhase.x+ventTime*.065);seed=ventPhase.y;
          float radius=(1.+life*5.5)*ventPhase.z;
          vec3 p=vec3(cos(seed+life*3.)*radius,life*42.,sin(seed-life*2.)*radius);
          vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;
          gl_PointSize=clamp((900.+life*1600.)/max(8.,-v.z),2.,110.);}`,
          fragmentShader: `uniform float strength;varying float life;varying float seed;
          float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
          float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
            return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
          void main(){vec2 uv=gl_PointCoord-.5;float edge=1.-smoothstep(.12,.5,length(uv));
            float cloud=.6+.4*noise(gl_PointCoord*5.+seed);
            float a=edge*cloud*smoothstep(0.,.07,life)*(1.-smoothstep(.6,1.,life))*strength;
            gl_FragColor=vec4(mix(vec3(.64,.32,.13),vec3(.42,.47,.46),life),a);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
        }),
      );
      const jet = new THREE.Points(geometry, mat);
      jet.frustumCulled = false;
      g.add(jet);
      jets.push({ g, jet, mat, site });
      return site;
    })
    .filter(Boolean);
  const baseUpdate = ocean.update.bind(ocean),
    baseReset = ocean.reset?.bind(ocean),
    baseDispose = ocean.dispose.bind(ocean);
  let disposed = false;
  ocean.deepVents = {
    sites,
    onMovement(a, b, now) {
      for (const s of sites) {
        const phase = deepVentPhase(now, s.index),
          distance = Math.hypot(b.x - s.x, b.y - s.y - 18, b.z - s.z);
        if (phase === "warning" && distance < 85 && now - s.lastWarning > 10) {
          s.lastWarning = now;
          return { warning: true, site: s };
        }
        if (
          phase === "active" &&
          now >= s.nextDamage &&
          intersectsDeepVent(a, b, s)
        ) {
          s.nextDamage = now + DEEP_VENT_RULES.interval;
          return { damage: DEEP_VENT_RULES.damage, site: s };
        }
      }
      return null;
    },
  };
  ocean.update = (now, position, ...args) => {
    baseUpdate(now, position, ...args);
    time.value = now;
    for (const { g, jet, mat, site } of jets) {
      g.visible =
        Math.abs(position.y - site.y) < 220 &&
        Math.hypot(position.x - site.x, position.z - site.z) < 220;
      const phase = deepVentPhase(now, site.index);
      jet.visible = phase !== "quiet";
      mat.uniforms.strength.value = phase === "active" ? 0.32 : 0.1;
    }
  };
  ocean.reset = () => {
    baseReset?.();
    for (const s of sites) {
      s.nextDamage = 0;
      s.lastWarning = -Infinity;
    }
  };
  ocean.dispose = () => {
    if (disposed) return;
    disposed = true;
    root.removeFromParent();
    for (const r of resources) r.dispose();
    sites.length = 0;
    baseDispose();
  };
  return ocean;
}
