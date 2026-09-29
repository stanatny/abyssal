import * as THREE from "three";
import { WORLD } from "./world_config.js";
import { seabedHeight } from "./ocean.js";
import { createAtlantisCity } from "./atlantis_city.js";
import { createAtlantisOutskirts } from "./atlantis_outskirts.js";
import {
  addLeafDetail,
  addSurfaceDetail,
  clusterInstances,
  coralBranchGeometry,
  moundCoralGeometry,
  ribbonGeometry,
  seaFanGeometry,
  smoothCoincidentNormals,
} from "./ocean_visuals.js";

/**
 * 创建亚特兰蒂斯海床、育幼礁与月光海面，城市使用独立美术模块。
 * @param {THREE.Scene} scene 世界场景，不改变全局光照或共享地形高度。
 * @returns {object} root、实体与地标，以及update(time,position,dt,highQuality)、dispose。
 */
export function createAtlantisOcean(scene) {
  const root = new THREE.Group();
  root.name = "ocean_environment";
  scene.add(root);
  const resources = new Set();
  const keep = (resource) => (resources.add(resource), resource);
  const time = { value: 0 };
  const random = randomSource(41739);
  const colliders = [];
  const obstacles = [];
  let disposed = false;

  root.add(createSeabed(keep, time));
  root.add(createMoonlitWater(keep, time));
  createOutskirts(root, keep, random, colliders, obstacles);
  const nursery = createNursery(root, keep, time, random);
  const city = createAtlantisCity(root, { heightAt: seabedHeight });
  colliders.push(...city.colliders);
  obstacles.push(...city.obstacles);
  const outskirts = createAtlantisOutskirts(root, {
    heightAt: seabedHeight,
    occupiedColliders: colliders,
  });
  colliders.push(...outskirts.colliders);
  obstacles.push(...outskirts.obstacles);

  return {
    root,
    city,
    outskirts,
    colliders,
    obstacles,
    landmarks: city.landmarks,
    update(elapsed, position, dt = 0, highQuality = true) {
      if (disposed) return;
      time.value = elapsed;
      nursery.visible = position.z > -390;
      city.update(elapsed, dt, position, highQuality);
      outskirts.update(elapsed, position, dt, highQuality);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      outskirts.dispose();
      city.dispose();
      root.removeFromParent();
      root.traverse((node) => {
        if (node.isInstancedMesh) node.dispose();
      });
      for (const resource of resources) resource.dispose();
      resources.clear();
      colliders.length = 0;
      obstacles.length = 0;
      root.clear();
    },
  };
}

/** 珍珠沙、冷色岩层与城基石灰岩共用真实海床，视觉起伏不另造碰撞地形。 */
function createSeabed(keep, time) {
  const geometry = keep(
    new THREE.PlaneGeometry(
      WORLD.maxX - WORLD.minX + 120,
      WORLD.maxZ - WORLD.minZ + 120,
      144,
      282,
    ),
  );
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, (WORLD.minZ + WORLD.maxZ - 120) * 0.5);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const pearl = new THREE.Color("#bbc8c6");
  const slate = new THREE.Color("#687b84");
  const abyss = new THREE.Color("#2d414e");
  const marble = new THREE.Color("#7d989b");
  const color = new THREE.Color();
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const y = seabedHeight(x, z);
    positions.setY(index, y);
    const shelf = THREE.MathUtils.smoothstep(-z, 75, 390);
    const deep = THREE.MathUtils.smoothstep(-z, 420, 1080);
    color.copy(pearl).lerp(slate, shelf).lerp(abyss, deep);
    const cityDistance = Math.max(Math.abs(x) / 280, Math.abs(z + 590) / 500);
    const cityStone = 1 - THREE.MathUtils.smoothstep(cityDistance, 0.45, 1.2);
    color.lerp(marble, cityStone * 0.52);
    color.multiplyScalar(0.94 + Math.sin(x * 0.042 + z * 0.061) * 0.045);
    color.toArray(colors, index * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = keep(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.89,
      metalness: 0.035,
    }),
  );
  addSurfaceDetail(material, "stone", 0.22);
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.atlantisTime = time;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float atlantisTime;",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec2 sandPoint = vSurfaceDetail.xz;
        float sandNear = 1.0 - smoothstep(0.4, 2.4, max(length(dFdx(sandPoint)), length(dFdy(sandPoint))));
        float shallow = 1.0 - smoothstep(45.0, 105.0, -vSurfaceDetail.y);
        float ripples = sin(sandPoint.x * 2.1 + sin(sandPoint.y * 0.17) * 2.7);
        diffuseColor.rgb *= 1.0 + ripples * shallow * sandNear * 0.028;
        float gleamA = sin(sandPoint.x * 0.75 + sin(sandPoint.y * 0.48) + atlantisTime * 0.19);
        float gleamB = cos(sandPoint.y * 0.83 + cos(sandPoint.x * 0.55) - atlantisTime * 0.14);
        float moonCaustic = pow(max(0.0, 1.0 - abs(gleamA + gleamB)), 16.0);
        diffuseColor.rgb += vec3(0.11, 0.17, 0.23) * moonCaustic * shallow * sandNear * 0.2;`,
      );
  };
  material.customProgramCacheKey = () => "atlantis_pearl_slate_seabed_v1";
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "atlantis_pearl_slate_seabed";
  mesh.receiveShadow = true;
  return mesh;
}

/** 外围岩群采用有侵蚀细节的共享几何，城市与中央下潜通道不放随机巨石。 */
function createOutskirts(root, keep, random, colliders, obstacles) {
  const geometry = keep(new THREE.IcosahedronGeometry(1, 2));
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let index = 0; index < positions.count; index++) {
    vertex.fromBufferAttribute(positions, index);
    const erosion =
      Math.sin(vertex.x * 5.8 + vertex.y * 3.2) *
        Math.cos(vertex.z * 5.4 - vertex.y * 2.7) *
        0.17 +
      Math.sin(vertex.z * 11.2 + vertex.x * 7.1) * 0.055;
    vertex.multiplyScalar(1 + erosion);
    positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
  geometry.computeVertexNormals();
  smoothCoincidentNormals(geometry);
  geometry.computeBoundingSphere();
  const envelope =
    geometry.boundingSphere.radius + geometry.boundingSphere.center.length();
  const material = keep(
    new THREE.MeshStandardMaterial({ color: "#849797", roughness: 0.93 }),
  );
  addSurfaceDetail(material, "stone", 0.85);
  const rocks = new THREE.InstancedMesh(geometry, material, 64);
  rocks.name = "atlantis_outcrop";
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let index = 0; index < rocks.count; index++) {
    const shallow = index < 28;
    const x =
      (index % 2 ? 1 : -1) *
      (shallow ? 46 + random() * 63 : 285 + random() * 8);
    const z = shallow ? 126 - random() * 215 : -260 - random() * 870;
    const size = shallow ? 2.2 + random() * 3.5 : 5.5 + random() * 10;
    dummy.position.set(x, seabedHeight(x, z) + size * 0.2, z);
    dummy.rotation.set(
      (random() - 0.5) * 0.5,
      random() * Math.PI,
      (random() - 0.5) * 0.45,
    );
    dummy.scale.set(
      size * (0.9 + random() * 0.35),
      size * (0.6 + random() * 0.85),
      size,
    );
    dummy.updateMatrix();
    rocks.setMatrixAt(index, dummy.matrix);
    color
      .set(shallow ? "#9baaa2" : "#718087")
      .multiplyScalar(0.8 + random() * 0.3);
    rocks.setColorAt(index, color);
    const collider = {
      type: "ellipsoid",
      kind: "atlantis_reef",
      x,
      y: dummy.position.y,
      z,
      axes: {
        x: dummy.scale.x * envelope,
        y: dummy.scale.y * envelope,
        z: dummy.scale.z * envelope,
      },
      rotation: {
        x: dummy.quaternion.x,
        y: dummy.quaternion.y,
        z: dummy.quaternion.z,
        w: dummy.quaternion.w,
      },
    };
    colliders.push(collider);
    obstacles.push({
      x,
      y: collider.y,
      z,
      radius: Math.max(collider.axes.x, collider.axes.z),
    });
  }
  const clusters = clusterInstances(rocks, 120);
  clusters.traverse((node) => {
    if (node.isMesh) node.receiveShadow = true;
  });
  root.add(clusters);
}

/** 海扇、珊瑚与海草组成克制的月下礁园，按空间分批保留近景结构与远景裁剪。 */
function createNursery(root, keep, time, random) {
  const nursery = new THREE.Group();
  nursery.name = "atlantis_nursery_garden";
  root.add(nursery);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const palette = ["#b7b8c7", "#7ba6b4", "#c1a1ae", "#bdb9a2", "#83b1aa"];
  const addGroundCover = (geometry, material, count, name, placement) => {
    const mesh = new THREE.InstancedMesh(keep(geometry), keep(material), count);
    mesh.name = name;
    for (let index = 0; index < count; index++) {
      const patch = index % 9;
      const x =
        (patch % 2 ? -1 : 1) * (13 + (patch % 3) * 19) + (random() - 0.5) * 14;
      const z = 112 - Math.floor(patch / 2) * 51 + (random() - 0.5) * 27;
      const size = placement(index, x, z);
      dummy.position.set(x, seabedHeight(x, z) + size.offset, z);
      dummy.rotation.set(0, random() * Math.PI, (random() - 0.5) * 0.18);
      dummy.scale.set(size.x, size.y, size.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(
        index,
        color
          .set(palette[index % palette.length])
          .multiplyScalar(0.88 + random() * 0.22),
      );
    }
    nursery.add(clusterInstances(mesh, 90));
  };
  const fanMaterial = new THREE.MeshStandardMaterial({
    color: "#bcc6d1",
    roughness: 0.78,
    side: THREE.DoubleSide,
  });
  addSway(fanMaterial, time, 0.018);
  addGroundCover(
    seaFanGeometry(),
    fanMaterial,
    64,
    "atlantis_silver_seafans",
    () => {
      const size = 1.2 + random() * 1.9;
      return { x: size, y: size, z: size, offset: 0 };
    },
  );
  const moundMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.83,
    metalness: 0.025,
  });
  addSurfaceDetail(moundMaterial, "coral", 1.1);
  addGroundCover(
    moundCoralGeometry(),
    moundMaterial,
    82,
    "atlantis_coral_mounds",
    () => {
      const size = 0.45 + random() * 0.9;
      return { x: size, y: size * 0.65, z: size * 0.85, offset: size * 0.2 };
    },
  );
  const grassMaterial = new THREE.MeshStandardMaterial({
    color: "#598781",
    roughness: 0.92,
    side: THREE.DoubleSide,
  });
  addSway(grassMaterial, time, 0.15);
  addLeafDetail(grassMaterial);
  addGroundCover(
    ribbonGeometry(true),
    grassMaterial,
    360,
    "atlantis_seagrass",
    () => ({
      x: 0.8 + random() * 0.6,
      y: 1.3 + random() * 2.9,
      z: 0.8,
      offset: -0.08,
    }),
  );

  const branchMaterial = keep(
    new THREE.MeshStandardMaterial({ color: "#c7b7c1", roughness: 0.76 }),
  );
  addSurfaceDetail(branchMaterial, "coral", 1.4);
  const branches = new THREE.InstancedMesh(
    keep(coralBranchGeometry()),
    branchMaterial,
    240,
  );
  branches.name = "atlantis_branching_coral";
  const up = new THREE.Vector3(0, 1, 0);
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  const direction = new THREE.Vector3();
  for (let cluster = 0; cluster < 40; cluster++) {
    const x = (cluster % 2 ? -1 : 1) * (19 + random() * 48);
    const z = 112 - random() * 227;
    const y = seabedHeight(x, z);
    const size = 0.8 + random() * 1.4;
    for (let branch = 0; branch < 6; branch++) {
      const angle = branch * 2.399;
      start.set(x, y + (branch ? size * 0.37 : 0), z);
      end.set(
        x + (branch ? Math.cos(angle) * size * 0.65 : 0),
        y + size * (1.0 + random() * 0.55),
        z + (branch ? Math.sin(angle) * size * 0.65 : 0),
      );
      direction.subVectors(end, start);
      dummy.position.copy(start).add(end).multiplyScalar(0.5);
      dummy.quaternion.setFromUnitVectors(up, direction.clone().normalize());
      dummy.scale.set(
        size * (branch ? 0.48 : 0.7),
        direction.length(),
        size * 0.48,
      );
      dummy.updateMatrix();
      branches.setMatrixAt(cluster * 6 + branch, dummy.matrix);
      branches.setColorAt(
        cluster * 6 + branch,
        color.set(palette[cluster % palette.length]),
      );
    }
  }
  nursery.add(clusterInstances(branches, 90));
  return nursery;
}

/** 沿用成熟水面的连续噪声梯度与像素足迹过滤，改成冷月反射而非日光亮带。 */
function createMoonlitWater(keep, time) {
  const material = keep(
    new THREE.ShaderMaterial({
      uniforms: { oceanTime: time, waterLevel: { value: WORLD.surfaceY } },
      vertexShader: `uniform float oceanTime; varying vec3 vWorld;
      void main() {
        vec3 p = position;
        p.z += sin(p.x * 0.052 + oceanTime * 0.25) * 0.10
          + sin(p.x * 0.022 + p.y * 0.018 - oceanTime * 0.15) * 0.16;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
      fragmentShader: `uniform float oceanTime; uniform float waterLevel; varying vec3 vWorld;
      float rippleHash(vec2 p) {
        vec3 q = fract(vec3(p.xyx) * 0.1031);
        q += dot(q, q.yzx + 33.33);
        return fract((q.x + q.y) * q.z);
      }
      vec3 rippleNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f*f*(3.0-2.0*f), du = 6.0*f*(1.0-f);
        float a = rippleHash(i), b = rippleHash(i+vec2(1,0));
        float c = rippleHash(i+vec2(0,1)), d = rippleHash(i+vec2(1,1));
        float k = a-b-c+d;
        return vec3(a+(b-a)*u.x+(c-a)*u.y+k*u.x*u.y, ((b-a)+k*u.y)*du.x, ((c-a)+k*u.x)*du.y);
      }
      void main() {
        vec2 p = vWorld.xz;
        float dist = distance(cameraPosition, vWorld);
        float footprint = max(length(dFdx(p)), length(dFdy(p)));
        mat2 turn = mat2(0.8,-0.6,0.6,0.8), back = mat2(0.8,0.6,-0.6,0.8);
        vec3 broad = rippleNoise(p*vec2(0.70,0.37)+vec2(oceanTime*0.10,-oceanTime*0.04));
        vec3 middle = rippleNoise(turn*p*vec2(2.7,1.6)+vec2(-oceanTime*0.20,oceanTime*0.07));
        vec3 fine = rippleNoise(back*p*vec2(7.2,3.8)+vec2(oceanTime*0.30,oceanTime*0.12));
        float broadFilter = 1.0-smoothstep(0.35,1.4,footprint*0.70);
        float middleFilter = 1.0-smoothstep(0.35,1.4,footprint*2.7);
        float fineFilter = 1.0-smoothstep(0.35,1.4,footprint*7.2);
        vec2 slope = broad.yz*vec2(0.70,0.37)*0.075*broadFilter;
        slope += back*(middle.yz*vec2(2.7,1.6))*0.027*middleFilter;
        slope += turn*(fine.yz*vec2(7.2,3.8))*0.009*fineFilter;
        vec3 normal = normalize(vec3(-slope.x,1.0,-slope.y));
        vec3 eye = normalize(cameraPosition-vWorld);
        float above = step(waterLevel,cameraPosition.y);
        float viewNormal = clamp(abs(dot(normal,eye)),0.0,1.0);
        float fresnel = 0.025+0.975*pow(1.0-viewNormal,5.0);
        vec3 reflected = reflect(-eye,normal);
        vec3 sky = mix(vec3(0.018,0.040,0.067),vec3(0.008,0.017,0.040),smoothstep(-0.1,0.8,reflected.y));
        float moon = max(0.0,dot(reflected,normalize(vec3(-0.42,0.75,-0.5))));
        float moonGlow = pow(moon,36.0)*0.055;
        float glint = pow(moon,480.0)*(0.35+0.65*fineFilter);
        sky += vec3(0.45,0.63,0.81)*(glint*0.9+moonGlow);
        vec3 top = mix(vec3(0.010,0.039,0.062),sky,0.20+fresnel*0.74);
        float windowMask = smoothstep(0.54,0.78,viewNormal);
        vec3 below = mix(vec3(0.016,0.056,0.090),vec3(0.055,0.125,0.175),windowMask);
        below += vec3(0.008,0.015,0.024)*(broad.x-0.5)*broadFilter;
        float belowAlpha = mix(0.49,0.20,windowMask)*exp(-dist*0.0035);
        gl_FragColor = vec4(mix(below,top,above),mix(belowAlpha,0.97,above));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    }),
  );
  const mesh = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(1100, 2600, 52, 120)),
    material,
  );
  mesh.name = "atlantis_moonlit_water";
  mesh.position.set(0, WORLD.surfaceY, (WORLD.minZ + WORLD.maxZ) * 0.5);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 1;
  return mesh;
}

/** 只摆动植物上端；根部与模型中心保持原位，不改变碰撞或生态锚点。 */
function addSway(material, time, strength) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.atlantisTime = time;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float atlantisTime;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float phase = 0.0;
        #ifdef USE_INSTANCING
          phase = instanceMatrix[3].x*0.17+instanceMatrix[3].z*0.08;
        #endif
        transformed.x += sin(atlantisTime*0.65+phase+position.y)*pow(max(0.0,position.y),2.0)*${strength.toFixed(3)};`,
      );
  };
  material.customProgramCacheKey = () => `atlantis_sway_${strength}_v1`;
}

function randomSource(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
