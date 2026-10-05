import * as THREE from "three";
import {
  ODYSSEY_WORLD as W,
  ODYSSEY_LANDMARKS,
  odysseySeabedHeight,
} from "./odyssey_config.js";
import { addSurfaceDetail, clusterInstances } from "./ocean_visuals.js";
import {
  createOdysseyEnvironmentKit,
  createOdysseyMergeBucket,
} from "./odyssey_environment_geometry.js";
import { createOdysseyLandmarksSteps } from "./odyssey_environment_landmarks.js";
import {
  constructionScope,
  finishScenePreparation,
  prepareScene,
} from "./scene_preparation.js";

/** 静态工具与浏览器共用真实构造过程；异步入口按条带和装饰批次让出主线程。 */
export function createOdysseyOcean(parent) {
  return finishScenePreparation(createOdysseyOceanSteps(parent));
}
export function createOdysseyOceanAsync(parent, options) {
  return prepareScene(createOdysseyOceanSteps(parent), options);
}

/** 小幅地中海长涌浪；物理边界与着色器使用同一函数。 */
export function odysseyWaterHeight(x, z, t = 0) {
  return (
    W.surfaceY +
    Math.sin(x * 0.055 + t * 0.3) * 0.12 +
    Math.sin(x * 0.021 - t * 0.17 + z * 0.013) * 0.18
  );
}

/** 原创希腊神话航路，地形、真实实体、分块生态和古船共用单一生命周期。 */
export function* createOdysseyOceanSteps(parent) {
  const root = new THREE.Group();
  root.name = "odyssean_underwater_passage";
  parent.add(root);
  const resources = new Set(),
    keep = (r) => (resources.add(r), r),
    scope = constructionScope(root, resources);
  const colliders = [],
    chunks = [],
    time = { value: 0 };
  let disposed = false;
  try {
    const floorMaterial = keep(
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97 }),
    );
    floorMaterial.name = "sand_limestone_and_abyss_strata";
    addSurfaceDetail(floorMaterial, "stone", 0.37);
    const sand = new THREE.Color("#c9bda3"),
      stone = new THREE.Color("#819798"),
      deep = new THREE.Color("#3d556a"),
      color = new THREE.Color();
    // 四米网格的高程与最终渲染三角形误差单独验证，条带避免首次构造长任务。
    for (let z = W.minZ; z < W.maxZ; z += 80) {
      const width = W.maxX - W.minX,
        size = Math.min(80, W.maxZ - z);
      const g = keep(
        new THREE.PlaneGeometry(
          width,
          size,
          Math.ceil(width / 4),
          Math.ceil(size / 4),
        ),
      );
      g.rotateX(-Math.PI / 2);
      g.translate((W.minX + W.maxX) * 0.5, 0, z + size * 0.5);
      const p = g.attributes.position,
        colors = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          zz = p.getZ(i),
          y = odysseySeabedHeight(x, zz);
        p.setY(i, y);
        const descent = THREE.MathUtils.smoothstep(-zz, 100, 870);
        color
          .copy(sand)
          .lerp(stone, Math.min(1, descent * 2.2))
          .lerp(deep, Math.max(0, (descent - 0.36) / 0.64));
        color.multiplyScalar(
          0.88 +
            0.09 * Math.sin(x * 0.065 + zz * 0.043) +
            0.035 * Math.cos(x * 0.18 - zz * 0.13),
        );
        color.toArray(colors, i * 3);
      }
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, floorMaterial);
      mesh.name = "odyssey_authoritative_seabed";
      mesh.receiveShadow = true;
      root.add(mesh);
      yield "seabed-strip";
    }
    const kit = createOdysseyEnvironmentKit(keep, time);
    yield "shared-environment-kit";
    // 横向边缘从海床生长出石灰岩断壁，主航道宽度始终超过四百米。
    for (let strip = 0; strip < 15; strip++) {
      const z = 95 - strip * 84,
        b = createOdysseyMergeBucket(keep, resources);
      for (const side of [-1, 1]) {
        const x = side * (285 + Math.sin(strip * 1.7) * 5),
          floor = odysseySeabedHeight(x, z),
          h = 38 + (strip % 4) * 11;
        b.emit(
          kit.rock,
          kit.materials.limestone,
          [x, floor + h * 0.32, z],
          [18, h * 0.52, 48],
          [0, strip * 0.29, 0],
        );
        colliders.push({
          type: "ellipsoid",
          kind: "limestone_escarpment",
          id: `odyssey_flank_${strip}_${side}`,
          x,
          y: floor + h * 0.32,
          z,
          axes: new THREE.Vector3(18, h * 0.52, 48),
          rotation: new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            strip * 0.29,
          ),
        });
      }
      const chunk = b.finish(root, `odyssey_limestone_flanks_${strip}`);
      chunks.push({
        root: chunk,
        center: new THREE.Vector3(0, odysseySeabedHeight(0, z) + 20, z),
        range: 700,
      });
      yield "limestone-flank";
    }
    // 真正海底生态按深度递减，每种只上传静态实例矩阵，摆动在 GPU 完成。
    const dummy = new THREE.Object3D();
    const groups = [
      {
        name: "red_branch_coral",
        geometry: kit.coral,
        material: kit.materials.coral,
        count: 108,
        scale: 2.3,
        extent: 710,
      },
      {
        name: "crimson_lace_sea_fans",
        geometry: kit.fan,
        material: kit.materials.fan,
        count: 106,
        scale: 3.8,
        extent: 1170,
      },
      {
        name: "gold_sponge_outcrops",
        geometry: kit.sponge,
        material: kit.materials.sponge,
        count: 128,
        scale: 2.2,
        extent: 1210,
      },
      {
        name: "anchored_seagrass_meadows",
        geometry: kit.grass,
        material: kit.materials.grass,
        count: 900,
        scale: 3.1,
        extent: 800,
      },
    ];
    for (const spec of groups) {
      const source = new THREE.InstancedMesh(
        spec.geometry,
        spec.material,
        spec.count,
      );
      source.name = `odyssey_${spec.name}`;
      // 约两百米宽的左右生态带留出主航路，育幼浅湾不由巨大装饰挤占。
      for (let i = 0; i < spec.count; i++) {
        const z = 115 - ((i * 73.97 + spec.scale * 27) % spec.extent),
          side = i % 2 ? 1 : -1;
        const x = side * (35 + ((i * 31.73) % 205)),
          y = odysseySeabedHeight(x, z);
        const scale = spec.scale * (0.55 + (i % 7) * 0.12);
        dummy.position.set(
          x,
          y + (spec.geometry === kit.sponge ? scale * 0.35 : 0),
          z,
        );
        dummy.rotation.set(
          0,
          i * 2.399,
          spec.geometry === kit.fan ? Math.sin(i) * 0.15 : 0,
        );
        dummy.scale.set(
          scale,
          spec.geometry === kit.sponge ? scale * 0.65 : scale,
          scale,
        );
        dummy.updateMatrix();
        source.setMatrixAt(i, dummy.matrix);
      }
      source.instanceMatrix.needsUpdate = true;
      source.computeBoundingSphere();
      const group = clusterInstances(source, 80);
      root.add(group);
      for (const mesh of group.children)
        chunks.push({
          root: mesh,
          center: mesh.boundingSphere.center,
          range: 470,
        });
      yield "reef-ecology-batch";
    }
    // 大石块是有碰撞的掩体，珊瑚与海草只是柔性生态，不扩张刚体禁行区。
    const stones = new THREE.InstancedMesh(
      kit.rock,
      kit.materials.darkStone,
      56,
    );
    stones.name = "odyssey_real_reef_cover";
    for (let i = 0; i < 56; i++) {
      const z = 70 - i * 21.2,
        x = (i % 2 ? 1 : -1) * (120 + (i % 6) * 18),
        y = odysseySeabedHeight(x, z),
        s = 3.5 + (i % 4) * 1.8;
      dummy.position.set(x, y + s * 0.3, z);
      dummy.rotation.set(0, i * 0.83, 0);
      dummy.scale.set(s, s * 0.7, s * 1.2);
      dummy.updateMatrix();
      stones.setMatrixAt(i, dummy.matrix);
      colliders.push({
        type: "ellipsoid",
        kind: "reef_cover",
        id: `odyssey_cover_${i}`,
        x,
        y: y + s * 0.3,
        z,
        axes: new THREE.Vector3(s, s * 0.7, s * 1.2),
        rotation: dummy.quaternion.clone(),
      });
    }
    stones.computeBoundingSphere();
    root.add(clusterInstances(stones, 80));
    yield "physical-cover";
    const landmarkKit = yield* createOdysseyLandmarksSteps(root, {
      keep,
      resources,
      kit,
      heightAt: odysseySeabedHeight,
      colliders,
    });
    const surface = createSurface(root, keep, time);
    yield "warm_sea_surface";
    const skyline = yield* createSkylineSteps(root, keep, kit);
    const landmarks = ODYSSEY_LANDMARKS.map((l) => ({
      id: l.id,
      name: l.id,
      position: new THREE.Vector3(...l.position),
    })).concat(landmarkKit.landmarks);
    const result = {
      root,
      colliders,
      navigationColliders: colliders,
      barriers: [],
      obstacles: [],
      heightAt: odysseySeabedHeight,
      groundHeightAt: odysseySeabedHeight,
      waterHeightAt: odysseyWaterHeight,
      landmarks,
      wreck: landmarkKit.wreck,
      wreckEntrance: landmarkKit.wreckEntrance,
      radarPaths: [
        [
          [0, 75],
          [-15, -140],
          [-55, -275],
          [40, -510],
          [-90, -650],
          [100, -940],
          [0, -1090],
        ],
      ],
      lightSources: [],
      update(
        t,
        position,
        dt = 0,
        highQuality = true,
        cameraPosition = position,
      ) {
        if (disposed) return;
        time.value = t;
        skyline.sky.position.copy(cameraPosition);
        // 相机尚在波面下时不能先画天空与远岛，否则会像从镂空地形中透视。
        const showSky =
          cameraPosition.y >
          odysseyWaterHeight(cameraPosition.x, cameraPosition.z, t);
        skyline.sky.visible = showSky;
        for (const island of skyline.islands) island.visible = showSky;
        skyline.sky.material.uniforms.underwater.value = THREE.MathUtils.clamp(
          (W.surfaceY - cameraPosition.y) / 28,
          0,
          1,
        );
        for (const c of chunks)
          c.root.visible =
            c.center.distanceToSquared(position) <
            (c.range * (highQuality ? 1 : 0.85)) ** 2;
        surface.material.uniforms.aboveWater.value = showSky ? 1 : 0;
        // 水上采用真正不透明的深度表面；水下才启用斯涅尔窗的透光。
        surface.material.transparent = !showSky;
        surface.material.depthWrite = showSky;
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        root.removeFromParent();
        root.traverse((n) => {
          if (n.isInstancedMesh) n.dispose();
        });
        for (const r of resources) r.dispose();
        resources.clear();
        root.clear();
        colliders.length = 0;
        chunks.length = 0;
      },
    };
    result.update(0, new THREE.Vector3(0, -18, 75));
    return scope.finish(result);
  } finally {
    scope.close();
  }
}

/** 上方水面不透视海底，下方仍保留斯涅尔窗口；距离过滤避免细浪闪烁。 */
function createSurface(parent, keep, time) {
  const material = keep(
    new THREE.ShaderMaterial({
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        odysseyTime: time,
        aboveWater: { value: 0 },
      },
      fog: true,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: `uniform float odysseyTime;varying vec3 seaWorld;
      #include <fog_pars_vertex>
      void main(){vec3 p=position;p.y+=sin(p.x*.055+odysseyTime*.3)*.12+sin(p.x*.021-odysseyTime*.17+p.z*.013)*.18;
      vec4 world=modelMatrix*vec4(p,1.);seaWorld=world.xyz;vec4 mvPosition=viewMatrix*world;gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
      }`,
      fragmentShader: `uniform float odysseyTime;uniform float aboveWater;varying vec3 seaWorld;
      #include <fog_pars_fragment>
      void main(){vec2 p=seaWorld.xz;float footprint=max(length(dFdx(p)),length(dFdy(p)));
      float rippleWeight=1.-smoothstep(.3,1.7,footprint);vec2 slope=vec2(sin(p.x*.47+p.y*.22+odysseyTime*.37),cos(p.y*.31-p.x*.17+odysseyTime*.31))*.055*rippleWeight;
      vec3 n=normalize(vec3(-slope.x,1.,-slope.y)),eye=normalize(cameraPosition-seaWorld),reflected=reflect(-eye,n);
      float fresnel=.04+.96*pow(1.-clamp(abs(dot(n,eye)),0.,1.),5.);
      vec3 warmSky=mix(vec3(.36,.42,.40),vec3(.23,.40,.53),smoothstep(0.,.8,reflected.y));
      float sun=pow(max(0.,dot(reflected,normalize(vec3(-.48,.55,.48)))),180.);
      vec3 top=mix(vec3(.025,.16,.20),warmSky,.18+fresnel*.6)+vec3(.34,.26,.14)*sun;
      float snellWindow=smoothstep(.5,.78,abs(dot(n,eye)));vec3 below=mix(vec3(.018,.065,.10),vec3(.11,.22,.26),snellWindow);
      float dist=distance(cameraPosition,seaWorld);float opacity=mix(.47,.2,snellWindow)*exp(-dist*.003);
      gl_FragColor=vec4(mix(below,top,aboveWater),mix(opacity,1.,aboveWater));
      #include <fog_fragment>
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
    }),
  );
  material.name = "amber_mediterranean_reflection";
  const g = keep(new THREE.PlaneGeometry(1400, 2300, 50, 90));
  g.rotateX(-Math.PI / 2);
  g.translate(0, W.surfaceY, (W.minZ + W.maxZ) * 0.5);
  const surface = new THREE.Mesh(g, material);
  surface.name = "odyssey_matching_swell_surface";
  surface.renderOrder = 1;
  parent.add(surface);
  return surface;
}

/** 远方白崖与橄榄岛均在可游边界外，既提供地域剪影，也不制造无碰撞可进入陆地。 */
function* createSkylineSteps(parent, keep, kit) {
  const islands = [];
  const material = keep(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      uniforms: { underwater: { value: 0 } },
      vertexShader: `varying vec3 skyDirection;void main(){vec4 world=modelMatrix*vec4(position,1.);skyDirection=world.xyz-cameraPosition;gl_Position=projectionMatrix*viewMatrix*world;gl_Position.z=gl_Position.w*.999999;}`,
      fragmentShader: `varying vec3 skyDirection;uniform float underwater;
      void main(){vec3 d=normalize(skyDirection);float elevation=smoothstep(-.1,.8,d.y);
      vec3 color=mix(vec3(.62,.55,.40),vec3(.18,.38,.54),elevation);
      float sun=pow(max(0.,dot(d,normalize(vec3(-.48,.55,.48)))),500.);color+=vec3(.5,.39,.21)*sun;
      float haze=exp(-abs(d.y)*12.);color+=vec3(.065,.041,.012)*haze;
      color=mix(color,vec3(.055,.13,.21),underwater);gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
    }),
  );
  const sky = new THREE.Mesh(
    keep(new THREE.SphereGeometry(2800, 24, 16)),
    material,
  );
  sky.name = "odyssey_amber_sky";
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  parent.add(sky);
  const islandMaterial = keep(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
  );
  addSurfaceDetail(islandMaterial, "stone", 0.23);
  for (const [i, cx, cz, rx, rz, height] of [
    [0, -440, 45, 110, 150, 64],
    [1, 450, -280, 125, 140, 86],
    [2, -460, -740, 130, 190, 98],
    [3, 90, 340, 175, 95, 51],
  ]) {
    const g = keep(new THREE.PlaneGeometry(rx * 2, rz * 2, 60, 60));
    g.rotateX(-Math.PI / 2);
    g.translate(cx, 0, cz);
    const p = g.attributes.position,
      colors = new Float32Array(p.count * 3),
      color = new THREE.Color();
    for (let n = 0; n < p.count; n++) {
      const x = p.getX(n),
        z = p.getZ(n),
        r = Math.hypot((x - cx) / rx, (z - cz) / rz),
        a = Math.atan2((z - cz) / rz, (x - cx) / rx);
      const terrace = Math.max(0, 1 - r),
        cliff = THREE.MathUtils.smoothstep(terrace, 0.02, 0.2);
      const y =
        -20 +
        cliff * 38 +
        Math.pow(terrace, 0.65) * height +
        Math.sin(a * 9 + r * 17) * cliff * 3;
      p.setY(n, y);
      color.set(y > 27 ? "#74825a" : y > 7 ? "#d8c6a1" : "#bbb59c");
      color.multiplyScalar(0.91 + Math.sin(a * 13 + r * 33) * 0.075);
      color.toArray(colors, n * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    const island = new THREE.Mesh(g, islandMaterial);
    island.name = `odyssey_offshore_white_cliff_${i}`;
    parent.add(island);
    islands.push(island);
    yield "offshore-island";
  }
  return { sky, islands };
}
