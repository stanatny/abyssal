import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { createSilhouetteProxyPool } from "./player_silhouette.js";

import topology from "./assets/models/creature_interior_topology.json" with { type: "json" };
import { creatureGeometryKey } from "./creature_interior_key.js";
const topologyKeys = Object.keys(topology);

/** 使用离线闭合外壳索引；属性句柄独立，CPU只读数组继续共享。 */
export function preparedCreatureExterior(source) {
  const prefix = `${source.attributes.position?.count}:${source.index?.count ?? 0}:`;
  if (!topologyKeys.some((key) => key.startsWith(prefix))) return null;
  const record = topology[creatureGeometryKey(source)];
  if (!record) return null;
  const geometry = new THREE.BufferGeometry();
  const decode = (data, Type) =>
    new Type(Uint8Array.from(atob(data), (c) => c.charCodeAt(0)).buffer);
  const borrow = (a) =>
    new THREE.BufferAttribute(a.array, a.itemSize, a.normalized);
  if (!record.position) {
    for (const name of ["position", "normal", "skinIndex", "skinWeight"])
      if (source.attributes[name])
        geometry.setAttribute(name, borrow(source.attributes[name]));
    for (const name of ["position", "normal"])
      if (source.morphAttributes[name])
        geometry.morphAttributes[name] =
          source.morphAttributes[name].map(borrow);
    const count = (source.index?.count ?? source.attributes.position.count) / 3,
      mask = new Set(decode(record.omit ?? record.keep, Uint16Array)),
      indices = [];
    for (let i = 0; i < count; i++)
      if (record.omit !== undefined ? !mask.has(i) : mask.has(i))
        for (let j = 0; j < 3; j++)
          indices.push(source.index ? source.index.getX(i * 3 + j) : i * 3 + j);
    geometry.setIndex(indices);
  } else {
    const packed = decode(record.position, Uint16Array),
      position = Float32Array.from(
        packed,
        (v, i) => record.low[i % 3] + (v / 65535) * record.span[i % 3],
      ),
      nearest = decode(record.nearest, Uint16Array);
    geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
    geometry.setIndex(
      new THREE.BufferAttribute(decode(record.index, Uint16Array), 1),
    );
    for (const name of ["skinIndex", "skinWeight"]) {
      const sourceAttribute = source.attributes[name];
      if (!sourceAttribute) continue;
      const values = new sourceAttribute.array.constructor(
        nearest.length * sourceAttribute.itemSize,
      );
      for (let i = 0; i < nearest.length; i++)
        for (let k = 0; k < sourceAttribute.itemSize; k++)
          values[i * sourceAttribute.itemSize + k] =
            sourceAttribute.array[nearest[i] * sourceAttribute.itemSize + k];
      geometry.setAttribute(
        name,
        new THREE.BufferAttribute(
          values,
          sourceAttribute.itemSize,
          sourceAttribute.normalized,
        ),
      );
    }
    if (source.morphAttributes.position)
      geometry.morphAttributes.position = source.morphAttributes.position.map(
        (morph) => {
          const values = new Float32Array(position.length),
            base = source.attributes.position.array;
          for (let i = 0; i < nearest.length; i++)
            for (let k = 0; k < 3; k++)
              values[i * 3 + k] =
                morph.array[nearest[i] * 3 + k] +
                (source.morphTargetsRelative
                  ? 0
                  : position[i * 3 + k] - base[nearest[i] * 3 + k]);
          return new THREE.BufferAttribute(values, 3);
        },
      );
    geometry.computeVertexNormals();
  }
  geometry.morphTargetsRelative = source.morphTargetsRelative;
  return geometry;
}

const vertexShader = `
  #include <common>
  #include <morphtarget_pars_vertex>
  #include <skinning_pars_vertex>
  varying vec3 surfaceNormal, surfacePosition;
  void main(){
    #include <beginnormal_vertex>
    #include <morphnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <begin_vertex>
    #include <morphtarget_vertex>
    #include <skinning_vertex>
    #include <project_vertex>
    surfaceNormal=normalize(normalMatrix*objectNormal);
    surfacePosition=transformed;
  }`;

/** 镜头切入闭合身体时填实截面；不移动镜头或修改可见外皮。 */
export function createCreatureInterior() {
  const candidates = [],
    owned = new Set(),
    cache = new Map(),
    records = new WeakMap(),
    supportedRoots = new WeakMap();
  const sphere = new THREE.Sphere(),
    center = new THREE.Vector3(),
    clearColor = new THREE.Color();
  const stencil = [THREE.BackSide, THREE.FrontSide].map((side, i) => {
    const op = i ? THREE.DecrementWrapStencilOp : THREE.IncrementWrapStencilOp;
    return new THREE.ShaderMaterial({
      side,
      vertexShader,
      fragmentShader: "void main(){gl_FragColor=vec4(1.0);}",
      colorWrite: false,
      depthWrite: false,
      depthTest: false,
      stencilWrite: true,
      stencilFunc: THREE.AlwaysStencilFunc,
      stencilFail: op,
      stencilZFail: op,
      stencilZPass: op,
    });
  });
  const fill = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader,
    fragmentShader: `
      varying vec3 surfaceNormal, surfacePosition;
      void main(){
        vec3 n=normalize(surfaceNormal);
        float light=0.8+0.04*abs(n.y);
        
        gl_FragColor=vec4(vec3(0.065,0.092,0.101)*light,1.0);
      }`,
    depthWrite: true,
    depthTest: true,
    stencilWrite: true,
    stencilRef: 0,
    stencilFunc: THREE.NotEqualStencilFunc,
    toneMapped: false,
  });
  const pools = [...stencil, fill].map((m) =>
    createSilhouetteProxyPool(() => m),
  );
  const composite = new THREE.ShaderMaterial({
    uniforms: { mask: { value: null } },
    vertexShader:
      "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader:
      `varying vec2 vUv;uniform sampler2D mask;void main(){gl_FragColor=texture2D(mask,vUv);#include <colorspace_fragment>\n}`.replace(
        ";#include",
        ";\n#include",
      ),
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const quad = new FullScreenQuad(composite);
  let target,
    width = 1,
    height = 1,
    disposed = false;
  let frame = 0;
  const stats = { active: false, meshes: 0, cached: 0 };
  function prepared(source) {
    if (!records.has(source)) {
      const prefix = `${source.attributes.position?.count}:${source.index?.count ?? 0}:`;
      records.set(
        source,
        topologyKeys.some((key) => key.startsWith(prefix))
          ? !!topology[creatureGeometryKey(source)]
          : false,
      );
    }
    return records.get(source);
  }
  function prune() {
    for (const [source, entry] of cache)
      if (
        entry.frame !== frame &&
        (cache.size > 64 || frame - entry.frame > 120)
      ) {
        entry.geometry.dispose();
        owned.delete(entry.geometry);
        cache.delete(source);
      }
    stats.cached = cache.size;
  }
  function exterior(source) {
    if (cache.has(source)) {
      const entry = cache.get(source);
      entry.frame = frame;
      return entry.geometry;
    }
    const geometry = preparedCreatureExterior(source);
    if (geometry) cache.set(source, { geometry, frame });
    if (geometry) owned.add(geometry);
    stats.cached = owned.size;
    return geometry;
  }
  function invalidate() {
    target?.dispose();
    target = null;
    composite.uniforms.mask.value = null;
    for (const geometry of owned) geometry.dispose();
    owned.clear();
    cache.clear();
    stats.cached = 0;
  }
  return {
    stats,
    resize(w, h) {
      const ratio = Math.min(1, 960 / w, 640 / h);
      width = Math.max(1, Math.round(w * ratio));
      height = Math.max(1, Math.round(h * ratio));
      target?.setSize(width, height);
    },
    invalidate,
    render(renderer, camera, source) {
      frame++;
      prune();
      if (!source?.enabled && target) invalidate();
      stats.active = false;
      stats.meshes = 0;
      if (
        disposed ||
        !source?.enabled ||
        !source.avatar?.visible ||
        source.solidInterior === false
      )
        return null;
      candidates.length = 0;
      const add = (root) => {
        if (
          root?.visible &&
          root !== source.avatar &&
          root.position.distanceToSquared(camera.position) <
            (root.userData.length * 0.8 + camera.near * 2) ** 2
        )
          candidates.push(root);
      };
      for (const entity of source.entities)
        if (entity.alive !== false) add(entity.mesh);
      for (const boss of source.bosses)
        if (boss.enabled && !boss.state.defeated) add(boss.mesh);
      for (let i = candidates.length - 1; i >= 0; i--) {
        const root = candidates[i];
        if (!supportedRoots.has(root)) {
          let supported = false;
          root.traverse((part) => {
            if (part.isMesh && prepared(part.geometry)) supported = true;
          });
          supportedRoots.set(root, supported);
        }
        if (!supportedRoots.get(root)) candidates.splice(i, 1);
      }
      candidates.sort(
        (a, b) =>
          a.position.distanceToSquared(camera.position) /
            a.userData.length ** 2 -
          b.position.distanceToSquared(camera.position) /
            b.userData.length ** 2,
      );
      candidates.length = Math.min(4, candidates.length);
      if (!candidates.length) return null;
      const scenes = pools.map((pool) => pool.populate(candidates));
      for (const scene of scenes) {
        for (const proxy of [...scene.children]) {
          const original = proxy.geometry;
          original.boundingSphere || original.computeBoundingSphere();
          sphere.copy(original.boundingSphere).applyMatrix4(proxy.matrix);
          sphere.radius *= 1.15;
          center.copy(sphere.center).applyMatrix4(camera.matrixWorldInverse);
          // 不接触镜头近裁剪平面的身体无需截面填充。
          if (Math.abs(center.z + camera.near) > sphere.radius) {
            scene.remove(proxy);
            continue;
          }
          const geometry = exterior(original);
          if (geometry) proxy.geometry = geometry;
          else scene.remove(proxy);
        }
      }
      if (!scenes[0].children.length) {
        for (const scene of scenes) scene.clear();
        candidates.length = 0;
        return null;
      }
      if (!target) {
        target = new THREE.WebGLRenderTarget(width, height, {
          stencilBuffer: true,
        });
        composite.uniforms.mask.value = target.texture;
      }
      const previous = renderer.getRenderTarget(),
        face = renderer.getActiveCubeFace(),
        mip = renderer.getActiveMipmapLevel(),
        alpha = renderer.getClearAlpha(),
        autoClear = renderer.autoClear,
        shadows = renderer.shadowMap.enabled;
      renderer.getClearColor(clearColor);
      try {
        renderer.autoClear = false;
        renderer.shadowMap.enabled = false;
        renderer.setRenderTarget(target);
        renderer.setClearColor(0, 0);
        renderer.clear();
        for (const scene of scenes) renderer.render(scene, camera);
        renderer.setRenderTarget(previous, face, mip);
        quad.render(renderer);
        stats.active = true;
        stats.meshes = scenes[0].children.length;
        return target.texture;
      } finally {
        renderer.setRenderTarget(previous, face, mip);
        renderer.setClearColor(clearColor, alpha);
        renderer.autoClear = autoClear;
        renderer.shadowMap.enabled = shadows;
        for (const scene of scenes) scene.clear();
        candidates.length = 0;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      invalidate();
      for (const pool of pools) pool.dispose();
      for (const geometry of owned) geometry.dispose();
      owned.clear();
      for (const material of [...stencil, fill, composite]) material.dispose();
      quad.dispose();
    },
  };
}
