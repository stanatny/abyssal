import * as THREE from "three";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";
import { addSurfaceDetail } from "./ocean_visuals.js";
import { finishScenePreparation } from "./scene_preparation.js";

import {
  finishTroyStone,
  createTroyCoastalRubble,
} from "./odyssey_coast_finish.js";
import {
  troyTerraceBend,
  TROY_COAST_ORIGIN,
  TROY_COAST_SCALE,
} from "./odyssey_coast_layout.js";
export {
  TROY_COAST_ORIGIN,
  troyTerraceHeight,
} from "./odyssey_coast_layout.js";

function* masonrySteps(keep) {
  const pieces = [],
    color = new THREE.Color();
  function block(x, y, z, w, h, d, i) {
    const cut = 0.18 + 0.23 * (0.5 + 0.5 * Math.sin(i * 4.13));
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + cut, -h / 2);
    shape.lineTo(w / 2 - cut, -h / 2);
    shape.lineTo(w / 2, -h / 2 + cut);
    shape.lineTo(w / 2, h / 2 - cut);
    shape.lineTo(w / 2 - cut, h / 2);
    shape.lineTo(-w / 2 + cut, h / 2);
    shape.lineTo(-w / 2, h / 2 - cut);
    shape.lineTo(-w / 2, -h / 2 + cut);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: d - 0.18,
      steps: 1,
      bevelEnabled: true,
      bevelSize: 0.09,
      bevelThickness: 0.09,
      bevelSegments: 1,
      curveSegments: 1,
    });
    g.translate(0, 0, -d / 2 + 0.09);
    g.rotateY(Math.sin(i * 1.83) * 0.025);
    g.rotateZ(Math.sin(i * 2.7) * 0.012);
    g.translate(x, y, z);
    const colors = new Float32Array(g.attributes.position.count * 3);
    color.set(0xb9a47e).multiplyScalar(0.64 + (Math.sin(i * 2.37) + 1) * 0.18);
    for (let k = 0; k < g.attributes.position.count; k++)
      color.toArray(colors, k * 3);
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    // 每块独立焊接，避免最后对全部砌块执行一次长时间的哈希去重。
    g.deleteAttribute("uv");
    pieces.push(mergeVertices(g));
    g.dispose();
  }
  try {
    // 保留中央木马广场的开阔视线，挡土墙不盖住木马或生成假入口。
    let index = 0;
    for (const [z, level] of [
      [33, 30],
      [-37, 58],
      [-107, 86],
    ])
      for (let row = 0; row < (level === 30 ? 5 : 8); row++) {
        for (let j = -15; j <= 15; j++) {
          if (row === 0 && (j + 19) % 7 === 0) continue;
          const wallX = j * 10 + (row % 2) * 4.7;
          block(
            wallX,
            level - 1.8 - row * 3.5 + Math.sin(j * 1.9) * 0.15,
            z + troyTerraceBend(wallX),
            9.5 + 0.25 * Math.sin(j * 2.8),
            3.25,
            4.5,
            index++,
          );
        }
        yield "troy-masonry-row";
      }
    // 海岸矮挡墙和完整的轮子支撑台面。
    for (let j = -16; j <= 16; j++)
      if (Math.abs(j) > 4) block(j * 9.5, 10.5, 92, 9.25, 6.5, 5, index++);
    // 广场直接使用权威地表，避免叠放同高顶面导致远近视角闪烁。
    for (const [x, z, h] of [
      [-92, 101, 9],
      [69, 102, 8],
      [126, 99, 7],
    ])
      block(x, -4, z, h * 3.3, 8, h * 1.3, index++);
    const g = keep(mergeGeometries(pieces));
    const m = keep(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.96,
        fog: false,
      }),
    );
    addSurfaceDetail(m, "stone", 0.35);
    finishTroyStone(m);
    const mesh = new THREE.Mesh(g, m);
    mesh.name = "troy_masonry_and_plaza";
    return mesh;
  } finally {
    // 构造取消也回收尚未交给地图的临时砌块。
    pieces.forEach((p) => p.dispose());
  }
}

function createEmbers(keep) {
  const group = new THREE.Group();
  group.name = "troy_bounded_embers";
  const geometry = keep(new THREE.PlaneGeometry(1, 1));
  const time = { value: 0 };
  const vertex = `attribute float coastSeed; varying vec2 vUv; varying float vSeed; varying float vAge; uniform float coastTime; uniform float smoke;
    void main(){vUv=uv;vSeed=coastSeed;vAge=fract(coastTime*.065+coastSeed);
    vec4 center=instanceMatrix*vec4(0.,0.,0.,1.);
    float sx=length(instanceMatrix[0].xyz),sy=length(instanceMatrix[1].xyz);
    if(smoke>.5){center.x-=vAge*23.;center.y+=vAge*44.;center.z-=vAge*7.;sx*=.65+vAge;sy*=.65+vAge;}
    vec4 mv=modelViewMatrix*center;mv.xy+=position.xy*vec2(sx,sy);gl_Position=projectionMatrix*mv;}`;
  const noise = `float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}`;
  function effect(smoke, count) {
    const g = keep(geometry.clone());
    g.setAttribute(
      "coastSeed",
      new THREE.InstancedBufferAttribute(
        Float32Array.from({ length: count }, (_, i) => (i * 0.6180339) % 1),
        1,
      ),
    );
    const m = keep(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        blending: smoke ? THREE.NormalBlending : THREE.AdditiveBlending,
        uniforms: { coastTime: time, smoke: { value: smoke ? 1 : 0 } },
        vertexShader: vertex,
        fragmentShader: `varying vec2 vUv;varying float vSeed;varying float vAge;uniform float coastTime;${noise}
      void main(){vec2 uv=vUv;float alpha;vec3 color;
      ${
        smoke
          ? `vec2 q=(uv-.5)*2.;float n=noise(uv*5.+vSeed*14.+coastTime*.035);
      float shape=1.-smoothstep(.35,1.,length(q)+.22*(n-.5));alpha=shape*.17*smoothstep(0.,.12,vAge)*(1.-smoothstep(.68,1.,vAge));color=mix(vec3(.17,.16,.14),vec3(.31,.29,.25),n);`
          : `float n=noise(vec2(uv.x*7.+vSeed*14.,uv.y*6.-coastTime*1.4));
      float width=(1.-uv.y)*.43+.025;float axis=.5+.11*sin(uv.y*11.-coastTime*2.7+vSeed*9.);
      float edge=abs(uv.x-axis)/width;alpha=(1.-smoothstep(.5,1.,edge))*(1.-smoothstep(.5,.98,uv.y+n*.24))*smoothstep(0.,.08,uv.y);
      alpha*=smoothstep(.16,.63,n)*(.6+.12*sin(coastTime*2.+vSeed*9.));color=mix(vec3(.8,.035,.002),vec3(1.3,.36,.025),(1.-uv.y)*.6+(1.-edge)*.25);`
      }
      if(alpha<.003)discard;gl_FragColor=vec4(color,alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
      }),
    );
    const mesh = new THREE.InstancedMesh(g, m, count);
    mesh.frustumCulled = false;
    mesh.renderOrder = smoke ? 4 : 3;
    group.add(mesh);
    return mesh;
  }
  const fire = effect(false, 6),
    smoke = effect(true, 24),
    dummy = new THREE.Object3D();
  const sites = [
    [-115, 47, -5],
    [-40, 49, -5],
    [92, 48, -5],
    [-82, 76, -72],
    [52, 79, -72],
    [0, 110, -143],
  ];
  sites.forEach(([x, y, z], i) => {
    dummy.position.set(x, y + 6, z);
    dummy.scale.set(16 + (i % 3) * 3, 15 + (i % 2) * 3, 1);
    dummy.updateMatrix();
    fire.setMatrixAt(i, dummy.matrix);
  });
  for (let i = 0; i < 24; i++) {
    const site = sites[[0, 3, 5][i % 3]];
    dummy.position.set(site[0], site[1] + 11, site[2]);
    dummy.scale.set(29, 35, 1);
    dummy.updateMatrix();
    smoke.setMatrixAt(i, dummy.matrix);
  }
  fire.instanceMatrix.needsUpdate = true;
  smoke.instanceMatrix.needsUpdate = true;
  return { group, time, smoke };
}

/** 同一海域循环持有远岸，只有接近浅海时异步准备实体，不阻塞首次潜水。 */
export function createOdysseyCoast(parent, keep, options) {
  return finishScenePreparation(createOdysseyCoastSteps(parent, keep, options));
}

/** 同步与预算加载共用同一砌块顺序；资源仍归所属地图构造事务。 */
export function* createOdysseyCoastSteps(
  parent,
  keep,
  { loadAssets = () => import("./odyssey_coast_asset.js") } = {},
) {
  const root = new THREE.Group();
  root.name = "odyssey_troy_shore_of_embers";
  root.position.set(...TROY_COAST_ORIGIN);
  root.rotation.y = Math.PI / 2;
  root.scale.setScalar(TROY_COAST_SCALE);
  parent.add(root);
  root.add(yield* masonrySteps(keep));
  // 静态接地阴影不启用全场实时阴影；柔边和深度偏移避免远景方块或共面闪烁。
  const shadowMaterial = keep(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec2 vUv;void main(){float a=(1.-smoothstep(.35,1.,length((vUv-.5)*2.)))*.27;if(a<.003)discard;gl_FragColor=vec4(.04,.033,.02,a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
    }),
  );
  const contactShadow = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(67, 35)),
    shadowMaterial,
  );
  contactShadow.name = "troy_horse_contact_shadow";
  contactShadow.rotation.set(-Math.PI / 2, 0, -0.25);
  contactShadow.position.set(0, 14.035, 67);
  root.add(contactShadow);
  const ember = createEmbers(keep);
  root.add(ember.group);
  let disposed = false,
    promise = null,
    lastAttempt = -Infinity;
  root.userData.coast = { state: "idle", assets: null, instances: [] };
  const state = root.userData.coast;
  function add(asset, x, y, z, height, yaw = 0, name = "") {
    const mesh = new THREE.Mesh(asset.geometry, asset.material);
    mesh.name = name;
    mesh.scale.setScalar(height);
    mesh.position.set(x, y, z);
    mesh.rotation.y = yaw;
    root.add(mesh);
    state.instances.push(mesh);
    return mesh;
  }
  function prepare(t = 0) {
    if (disposed || promise || state.state === "ready" || t - lastAttempt < 5)
      return promise;
    lastAttempt = t;
    state.state = "loading";
    promise = loadAssets()
      .then((module) => {
        if (disposed) return;
        const assets = module.createOdysseyCoastAssets(keep);
        state.assets = assets;
        root.add(createTroyCoastalRubble(assets.coastal_rock));
        add(assets.trojan_horse, 0, 14, 67, 59, -0.25, "troy_trojan_horse");
        add(assets.troy_gate, -72, 14, 61, 26, 0, "troy_breached_gate");
        add(assets.troy_gate, 102, 14, 62, 23, 0, "troy_outer_gate_ruin");
        for (const [row, z, y, count] of [
          [0, -7, 30, 6],
          [1, -75, 58, 5],
          [2, -145, 86, 3],
        ])
          for (let i = 0; i < count; i++) {
            const x = (i - (count - 1) / 2) * (row === 2 ? 54 : 51);
            add(
              assets.troy_houses,
              x,
              y,
              z,
              19 + (i % 3) * 2 + (row === 2 ? 5 : 0),
              i % 2 ? 0.12 : -0.1,
              `troy_district_${row}_${i}`,
            );
          }
        for (const [x, z, h, yaw] of [
          [-92, 101, 9, 0],
          [69, 102, 8, 0.15],
          [126, 99, 7, -0.15],
        ])
          add(assets.troy_quay, x, 0, z, h, yaw, "troy_broken_quay");
        // 重复城门、城区和码头共享几何并实例化，避免远岸增加二十次提交。
        for (const asset of [
          assets.troy_gate,
          assets.troy_houses,
          assets.troy_quay,
        ]) {
          const meshes = state.instances.filter(
            (mesh) => mesh.geometry === asset.geometry,
          );
          const batch = new THREE.InstancedMesh(
            asset.geometry,
            asset.material,
            meshes.length,
          );
          batch.name = meshes[0].name + "_instances";
          meshes.forEach((mesh, i) => {
            mesh.updateMatrix();
            batch.setMatrixAt(i, mesh.matrix);
            root.remove(mesh);
          });
          batch.instanceMatrix.needsUpdate = true;
          batch.computeBoundingBox();
          batch.computeBoundingSphere();
          root.add(batch);
        }
        state.state = "ready";
      })
      .catch(() => {
        if (!disposed) state.state = "error";
      })
      .finally(() => {
        promise = null;
      });
    return promise;
  }
  keep({
    dispose() {
      disposed = true;
      root.removeFromParent();
      state.assets = null;
      state.instances.length = 0;
    },
  });
  return {
    root,
    prepare,
    state,
    update(t, position, camera, highQuality = true, aboveWater = true) {
      if (disposed) return;
      if (position.z > -300 && position.y > -70) prepare(t);
      const visible = aboveWater && camera.z > -550;
      root.visible = visible;
      ember.group.visible = visible && state.state === "ready";
      if (visible) {
        ember.time.value = t;
        ember.smoke.count = highQuality ? 24 : 12;
      }
    },
  };
}
