import * as THREE from "three";
import { createFluidTexture } from "./effect_textures.js";
import { WORLD } from "./world_config.js";
import {
  createWaterspoutState,
  stepWaterspout,
  BERMUDA_HAZARDS,
} from "./bermuda_hazard_rules.js";

/** 暴雨、阴云、受控闪电与旋转水柱；所有更新服从现有游戏时钟。 */
export function createBermudaWeather(parent, { audio, notify, onDamage } = {}) {
  const root = new THREE.Group();
  root.name = "bermuda_storm_weather";
  parent.add(root);
  const resources = new Set(),
    keep = (r) => (resources.add(r), r),
    time = { value: 0 },
    flash = { value: 0 };
  let state = createWaterspoutState(),
    disposed = false,
    lastThunder = -1;
  const skyMaterial = keep(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { uTime: time, uFlash: flash },
      vertexShader:
        "varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader:
        `varying vec3 p; uniform float uTime; uniform float uFlash;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
    void main(){vec3 d=normalize(p);vec2 uv=d.xz/(0.3+abs(d.y))*2.7+vec2(uTime*0.005,-uTime*0.004);float n=0.55*noise(uv)+0.27*noise(uv*2.2)+0.18*noise(uv*5.3);vec3 c=mix(vec3(.033,.052,.066),vec3(.23,.27,.28),n);c=mix(vec3(.16,.20,.22),c,smoothstep(-.1,.2,d.y));c+=vec3(.35,.4,.46)*uFlash;gl_FragColor=vec4(c,1.0);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(
          ";#include",
          ";\n#include",
        ),
    }),
  );
  const dome = new THREE.Mesh(
    keep(new THREE.SphereGeometry(1800, 40, 24)),
    skyMaterial,
  );
  dome.renderOrder = -3;
  root.add(dome);
  const rainCount = 1800,
    p = new Float32Array(rainCount * 6);
  for (let i = 0; i < rainCount; i++)
    for (let end = 0; end < 2; end++) {
      const n = i * 6 + end * 3;
      p[n] = ((i * 17.73) % 160) - 80 + end * 0.18;
      p[n + 1] = ((i * 7.31) % 95) - end * 1.7;
      p[n + 2] = ((i * 21.27) % 160) - 80;
    }
  const rainGeometry = keep(new THREE.BufferGeometry());
  rainGeometry.setAttribute("position", new THREE.BufferAttribute(p, 3));
  const rainMaterial = keep(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: time },
      vertexShader: `uniform float uTime;varying float fade;void main(){vec3 p=position;p.y=mod(p.y-uTime*48.0,95.0);p.x+=sin(uTime*.2)*p.y*.1;vec4 view=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*view;gl_PointSize=clamp(120.0/-view.z,1.0,3.0);fade=.32;}`,
      fragmentShader:
        "varying float fade;void main(){gl_FragColor=vec4(.68,.79,.81,fade*.7);}",
    }),
  );
  const rain = new THREE.LineSegments(rainGeometry, rainMaterial);
  rain.frustumCulled = false;
  root.add(rain);
  const mist = keep(createFluidTexture("mist")),
    spouts = [];
  for (const [i, anchor] of [
    [-235, -410],
    [115, -715],
    [-125, -280],
    [230, -350],
    [45, -500],
    [-235, -885],
    [210, -1010],
  ].entries()) {
    const group = new THREE.Group();
    group.name = `bermuda_waterspout_${i}`;
    root.add(group);
    const geo = keep(new THREE.CylinderGeometry(25, 7, 138, 48, 20, true));
    const v = geo.attributes.position;
    for (let j = 0; j < v.count; j++) {
      const y = v.getY(j),
        twist = (y + 69) * 0.016;
      const x = v.getX(j),
        z = v.getZ(j);
      v.setXYZ(
        j,
        x * Math.cos(twist) - z * Math.sin(twist) + Math.sin(y * 0.035) * 5,
        y + 69,
        x * Math.sin(twist) + z * Math.cos(twist),
      );
    }
    geo.computeVertexNormals();
    const material = keep(
      new THREE.MeshStandardMaterial({
        color: 0x91a6aa,
        map: mist,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
        roughness: 1,
      }),
    );
    material.onBeforeCompile = (shader) => {
      shader.uniforms.spoutTime = time;
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform float spoutTime;",
        )
        .replace(
          "#include <map_fragment>",
          `vec2 flow=vMapUv;float bands=sin(flow.x*60.0+flow.y*38.0-spoutTime*5.0)*.5+.5;vec4 tex=texture2D(map,vec2(fract(flow.x*3.0+spoutTime*.12),fract(flow.y*2.0-spoutTime*.10)));diffuseColor.rgb*=mix(.75,1.2,bands);diffuseColor.a*=.35+.5*tex.a+.15*bands;`,
        );
    };
    material.customProgramCacheKey = () => "bermuda_swirl_v2";
    const funnel = new THREE.Mesh(geo, material);
    group.add(funnel);
    const inner = new THREE.Mesh(geo, material);
    inner.scale.set(0.72, 1.03, 0.72);
    inner.rotation.y = 1.1;
    group.add(inner);
    const skirt = new THREE.Mesh(
      keep(new THREE.TorusGeometry(11, 3.3, 8, 40)),
      material,
    );
    skirt.rotation.x = Math.PI / 2;
    skirt.position.y = 1;
    group.add(skirt);
    spouts.push({
      group,
      funnel,
      inner,
      skirt,
      anchor,
      x: anchor[0],
      z: anchor[1],
      radius: 10,
      phase: i * 1.7,
    });
  }
  const lightningPositions = new Float32Array(16 * 3);
  for (let i = 0; i < 16; i++) {
    lightningPositions[i * 3] = 190 + (i % 2 ? 4 : -3) + Math.sin(i * 1.7) * 10;
    lightningPositions[i * 3 + 1] = 160 - i * 10;
    lightningPositions[i * 3 + 2] = -430;
  }
  const boltGeometry = keep(new THREE.BufferGeometry());
  boltGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(lightningPositions, 3),
  );
  const boltMaterial = keep(
    new THREE.LineBasicMaterial({
      color: 0xdceaff,
      transparent: true,
      opacity: 0,
      fog: false,
    }),
  );
  const bolt = new THREE.Line(boltGeometry, boltMaterial);
  root.add(bolt);
  function update(
    elapsed,
    position,
    dt = 0,
    highQuality = true,
    cameraPosition = position,
    reducedMotion = false,
  ) {
    if (disposed) return;
    time.value = elapsed;
    dome.position.set(position.x, 0, position.z);
    dome.visible = cameraPosition.y > WORLD.surfaceY;
    rain.position.set(cameraPosition.x, cameraPosition.y - 8, cameraPosition.z);
    rain.visible = cameraPosition.y > WORLD.surfaceY;
    rainGeometry.setDrawRange(0, highQuality ? rainCount * 2 : 650 * 2);
    const cycle = Math.floor(elapsed / 17),
      phase = elapsed % 17;
    flash.value = reducedMotion
      ? 0
      : phase < 0.1
        ? (0.1 - phase) * 3
        : phase > 0.22 && phase < 0.3
          ? (0.3 - phase) * 2
          : 0;
    boltMaterial.opacity = flash.value * 2;
    bolt.visible = cameraPosition.y > WORLD.surfaceY && flash.value > 0;
    if (phase > 0.8 && cycle !== lastThunder) {
      lastThunder = cycle;
      if (cameraPosition.y > -50)
        audio?.thunder?.(cameraPosition.y > 4 ? 1 : 0.35);
    }
    for (const spout of spouts) {
      spout.x = spout.anchor[0] + Math.sin(elapsed * 0.014 + spout.phase) * 12;
      spout.z = spout.anchor[1] + Math.cos(elapsed * 0.017 + spout.phase) * 10;
      spout.group.position.set(spout.x, 4, spout.z);
      spout.funnel.rotation.y = elapsed * 0.9;
      spout.inner.rotation.y = -elapsed * 1.3;
      spout.skirt.rotation.z = elapsed * 0.6;
      spout.group.visible =
        cameraPosition.y > -45 ||
        spout.group.position.distanceTo(position) < 140;
    }
  }
  function onMovement(
    player,
    previous,
    position,
    forward,
    { now = 0, dt = 0, airborne = false } = {},
  ) {
    const result = stepWaterspout(
      state,
      player,
      previous,
      position,
      spouts,
      now,
    );
    if (result.hit) {
      notify?.("龙卷水柱 · 正在被卷起，落水后迅速下潜", 3);
      audio?.hit?.();
      if (result.damaged) onDamage?.();
    }
    if (!result.lifting || airborne) return null;
    const dx = position.x - state.source.x,
      dz = position.z - state.source.z,
      l = Math.max(1, Math.hypot(dx, dz));
    position.x += (-dz / l) * 12 * dt;
    position.z += (dx / l) * 12 * dt;
    position.y += BERMUDA_HAZARDS.liftSpeed * dt;
    if (
      position.y >= WORLD.surfaceY - player.length * 0.15 - 0.15 &&
      !state.launched
    ) {
      state.launched = true;
      return {
        x: (-dz / l) * 16,
        y: BERMUDA_HAZARDS.launchSpeed,
        z: (dx / l) * 16,
      };
    }
    return null;
  }
  function reset() {
    state = createWaterspoutState();
    lastThunder = -1;
    flash.value = 0;
  }
  return {
    root,
    spouts,
    update,
    onMovement,
    reset,
    get flash() {
      return flash.value;
    },
    get lifted() {
      return state.liftUntil > time.value;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      for (const r of resources) r.dispose();
      resources.clear();
      root.clear();
    },
  };
}
