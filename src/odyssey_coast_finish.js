import * as THREE from "three";
import { troyTerraceHeight } from "./odyssey_coast_layout.js";

/** 陆岸单独使用世界尺度的石灰岩层理与潮湿线，原有深海材质不受影响。 */
export function finishTroyStone(material, { terrain = false } = {}) {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec3 vTroyPosition; varying vec3 vTroyNormal;
      ${terrain ? "attribute float troyCoastWeight; varying float vTroyWeight;" : ""}`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      vTroyPosition=(modelMatrix*vec4(position,1.)).xyz;
      vTroyNormal=normalize(mat3(modelMatrix)*normal);
      ${terrain ? "vTroyWeight=troyCoastWeight;" : ""}`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec3 vTroyPosition; varying vec3 vTroyNormal;
      ${terrain ? "varying float vTroyWeight;" : ""}`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        float coastWeight=${terrain ? "vTroyWeight" : "1."};
        if(coastWeight>.001){
        vec3 coastP=vTroyPosition;
        float mineral=detailNoise(coastP*.23);
        float layering=sin(coastP.y*2.8+mineral*4.+coastP.z*.045);
        float seam=smoothstep(.72,.99,layering);
        float wet=1.-smoothstep(3.4,9.5,coastP.y);
        float horizontal=pow(max(0.,normalize(vTroyNormal).y),4.);
        float stains=detailNoise(vec3(coastP.x*.22,coastP.y*.055,coastP.z*.31));
        vec3 limestone=diffuseColor.rgb*vec3(1.06,.94,.78);
        limestone*=.55+mineral*.7-seam*.19;
        limestone*=.65+stains*.6;
        vec3 drySand=mix(vec3(.26,.19,.105),vec3(.43,.33,.19),mineral);
        vec3 shoreColor=mix(limestone,drySand,horizontal*${terrain ? ".8" : ".08"});
        shoreColor=mix(shoreColor,shoreColor*vec3(.48,.53,.49),wet*.63);
        diffuseColor.rgb=mix(diffuseColor.rgb,shoreColor,coastWeight);
        relief+=coastWeight*(mineral*.22-seam*.08)*(1.-horizontal*.75);
        roughnessFactor=mix(roughnessFactor,mix(.95,.74,wet),coastWeight);
        }
      `,
      );
  };
  material.customProgramCacheKey = () => `troy_coast_geology_${terrain}_v2`;
  return material;
}

/** 复用已验收的 HF 裂岩，仅共享源数据，地图独立持有 GPU 资源。 */
export function createTroyCoastalRubble(asset) {
  const sites = [];
  // 岸端较大的层状露头，保留城门、码头与木马的轮廓。
  for (const side of [-1, 1])
    for (let i = 0; i < 9; i++) {
      const z = 82 - i * 30 + Math.sin(i * 1.73 + side) * 9,
        x = side * (175 + Math.sin(i * 1.73 + side) * 11);
      sites.push([x, z, 13 + (i % 3) * 5, i + side * 11]);
    }
  for (const [i, x] of [-174, -146, -119, -49, 44, 96, 157, 182].entries())
    sites.push([x, 99 + Math.sin(i * 1.7) * 2, 7 + (i % 3) * 1.8, i + 37]);
  const mesh = new THREE.InstancedMesh(
    asset.geometry,
    asset.material,
    sites.length,
  );
  mesh.name = "troy_limestone_scree_and_outcrops";
  const dummy = new THREE.Object3D(),
    tint = new THREE.Color();
  sites.forEach(([x, z, size, seed], i) => {
    // 部分埋入岸坡，裂岩底部不浮在陡坡上；不修改权威水域碰撞。
    const y = troyTerraceHeight(x, z),
      e = size * 0.25;
    const dx =
      (troyTerraceHeight(x + e, z) - troyTerraceHeight(x - e, z)) / (2 * e);
    const dz =
      (troyTerraceHeight(x, z + e) - troyTerraceHeight(x, z - e)) / (2 * e);
    dummy.position.set(x, y - size * 0.13, z);
    // 露头顺岸坡法线嵌入；不能用水平石块悬挂在斜面上，也不能整体压到水下。
    dummy.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(-dx, 1, -dz).normalize(),
    );
    dummy.quaternion.multiply(
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        seed * 2.399,
      ),
    );
    dummy.scale.set(size, size * (0.8 + (i % 3) * 0.12), size);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    tint.setRGB(1, 0.94, 0.81).multiplyScalar(0.86 + (i % 4) * 0.04);
    mesh.setColorAt(i, tint);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  return mesh;
}
