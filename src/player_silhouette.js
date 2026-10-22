import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";

const skinVertex = `
  #include <common>
  #include <morphtarget_pars_vertex>
  #include <skinning_pars_vertex>
  void main() {
    #include <skinbase_vertex>
    #include <begin_vertex>
    #include <morphtarget_vertex>
    #include <skinning_vertex>
    #include <project_vertex>
  }`;

/** 只借用当前可见皮肤；不复制骨架、修改源材质或绘制火焰等透明特效。 */
export function createSilhouetteProxyPool(materialForSide) {
  let proxies = new WeakMap();
  const coveredGeometry = new WeakMap();
  const scene = new THREE.Scene();
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  function populate(roots) {
    scene.clear();
    for (const root of roots) {
      root.traverseVisible((source) => {
        if (
          !source.isMesh ||
          source.isInstancedMesh ||
          source.userData.noShadow
        )
          return;
        const materials = Array.isArray(source.material)
          ? source.material
          : [source.material];
        const mapped = materials.map((m) =>
          m.visible && !m.transparent && m.opacity >= 0.99
            ? materialForSide(m.side)
            : hidden,
        );
        if (mapped.every((m) => m === hidden)) return;
        let proxy = proxies.get(source);
        if (!proxy) {
          proxy = source.isSkinnedMesh
            ? new THREE.SkinnedMesh(source.geometry, mapped[0])
            : new THREE.Mesh(source.geometry, mapped[0]);
          proxy.matrixAutoUpdate = false;
          proxy.frustumCulled = false;
          proxies.set(source, proxy);
        }
        // 同一侧面的完整不透明材质组可合成一次遮罩绘制，保留有缺口的组。
        let complete = coveredGeometry.get(source.geometry);
        if (complete === undefined) {
          let end = 0;
          complete = source.geometry.groups
            .slice()
            .sort((a, b) => a.start - b.start)
            .every((g) => {
              const contiguous = g.start === end;
              end += g.count;
              return contiguous;
            });
          complete &&=
            end ===
            (source.geometry.index?.count ??
              source.geometry.attributes.position.count);
          coveredGeometry.set(source.geometry, complete);
        }
        proxy.material =
          !Array.isArray(source.material) ||
          (complete && mapped.every((m) => m === mapped[0]))
            ? mapped[0]
            : mapped;
        proxy.geometry = source.geometry;
        proxy.matrix.copy(source.matrixWorld);
        proxy.morphTargetInfluences = source.morphTargetInfluences;
        if (source.isSkinnedMesh) {
          proxy.bindMode = source.bindMode;
          proxy.skeleton = source.skeleton;
          proxy.bindMatrix.copy(source.bindMatrix);
          proxy.bindMatrixInverse.copy(source.bindMatrixInverse);
        }
        scene.add(proxy);
      });
    }
    return scene;
  }
  return {
    scene,
    populate,
    dispose() {
      scene.clear();
      proxies = new WeakMap();
      hidden.dispose();
    },
  };
}

/** 保守粗筛只决定是否值得绘制；真正遮挡由当前变形皮肤的逐像素深度决定。 */
export function silhouetteCandidates(camera, avatar, entities, bosses, out) {
  out.length = 0;
  const a = camera.position,
    b = avatar.position;
  const dx = b.x - a.x,
    dy = b.y - a.y,
    dz = b.z - a.z;
  const distance2 = dx * dx + dy * dy + dz * dz;
  const playerRadius = Math.max(1, avatar.scale.x * 0.65);
  function add(mesh) {
    if (!mesh?.visible || mesh === avatar || mesh.userData.length < 8) return;
    const p = mesh.position;
    const t = THREE.MathUtils.clamp(
      ((p.x - a.x) * dx + (p.y - a.y) * dy + (p.z - a.z) * dz) /
        Math.max(0.001, distance2),
      0,
      1,
    );
    const radius = mesh.userData.length * 0.8 + playerRadius;
    const d2 =
      (p.x - a.x - t * dx) ** 2 +
      (p.y - a.y - t * dy) ** 2 +
      (p.z - a.z - t * dz) ** 2;
    if (d2 < radius * radius) out.push(mesh);
  }
  for (const entry of bosses)
    if (entry.enabled && !entry.state.defeated) add(entry.mesh);
  for (const entity of entities) if (entity.alive !== false) add(entity.mesh);
  out.sort(
    (x, y) => x.position.distanceToSquared(a) - y.position.distanceToSquared(a),
  );
  out.length = Math.min(out.length, 4);
  return out;
}

/** 固定追尾画面上的局部遮挡轮廓；两张有界遮罩，不重绘整个海域。 */
export function createPlayerSilhouette() {
  const size = new THREE.Vector2(1, 1);
  const step = new THREE.Vector2();
  const candidates = [];
  const shared = {
    playerMask: { value: null },
    playerDepth: { value: null },
    size: { value: size },
    nearFar: { value: new THREE.Vector2(0.15, 650) },
  };
  const playerMaterials = new Map(),
    occluderMaterials = new Map();
  const playerPool = createSilhouetteProxyPool((side) => {
    if (!playerMaterials.has(side))
      playerMaterials.set(
        side,
        new THREE.ShaderMaterial({
          side,
          vertexShader: skinVertex,
          fragmentShader: "void main(){ gl_FragColor=vec4(1.0); }",
          toneMapped: false,
        }),
      );
    return playerMaterials.get(side);
  });
  const occluderPool = createSilhouetteProxyPool((side) => {
    if (!occluderMaterials.has(side))
      occluderMaterials.set(
        side,
        new THREE.ShaderMaterial({
          side,
          uniforms: shared,
          vertexShader: skinVertex,
          fragmentShader: `
            #include <packing>
            uniform sampler2D playerMask, playerDepth;
            uniform vec2 size, nearFar;
            void main() {
              vec2 uv=gl_FragCoord.xy/size;
              if(texture2D(playerMask,uv).r<0.01) discard;
              float playerZ=-perspectiveDepthToViewZ(texture2D(playerDepth,uv).r,nearFar.x,nearFar.y);
              float bodyZ=-perspectiveDepthToViewZ(gl_FragCoord.z,nearFar.x,nearFar.y);
              if(bodyZ+0.06>=playerZ) discard;
              gl_FragColor=vec4(1.0);
            }`,
          depthTest: false,
          depthWrite: false,
          toneMapped: false,
        }),
      );
    return occluderMaterials.get(side);
  });
  const overlay = new THREE.ShaderMaterial({
    uniforms: {
      playerMask: shared.playerMask,
      occlusion: { value: null },
      nearCap: { value: null },
      hasNearCap: { value: false },
      step: { value: step },
      color: { value: new THREE.Color("#ede6ce") },
    },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      uniform sampler2D playerMask, occlusion, nearCap;
      uniform bool hasNearCap;
      uniform vec2 step;
      uniform vec3 color;
      varying vec2 vUv;
      void main(){
        float center=texture2D(playerMask,vUv).r;
        float hidden=max(texture2D(occlusion,vUv).r,hasNearCap?texture2D(nearCap,vUv).a:0.0);
        float low=center, high=center, covered=hidden;
        for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++){
          vec2 uv=vUv+vec2(float(x),float(y))*step;
          float m=texture2D(playerMask,uv).r;
          low=min(low,m);high=max(high,m);
          covered=max(covered,max(texture2D(occlusion,uv).r,hasNearCap?texture2D(nearCap,uv).a:0.0));
        }
        float edge=(high-low)*covered;
        float alpha=clamp(edge*0.82+center*hidden*0.045,0.0,0.86);
        if(alpha<0.005) discard;
        gl_FragColor=vec4(color,alpha);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const quad = new FullScreenQuad(overlay);
  const clearColor = new THREE.Color();
  let playerTarget,
    occlusionTarget,
    disposed = false;
  const stats = {
    active: false,
    candidates: 0,
    playerMeshes: 0,
    bodyMeshes: 0,
  };
  function invalidate() {
    playerTarget?.dispose();
    occlusionTarget?.dispose();
    playerTarget = occlusionTarget = null;
    shared.playerMask.value = shared.playerDepth.value = null;
    overlay.uniforms.occlusion.value = null;
  }
  return {
    stats,
    resize(width, height) {
      const ratio = Math.min(1, 960 / width, 640 / height);
      const w = Math.max(1, Math.round(width * ratio)),
        h = Math.max(1, Math.round(height * ratio));
      if (size.x !== w || size.y !== h) {
        size.set(w, h);
        playerTarget?.setSize(w, h);
        occlusionTarget?.setSize(w, h);
      }
      step.set(1.5 / width, 1.5 / height);
    },
    render(renderer, camera, source, nearCap = null) {
      overlay.uniforms.nearCap.value = nearCap;
      overlay.uniforms.hasNearCap.value = !!nearCap;
      stats.active = false;
      stats.candidates = stats.playerMeshes = stats.bodyMeshes = 0;
      if (disposed || !source?.enabled || !source.avatar?.visible) return;
      const { avatar, entities, bosses } = source;
      silhouetteCandidates(camera, avatar, entities, bosses, candidates);
      if (!candidates.length && !nearCap) return;
      playerPool.populate([avatar]);
      occluderPool.populate(candidates);
      if (
        !playerPool.scene.children.length ||
        (!occluderPool.scene.children.length && !nearCap)
      )
        return;
      if (!playerTarget) {
        playerTarget = new THREE.WebGLRenderTarget(size.x, size.y);
        playerTarget.depthTexture = new THREE.DepthTexture(size.x, size.y);
        occlusionTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
          depthBuffer: false,
        });
        shared.playerMask.value = playerTarget.texture;
        shared.playerDepth.value = playerTarget.depthTexture;
        overlay.uniforms.occlusion.value = occlusionTarget.texture;
      }
      shared.nearFar.value.set(camera.near, camera.far);
      const target = renderer.getRenderTarget(),
        face = renderer.getActiveCubeFace(),
        mip = renderer.getActiveMipmapLevel(),
        autoClear = renderer.autoClear,
        shadow = renderer.shadowMap.enabled,
        alpha = renderer.getClearAlpha();
      renderer.getClearColor(clearColor);
      try {
        renderer.shadowMap.enabled = false;
        renderer.autoClear = false;
        renderer.setClearColor(0x000000, 0);
        renderer.setRenderTarget(playerTarget);
        renderer.clear();
        renderer.render(playerPool.scene, camera);
        renderer.setRenderTarget(occlusionTarget);
        renderer.clear();
        renderer.render(occluderPool.scene, camera);
        renderer.setRenderTarget(target, face, mip);
        quad.render(renderer);
        Object.assign(stats, {
          active: true,
          candidates: candidates.length,
          playerMeshes: playerPool.scene.children.length,
          bodyMeshes: occluderPool.scene.children.length,
        });
      } finally {
        renderer.setRenderTarget(target, face, mip);
        renderer.setClearColor(clearColor, alpha);
        renderer.autoClear = autoClear;
        renderer.shadowMap.enabled = shadow;
        playerPool.scene.clear();
        occluderPool.scene.clear();
        candidates.length = 0;
      }
    },
    invalidate,
    dispose() {
      if (disposed) return;
      disposed = true;
      invalidate();
      playerPool.dispose();
      occluderPool.dispose();
      for (const m of [
        ...playerMaterials.values(),
        ...occluderMaterials.values(),
      ])
        m.dispose();
      overlay.dispose();
      quad.dispose();
    },
  };
}
