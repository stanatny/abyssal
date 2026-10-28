import * as THREE from "three";

/** 浅湾沙纹与砾质斑块；仅改水下浅段着色，远处滤去细纹，保持权威海床。 */
export function finishOdysseyShallows(material) {
  const previous = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_begin>",
      `float shallowWeight=smoothstep(-560.,-430.,vTroyPosition.z)*(1.-smoothstep(-2.,2.,vTroyPosition.y))*(1.-vTroyWeight);
      if(shallowWeight>.001){
        vec3 sp=vTroyPosition;
        float bed=detailNoise(vec3(sp.x*.055,0.,sp.z*.055));
        float gravel=smoothstep(.48,.68,bed);
        float footprint=max(length(dFdx(sp)),length(dFdy(sp)));
        float resolveRipple=1.-smoothstep(.18,.85,footprint);
        float wave=sin(sp.x*2.5+sp.z*.7+sin(sp.z*.13)*2.4);
        float fine=detailNoise(sp*3.6);
        float shell=smoothstep(.69,.84,fine)*(1.-smoothstep(.08,.5,footprint));
        vec3 sandTone=diffuseColor.rgb*vec3(1.07,1.02,.88);
        vec3 gravelTone=diffuseColor.rgb*vec3(.69,.78,.72)*( .84+fine*.25);
        vec3 bedColor=mix(sandTone,gravelTone,gravel*.7);
        bedColor*=1.+wave*resolveRipple*.085*(1.-gravel);
        bedColor+=vec3(.09,.08,.055)*shell*gravel;
        diffuseColor.rgb=mix(diffuseColor.rgb,bedColor,shallowWeight);
        relief+=shallowWeight*(wave*.15*resolveRipple*(1.-gravel)+fine*.06*gravel);
      }
      #include <normal_fragment_begin>`,
    );
  };
  material.customProgramCacheKey = () => key + "_odyssey_shallows_v1";
}

/** 根部固定的海草束；叶片有不同弯曲和高度，避免规则的三叉剪影。 */
export function odysseySeagrassGeometry() {
  const p = [],
    uv = [],
    indices = [];
  for (let blade = 0; blade < 7; blade++) {
    const base = p.length / 3,
      angle = blade * 2.399,
      h = 0.7 + (blade % 4) * 0.15;
    for (let r = 0; r <= 7; r++) {
      const t = r / 7,
        bend = t * t * (0.22 + (blade % 3) * 0.15),
        width = 0.045 * Math.sin(Math.PI * t) * (0.8 + blade * 0.08) + 0.002;
      for (const side of [-1, 1]) {
        const x = bend + side * width,
          z = Math.sin(t * 3.4 + blade) * t * t * 0.13;
        p.push(
          Math.cos(angle) * x - Math.sin(angle) * z,
          h * (t - 0.1 * t * t),
          Math.sin(angle) * x + Math.cos(angle) * z,
        );
        uv.push((side + 1) / 2, t);
      }
      if (r < 7) {
        const a = base + r * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** HF 近景与同源简模按距离分档，保留加载失败时的原型，场景退出后不再挂载。 */
export function createOdysseyShallows(
  parent,
  keep,
  {
    rows,
    fallbacks,
    heightAt,
    loadAssets = () => import("./odyssey_shallows_asset.js"),
  },
) {
  const root = new THREE.Group();
  root.name = "odyssey_shallow_habitats";
  parent.add(root);
  const state = { status: "idle", assets: null, placements: [], batches: [] };
  root.userData.shallows = state;
  let disposed = false,
    promise = null,
    lastAttempt = -Infinity,
    lastUpdate = -Infinity;
  const dummy = new THREE.Object3D(),
    point = new THREE.Vector3(),
    normal = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0),
    q = new THREE.Quaternion();
  const mat = new THREE.Matrix4(),
    tint = new THREE.Color();
  function prepare(t = 0) {
    if (disposed || promise || state.status === "ready" || t - lastAttempt < 5)
      return promise;
    lastAttempt = t;
    state.status = "loading";
    promise = loadAssets()
      .then((module) => {
        if (disposed) return;
        const assets = module.createOdysseyShallowAssets(keep);
        state.assets = assets;
        for (const [kind, placements] of Object.entries(rows)) {
          const asset = assets[kind];
          if (!asset || !placements.length) continue;
          const matrices = [],
            colors = [],
            base = asset.geometry.attributes.position;
          const foot =
            asset.geometry.boundingBox.min.y +
            0.08 *
              (asset.geometry.boundingBox.max.y -
                asset.geometry.boundingBox.min.y);
          for (const row of placements) {
            dummy.position.set(row.x, 0, row.z);
            const e = Math.max(0.3, row.size * 0.3),
              dx =
                (heightAt(row.x + e, row.z) - heightAt(row.x - e, row.z)) /
                (2 * e),
              dz =
                (heightAt(row.x, row.z + e) - heightAt(row.x, row.z - e)) /
                (2 * e);
            normal.set(-dx, 1, -dz).normalize();
            dummy.quaternion.setFromUnitVectors(up, normal);
            dummy.quaternion.multiply(q.setFromAxisAngle(up, row.yaw));
            if (row.fall) dummy.rotateZ(row.fall);
            dummy.scale.setScalar(row.size);
            dummy.updateMatrix();
            let minGap = Infinity;
            for (let i = 0; i < base.count; i++) {
              if (!row.fall && base.getY(i) > foot) continue;
              point.fromBufferAttribute(base, i).applyMatrix4(dummy.matrix);
              minGap = Math.min(minGap, point.y - heightAt(point.x, point.z));
            }
            dummy.position.y = -minGap - row.size * 0.035;
            dummy.updateMatrix();
            matrices.push(...dummy.matrix.elements);
            const tone = 0.92 + (row.seed % 4) * 0.025;
            colors.push(tone, tone, tone);
            state.placements.push({
              kind,
              ...row,
              y: dummy.position.y,
              matrix: dummy.matrix.toArray(),
            });
          }
          const near = new THREE.InstancedMesh(
              asset.geometry,
              asset.material,
              placements.length,
            ),
            far = new THREE.InstancedMesh(
              asset.farGeometry,
              asset.farMaterial,
              placements.length,
            );
          near.name = `odyssey_${kind}_close`;
          far.name = `odyssey_${kind}_distant`;
          for (const mesh of [near, far]) {
            mesh.count = 0;
            mesh.visible = false;
            root.add(mesh);
          }
          state.batches.push({
            near,
            far,
            count: placements.length,
            matrices: new Float32Array(matrices),
            colors: new Float32Array(colors),
            close: new Uint8Array(placements.length),
          });
        }
        for (const f of fallbacks) f.visible = false;
        state.status = "ready";
        lastUpdate = -Infinity;
      })
      .catch(() => {
        if (!disposed) state.status = "error";
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
      state.batches.length = 0;
      state.placements.length = 0;
    },
  });
  const api = {
    root,
    state,
    prepare,
    update(t, position, highQuality = true) {
      if (disposed) return;
      if (position.z > -520) prepare(t);
      if (
        state.status !== "ready" ||
        (t >= lastUpdate && t - lastUpdate < 0.35)
      )
        return;
      lastUpdate = t;
      for (const b of state.batches) {
        let n = 0,
          f = 0;
        for (let i = 0; i < b.count; i++) {
          const offset = i * 16,
            dist = Math.hypot(
              b.matrices[offset + 12] - position.x,
              b.matrices[offset + 13] - position.y,
              b.matrices[offset + 14] - position.z,
            );
          if (dist > (highQuality ? 230 : 170)) continue;
          const close = dist < (highQuality ? 30 : 20) + (b.close[i] ? 4 : 0);
          b.close[i] = Number(close);
          const mesh = close ? b.near : b.far,
            index = close ? n++ : f++;
          mat.fromArray(b.matrices, offset);
          tint.fromArray(b.colors, i * 3);
          mesh.setMatrixAt(index, mat);
          mesh.setColorAt(index, tint);
        }
        for (const [mesh, count] of [
          [b.near, n],
          [b.far, f],
        ]) {
          mesh.count = count;
          mesh.visible = count > 0;
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
          mesh.computeBoundingBox();
          mesh.computeBoundingSphere();
        }
      }
    },
  };
  if (typeof window !== "undefined") prepare();
  return api;
}
