import * as THREE from "three";
import { acquireHawaiiReefAsset } from "./hawaii_reef_asset.js";
import { sceneryFootSamples } from "./scenery_grounding.js";

const UP = new THREE.Vector3(0, 1, 0);
const sourceVisibilityDistance = (source, local, headSource) =>
  local && source.lairBackdrop
    ? 230
    : local && (source === headSource || source.lairColony)
      ? 160
      : 110;

// 十二秒缓慢呼吸，始终保留底亮；减少动态效果时恒亮，不使用独立时钟。
export const bermudaLairGlowPulse = (elapsed, reducedMotion = false) =>
  reducedMotion ? 1 : 1 - 0.18 * Math.cos((elapsed * Math.PI) / 6);

function createLairBackdrop(cave, titan) {
  const surfaces = [
      cave?.shell,
      ...(cave?.partitions || [])
        .filter((part) => part.id === "rear_shadow_overhang")
        .map((part) => part.mesh),
    ].filter(Boolean),
    anchors = [],
    bindings = [],
    ray = new THREE.Raycaster(),
    normalMatrix = new THREE.Matrix3(),
    pulse = { value: 1 };
  for (const surface of surfaces) surface.updateWorldMatrix(true, false);
  for (const [offset, axis] of [
    [
      [50, 72, -15],
      [-0.1, 0.05, -1],
    ],
    [
      [80, 45, 25],
      [0, 0.2, 1],
    ],
    [
      [-60, 52, -5],
      [-1, 0.1, 0],
    ],
  ]) {
    ray.set(
      titan.pose.position.clone().add(new THREE.Vector3(...offset)),
      new THREE.Vector3(...axis).normalize(),
    );
    ray.near = 0.1;
    ray.far = 230;
    const hit = ray.intersectObjects(surfaces, false)[0];
    if (!hit?.face) continue;
    const normal = hit.face.normal
      .clone()
      .applyNormalMatrix(normalMatrix.getNormalMatrix(hit.object.matrixWorld));
    if (normal.dot(ray.ray.direction) > 0) normal.negate();
    anchors.push({
      point: hit.point.clone(),
      normal,
      surface: hit.object,
      face: hit.faceIndex,
      source: {
        position: hit.point.clone().addScaledVector(normal, 2),
        color: 0x71c5d0,
        intensity: 760,
        distance: 230,
        lairColony: true,
        lairBackdrop: true,
      },
    });
  }
  for (const mesh of new Set(anchors.map((row) => row.surface))) {
    const original = mesh.material,
      material = original.clone(),
      baseCompile = original.onBeforeCompile,
      centers = anchors.map((row) => row.point),
      normals = anchors.map((row) => row.normal);
    material.name = "bermuda_lair_luminous_mineral_wall";
    material.onBeforeCompile = (shader, renderer) => {
      baseCompile.call(original, shader, renderer);
      // 复用岩石已有粗细噪声形成不规则矿簇，不再画等距发光条带。
      const mineralPattern = shader.fragmentShader.includes(
        "float broad = detailNoise",
      )
        ? ".045+smoothstep(.50,.76,broad)*(.12+.65*smoothstep(.54,.80,grain))"
        : ".045+.32*smoothstep(.55,.95,sin(vLairGlowPosition.x*.13)*sin(vLairGlowPosition.y*.17+vLairGlowPosition.z*.11))";
      shader.uniforms.lairGlowCenters = { value: centers };
      shader.uniforms.lairGlowNormals = { value: normals };
      shader.uniforms.lairGlowPulse = pulse;
      shader.vertexShader =
        "varying vec3 vLairGlowPosition;\n" +
        shader.vertexShader.replace(
          "#include <project_vertex>",
          "vLairGlowPosition=(modelMatrix*vec4(transformed,1.0)).xyz;\n#include <project_vertex>",
        );
      shader.fragmentShader =
        `varying vec3 vLairGlowPosition; uniform vec3 lairGlowCenters[${anchors.length}]; uniform vec3 lairGlowNormals[${anchors.length}]; uniform float lairGlowPulse;\n` +
        shader.fragmentShader.replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          float lairGlowMask=0.0;
          for(int i=0;i<${anchors.length};i++){
            vec3 d=vLairGlowPosition-lairGlowCenters[i];
            float n=dot(d,lairGlowNormals[i]);
            float r=length(d-lairGlowNormals[i]*n);
            lairGlowMask=max(lairGlowMask,(1.0-smoothstep(22.0,58.0,r))*(1.0-smoothstep(2.0,18.0,abs(n))));
          }
          float lairMineral=${mineralPattern};
          totalEmissiveRadiance+=vec3(.075,.43,.52)*lairGlowMask*lairMineral*lairGlowPulse;
          `,
        );
    };
    material.customProgramCacheKey = () =>
      `${original.customProgramCacheKey()}_lair_mineral_glow_v2_${anchors.length}`;
    mesh.material = material;
    bindings.push({ mesh, original, material });
  }
  return {
    anchors,
    bindings,
    update(amount) {
      pulse.value = amount;
      for (const row of anchors) row.source.intensity = 760 * amount;
    },
    dispose() {
      for (const { mesh, original, material } of bindings) {
        if (mesh.material === material) mesh.material = original;
        material.dispose();
      }
    },
  };
}

/** 巢内保留原头灯和有效嘴灯，其余位置仍由现有三灯池就近分配。 */
export function selectBermudaLairLights(
  sources,
  position,
  { local = false, headSource, mouthSource, count = 3 } = {},
  selected = [],
) {
  selected.length = 0;
  const eligible = (source) =>
    source?.intensity > 0.001 &&
    source.position.distanceToSquared(position) <
      sourceVisibilityDistance(source, local, headSource) ** 2;
  const ordered = sources
    .filter((source) => local || !source.lairColony)
    .sort(
      (a, b) =>
        a.position.distanceToSquared(position) -
        b.position.distanceToSquared(position),
    );
  if (local) {
    for (const source of [headSource, mouthSource])
      if (eligible(source) && !selected.includes(source)) selected.push(source);
    const backdrop = ordered.find(
      (source) => source.lairBackdrop && eligible(source),
    );
    if (backdrop && selected.length < count && !selected.includes(backdrop))
      selected.push(backdrop);
  }
  for (const source of ordered) {
    if (selected.length >= count) break;
    if (selected.includes(source) || (local && !eligible(source))) continue;
    selected.push(source);
  }
  selected.length = Math.min(selected.length, count);
  return selected;
}

/** 可见HF海绵附着真实岩面；只提供候选源，绝不创建新的点光或活动循环。 */
export function createBermudaTitanLairLighting(
  parent,
  { cave, titan, floor } = {},
) {
  const root = new THREE.Group();
  root.name = "bermuda_titan_lair_luminous_colonies";
  parent.add(root);
  const asset = acquireHawaiiReefAsset("reef_sponge"),
    material = asset.material.clone(),
    farMaterial = asset.farMaterial.clone(),
    surfaces = [
      cave?.shell,
      ...(cave?.partitions || []).map((part) => part.mesh),
      ...(titan?.beds || []).map((bed) => bed.mesh),
      titan?.treasureRock?.mesh,
      floor,
    ].filter(Boolean),
    supportSurfaces = [
      ...(titan?.beds || []).map((bed) => bed.mesh),
      titan?.treasureRock?.mesh,
    ].filter(Boolean),
    ray = new THREE.Raycaster(),
    normalMatrix = new THREE.Matrix3(),
    dummy = new THREE.Object3D(),
    point = new THREE.Vector3(),
    origin = new THREE.Vector3(),
    direction = new THREE.Vector3(),
    placements = [],
    lightSources = [],
    selected = [],
    foot = sceneryFootSamples([asset.geometry, asset.farGeometry], 0.015),
    supportPoints = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    let best = -Infinity,
      chosen;
    for (const sample of foot)
      for (const id of sample.ids) {
        point.fromBufferAttribute(sample.position, id);
        const score = point.x * Math.cos(angle) + point.z * Math.sin(angle);
        if (score > best) {
          best = score;
          chosen = point.clone();
        }
      }
    if (chosen) supportPoints.push(chosen);
  }
  for (const surface of surfaces) surface.updateWorldMatrix(true, false);
  function hitAt(from, toward, reach, targets = surfaces) {
    ray.set(from, toward);
    ray.near = 0.001;
    ray.far = reach;
    return ray.intersectObjects(targets, false)[0];
  }
  const focus = new THREE.Vector3().copy(titan.relicPoint),
    headFocus = new THREE.Vector3().copy(titan.mouth),
    approach = new THREE.Vector3().copy(titan.waitPoint),
    probes = [
      ["paw_wall_south", focus, [0, 14, -3], [0.1, 0.1, -1], 4.2],
      ["paw_support_side", focus, [45, -3, -12], [-1, 0, 0], 3.6],
      ["head_wall_south", headFocus, [0, 8, -4], [-0.3, 0.12, -1], 4.8],
      ["head_wall_north", headFocus, [6, 18, 6], [-0.25, 0.15, 1], 4.1],
      ["approach_rock_south", approach, [8, 28, -22], [0, -1, 0], 3.4],
      ["head_support_side", focus, [15, -3, 38], [0, 0, -1], 3.8],
    ];
  let sourceVertex = 0;
  const positions = asset.geometry.attributes.position;
  for (let i = 1; i < positions.count; i++)
    if (positions.getY(i) > positions.getY(sourceVertex)) sourceVertex = i;
  const sourceLocal = new THREE.Vector3().fromBufferAttribute(
    positions,
    sourceVertex,
  );
  for (const [id, center, offset, axis, height] of probes) {
    origin.copy(center).add(new THREE.Vector3(...offset));
    direction.set(...axis).normalize();
    const nearSupport = id.includes("support_side");
    let hit = hitAt(
      origin,
      direction,
      nearSupport ? 45 : 150,
      nearSupport ? supportSurfaces : surfaces,
    );
    if (!hit && nearSupport) {
      origin.y -= 3;
      hit = hitAt(origin, direction, 45, supportSurfaces);
    }
    if (!hit && nearSupport) {
      // 没有合适竖壁时，仅退到同一近侧真实岩缘，绝不借远处洞壁冒充掌边光源。
      origin
        .copy(focus)
        .add(
          id.startsWith("paw")
            ? new THREE.Vector3(24, 16, -14)
            : new THREE.Vector3(18, 16, 22),
        );
      direction.set(0, -1, 0);
      hit = hitAt(origin, direction, 50, supportSurfaces);
    }
    if (!hit?.face) continue;
    const anchor = hit.point.clone(),
      normal = hit.face.normal
        .clone()
        .applyNormalMatrix(
          normalMatrix.getNormalMatrix(hit.object.matrixWorld),
        );
    if (normal.dot(direction) > 0) normal.negate();
    dummy.position.copy(anchor);
    dummy.quaternion.setFromUnitVectors(UP, normal);
    dummy.rotateY(placements.length * 1.37);
    const scale = height / asset.geometry.boundingBox.getSize(point).y;
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    const gaps = [];
    for (const sample of supportPoints) {
      point.copy(sample).applyMatrix4(dummy.matrix);
      const footHit = hitAt(
        origin.copy(point).addScaledVector(normal, 5),
        direction.copy(normal).negate(),
        10,
        [hit.object],
      );
      if (!footHit) break;
      gaps.push(point.clone().sub(footHit.point).dot(normal));
    }
    if (
      gaps.length !== supportPoints.length ||
      !gaps.length ||
      Math.max(...gaps) - Math.min(...gaps) > 0.9
    )
      continue;
    const shift = -Math.max(...gaps) - 0.12;
    dummy.position.addScaledVector(normal, shift);
    dummy.updateMatrix();
    const matrix = dummy.matrix.clone(),
      source = {
        position: sourceLocal.clone().applyMatrix4(matrix),
        color: 0x79bbc9,
        intensity: id.startsWith("head") ? 155 : 125,
        distance: 100,
        lairColony: true,
      };
    placements.push({
      id,
      height,
      matrix,
      anchor,
      normal,
      surface: hit.object,
      surfaceFace: hit.faceIndex,
      sourceVertex,
      sourceLocal: sourceLocal.clone(),
      footGaps: gaps.map((gap) => gap + shift),
      source,
    });
    lightSources.push(source);
  }
  for (const m of [material, farMaterial]) {
    m.name = "bermuda_lair_bioluminescent_hf_sponge";
    m.emissive.set(0x369eae);
    m.emissiveIntensity = 0.8;
    m.color.set(0xb4d4d6);
    m.roughness = 0.92;
  }
  const near = new THREE.InstancedMesh(
      asset.geometry,
      material,
      placements.length,
    ),
    far = new THREE.InstancedMesh(
      asset.farGeometry,
      farMaterial,
      placements.length,
    );
  near.name = "titan_lair_luminous_sponge_close";
  far.name = "titan_lair_luminous_sponge_distant";
  for (let i = 0; i < placements.length; i++) {
    near.setMatrixAt(i, placements[i].matrix);
    far.setMatrixAt(i, placements[i].matrix);
  }
  near.computeBoundingSphere();
  far.computeBoundingSphere();
  near.count = 0;
  near.visible = false;
  far.visible = placements.length > 0;
  root.add(near, far);
  const backdrop = createLairBackdrop(cave, titan);
  lightSources.push(...backdrop.anchors.map((row) => row.source));
  let disposed = false,
    lastTime = -Infinity,
    lastQuality,
    lastPosition = new THREE.Vector3(Infinity, Infinity, Infinity);
  const local = (p) =>
    (!cave.contains || cave.contains(p, 0)) &&
    p.distanceToSquared(titan.pose.position) < 200 ** 2;
  const prepare = async (options) => {
    const ready = await asset.prepare(options);
    if (disposed) return false;
    for (const m of [material, farMaterial]) {
      m.map = asset.material.map;
      m.emissiveMap = asset.material.map;
      m.vertexColors = asset.material.vertexColors;
      m.needsUpdate = true;
    }
    return ready;
  };
  root.userData.prepareMaterials = prepare;
  void prepare();
  return {
    root,
    near,
    far,
    placements,
    backdrop,
    lightSources,
    prepare,
    stats: {
      sources: placements.length,
      maxDraws: 2,
      newPointLights: 0,
      backgroundPatches: backdrop.anchors.length,
      backgroundDraws: 0,
      maxNearTriangles: (asset.geometry.index.count / 3) * placements.length,
      farTriangles: (asset.farGeometry.index.count / 3) * placements.length,
    },
    selectSources(candidates, position, headSource, mouthSource) {
      return selectBermudaLairLights(
        candidates,
        position,
        { local: local(position), headSource, mouthSource },
        selected,
      );
    },
    visibilityDistance(source, position) {
      return sourceVisibilityDistance(
        source,
        local(position),
        titan.lightSources?.[0],
      );
    },
    update(elapsed, position, highQuality = true, reducedMotion = false) {
      if (disposed) return;
      // 脉动只更新材质/现有灯源；LOD矩阵仍沿用原来的节流频率。
      const amount = bermudaLairGlowPulse(elapsed, reducedMotion);
      backdrop.update(amount);
      if (
        elapsed >= lastTime &&
        elapsed - lastTime < 0.3 &&
        lastPosition.distanceToSquared(position) < 16 &&
        highQuality === lastQuality
      )
        return;
      lastTime = elapsed;
      lastQuality = highQuality;
      lastPosition.copy(position);
      let n = 0,
        f = 0;
      for (const row of placements) {
        point.setFromMatrixPosition(row.matrix);
        const distance = point.distanceTo(position);
        if (distance > (highQuality ? 190 : 150)) continue;
        if (distance < (highQuality ? 45 : 28))
          near.setMatrixAt(n++, row.matrix);
        else far.setMatrixAt(f++, row.matrix);
      }
      for (const [mesh, count] of [
        [near, n],
        [far, f],
      ]) {
        mesh.count = count;
        mesh.visible = count > 0;
        mesh.instanceMatrix.needsUpdate = true;
      }
    },
    reset() {
      if (disposed) return;
      lastTime = -Infinity;
      near.count = 0;
      near.visible = false;
      far.count = placements.length;
      far.visible = placements.length > 0;
      for (let i = 0; i < placements.length; i++)
        far.setMatrixAt(i, placements[i].matrix);
      far.instanceMatrix.needsUpdate = true;
      selected.length = 0;
      backdrop.update(1);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      backdrop.dispose();
      root.removeFromParent();
      near.dispose();
      far.dispose();
      material.dispose();
      farMaterial.dispose();
      asset.release();
      root.clear();
      lightSources.length = 0;
      selected.length = 0;
    },
  };
}
