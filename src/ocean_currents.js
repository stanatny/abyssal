import * as T from "three";
import { createMaterialPreparation } from "./material_loading.js";
import {
  oceanCurrentRoutes,
  createOceanCurrentState,
  OCEAN_CURRENT_RULES as R,
} from "./ocean_current_rules.js";

const FLOW_TEXTURE = new URL(
  "./assets/textures/ocean_current_hf_flow.webp",
  import.meta.url,
);
const TRAILS = 180;

// 真实 HF 水纹用于稀疏的流体薄层；微泡的亮头与拖尾沿同一世界速度场运动。
export function attachOceanCurrents(ocean, regionId) {
  const routes = oceanCurrentRoutes(regionId);
  if (!routes.length) return ocean;
  const root = new T.Group();
  root.name = "surface_current_lanes";
  ocean.root.add(root);
  const resources = new Set(),
    keep = (v) => (resources.add(v), v);
  const empty = keep(new T.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1));
  empty.needsUpdate = true;
  const texture = { value: empty },
    ready = { value: 0 };
  const prepare = createMaterialPreparation(
    [
      {
        name: "flow",
        url: FLOW_TEXTURE,
        colorSpace: T.NoColorSpace,
        apply(t) {
          t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
          texture.value = t;
        },
      },
    ],
    (success) => {
      ready.value = success ? 1 : 0;
    },
  );
  prepare({ priority: 1 });
  const flow = createOceanCurrentState(routes);
  const views = routes.map((route) => {
    const positions = [],
      uv = [],
      phases = [],
      indices = [];
    // 六片不规则水层围成可穿行的流带，不再绕成规则螺旋弹簧。
    for (let sheet = 0; sheet < 6; sheet++) {
      for (let i = 0; i <= 192; i++) {
        const u = i / 192,
          q = u * 128,
          a = Math.min(127, Math.floor(q)),
          f = q - a;
        const p = new T.Vector3().lerpVectors(
          route.points[a],
          route.points[a + 1],
          f,
        );
        const tangent = new T.Vector3()
          .subVectors(route.points[a + 1], route.points[a])
          .normalize();
        const side = new T.Vector3(-tangent.z, 0, tangent.x);
        const angle =
          (sheet * Math.PI) / 3 + Math.sin(u * 24 + sheet * 2) * 0.13;
        const radius = R.radius * (0.78 + 0.08 * Math.sin(u * 38 + sheet));
        for (const edge of [-1, 1]) {
          const theta = angle + edge * 0.36;
          positions.push(
            p.x + side.x * Math.cos(theta) * radius,
            p.y + Math.sin(theta) * radius,
            p.z + side.z * Math.cos(theta) * radius,
          );
          uv.push(u, (edge + 1) / 2);
          phases.push(sheet * 0.173);
        }
        if (i < 192) {
          const j = sheet * 386 + i * 2;
          indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
        }
      }
    }
    const geometry = keep(new T.BufferGeometry());
    geometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    geometry.setAttribute(
      "sheetPhase",
      new T.Float32BufferAttribute(phases, 1),
    );
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    const uniforms = {
      flowMap: texture,
      ready,
      time: { value: 0 },
      opacity: { value: 0 },
      routeLength: { value: route.length },
      fogDensity: { value: 0.009 },
      color: { value: new T.Color(route.inbound ? 0xa7d6c9 : 0x9bccdc) },
    };
    const material = keep(
      new T.ShaderMaterial({
        uniforms,
        vertexShader: `attribute float sheetPhase;varying float vPhase;varying vec2 vUv;varying float depth;void main(){vPhase=sheetPhase;vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);depth=-mv.z;gl_Position=projectionMatrix*mv;}`,
        fragmentShader: `uniform sampler2D flowMap;uniform float ready,time,opacity,routeLength,fogDensity;uniform vec3 color;varying vec2 vUv;varying float depth;varying float vPhase;
      float strip(float u,float y){float x=fract(u);vec3 t=texture2D(flowMap,vec2(x,y)).rgb;return max(t.r,max(t.g,t.b))*smoothstep(0.,.16,x)*(1.-smoothstep(.84,1.,x));}
      void main(){float s=vUv.x*routeLength;float u=(s-time*72.)/95.+vPhase;float y=.19+vUv.y*.62;float tex=strip(u,y)+strip(u+.5,y);float rim=pow(max(0.,sin(vUv.y*3.14159265)),1.4);float ends=smoothstep(0.,30.,s)*(1.-smoothstep(routeLength-55.,routeLength,s));float breakup=.7+.3*sin(s*.11+vUv.y*19.-time*.7);float a=opacity*ready*tex*rim*ends*breakup*.20*smoothstep(1.,9.,depth); a*=exp(-fogDensity*fogDensity*depth*depth);if(a<.006)discard;gl_FragColor=vec4(color,a);}`,
        transparent: true,
        depthWrite: false,
        side: T.DoubleSide,
        blending: T.AdditiveBlending,
      }),
    );
    const mesh = new T.Mesh(geometry, material);
    mesh.name = "hf_current_wisps";
    root.add(mesh);
    const trailGeometry = keep(new T.InstancedBufferGeometry());
    trailGeometry.setAttribute(
      "position",
      new T.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 0, 1, 0, 1, 1, 0], 3),
    );
    trailGeometry.setAttribute(
      "uv",
      new T.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2),
    );
    trailGeometry.setIndex([0, 1, 2, 1, 3, 2]);
    const centers = new Float32Array(TRAILS * 3),
      axes = new Float32Array(TRAILS * 3),
      sizes = new Float32Array(TRAILS * 2);
    for (let i = 0; i < TRAILS; i++) {
      sizes[i * 2] = 4 + (i % 7) * 1.2;
      sizes[i * 2 + 1] = 0.08 + (i % 4) * 0.025;
    }
    trailGeometry.setAttribute(
      "center",
      new T.InstancedBufferAttribute(centers, 3).setUsage(T.DynamicDrawUsage),
    );
    trailGeometry.setAttribute(
      "axis",
      new T.InstancedBufferAttribute(axes, 3).setUsage(T.DynamicDrawUsage),
    );
    trailGeometry.setAttribute(
      "trailSize",
      new T.InstancedBufferAttribute(sizes, 2),
    );
    trailGeometry.instanceCount = TRAILS;
    const trailMaterial = keep(
      new T.ShaderMaterial({
        uniforms: {
          opacity: uniforms.opacity,
          fogDensity: uniforms.fogDensity,
          color: uniforms.color,
        },
        vertexShader: `attribute vec3 center,axis;attribute vec2 trailSize;varying vec2 vUv;varying float depth;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(center,1.);vec3 d=normalize(mat3(modelViewMatrix)*axis);vec2 side=vec2(-d.y,d.x);float l=length(side);side=l>.02?side/l:vec2(1.,0.);mv.xyz+=d*((uv.x-1.)*trailSize.x);mv.xy+=side*position.y*trailSize.y;depth=-mv.z;gl_Position=projectionMatrix*mv;}`,
        fragmentShader: `uniform float opacity,fogDensity;uniform vec3 color;varying vec2 vUv;varying float depth;void main(){float crossDistance=(vUv.y-.5)*4.;float headDistance=(vUv.x-.94)*25.;float across=exp(-crossDistance*crossDistance);float tail=pow(max(0.,vUv.x),2.2)*.38;float head=exp(-headDistance*headDistance);float a=(tail+head*.5)*across*opacity*exp(-fogDensity*fogDensity*depth*depth);if(a<.008)discard;gl_FragColor=vec4(color,a);}`,
        transparent: true,
        depthWrite: false,
        side: T.DoubleSide,
        blending: T.AdditiveBlending,
      }),
    );
    const trails = new T.Mesh(trailGeometry, trailMaterial);
    trails.name = "downstream_microbubble_trails";
    trails.frustumCulled = false;
    root.add(trails);
    return { route, material, trailGeometry, centers, axes };
  });
  const baseUpdate = ocean.update.bind(ocean),
    baseReset = ocean.reset?.bind(ocean),
    baseDispose = ocean.dispose.bind(ocean);
  let disposed = false;
  ocean.currents = {
    ...flow,
    routes,
    prepare,
    reset() {
      flow.reset();
      root.visible = false;
    },
  };
  ocean.update = (time, position, dt, highQuality, camera, reducedMotion) => {
    baseUpdate(time, position, dt, highQuality, camera, reducedMotion);
    root.visible = flow.state.opacity > 0;
    if (!root.visible) return;
    for (const v of views) {
      v.material.uniforms.opacity.value =
        flow.state.opacity * (reducedMotion ? 0.7 : 1);
      v.material.uniforms.fogDensity.value =
        ocean.root.parent?.fog?.density ?? 0.009;
      // 减弱动态仅降低粒子密度与亮度，不反转/放慢标示真实流向的水纹。
      v.material.uniforms.time.value = flow.state.time;
      v.trailGeometry.instanceCount = reducedMotion ? 90 : TRAILS;
      for (let i = 0; i < TRAILS; i++) {
        const u =
            (i / TRAILS + (flow.state.time * R.flowSpeed) / v.route.length) % 1,
          q = u * 128,
          j = Math.min(127, Math.floor(q)),
          f = q - j;
        const a = v.route.points[j],
          b = v.route.points[j + 1],
          dx = b.x - a.x,
          dz = b.z - a.z,
          l = Math.hypot(dx, dz);
        const angle = i * 2.399963 + 0.07 * Math.sin(flow.state.time * 0.9 + i),
          rad = 3.5 + (i % 9) * 0.92;
        v.centers[i * 3] = a.x + dx * f - (dz / l) * Math.cos(angle) * rad;
        v.centers[i * 3 + 1] = a.y + Math.sin(angle) * rad;
        v.centers[i * 3 + 2] = a.z + dz * f + (dx / l) * Math.cos(angle) * rad;
        v.axes[i * 3] = dx / l;
        v.axes[i * 3 + 1] = 0;
        v.axes[i * 3 + 2] = dz / l;
      }
      v.trailGeometry.attributes.center.needsUpdate = true;
      v.trailGeometry.attributes.axis.needsUpdate = true;
    }
  };
  ocean.reset = () => {
    baseReset?.();
    flow.reset();
    root.visible = false;
  };
  ocean.dispose = () => {
    if (disposed) return;
    disposed = true;
    prepare.dispose();
    root.removeFromParent();
    for (const r of resources) r.dispose();
    baseDispose();
  };
  root.visible = false;
  return ocean;
}
