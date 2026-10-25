import * as THREE from "three";
import { AMAZON_WORLD as W, amazonSeabedHeight } from "./amazon_config.js";
import { amazonWaterlilyLayout } from "./amazon_waterlilies.js";

/** 涟漪只扰动法线；水位固定，避免穿过王莲叶片的毫米级水线。 */
export function createAmazonWaterSurface(parent, resources, time) {
  const keep = (r) => (resources.add(r), r);
  const geometry = keep(
    new THREE.PlaneGeometry(940, W.maxZ - W.minZ + 80, 32, 48),
  );
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, W.surfaceY, (W.minZ + W.maxZ) * 0.5);
  const p = geometry.attributes.position,
    depths = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    p.setY(i, W.surfaceY);
    depths[i] = Math.max(
      0,
      W.surfaceY - amazonSeabedHeight(p.getX(i), p.getZ(i)),
    );
  }
  geometry.setAttribute("riverDepth", new THREE.BufferAttribute(depths, 1));
  const material = keep(
    new THREE.MeshStandardMaterial({
      color: "#344d3c",
      transparent: true,
      opacity: 1,
      roughness: 0.42,
      metalness: 0.04,
      envMapIntensity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  material.onBeforeCompile = (shader) => {
    shader.uniforms.riverTime = time;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute float riverDepth;
        varying vec3 vRiverWorld;
        varying float vRiverDepth;`,
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vRiverWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vRiverDepth = riverDepth;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float riverTime;
        varying vec3 vRiverWorld;
        varying float vRiverDepth;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float fromAbove = smoothstep(3.7, 4.3, cameraPosition.y);
        vec3 riverView = normalize(cameraPosition - vRiverWorld);
        float grazing = pow(1.0 - abs(riverView.y), 3.0);
        float deepWater = 1.0 - exp(-vRiverDepth * 0.045);
        float opticalPath = (1.0 - exp(-length(vViewPosition) * 0.055)) * deepWater;
        float aboveAlpha = clamp(0.60 + 0.30 * opticalPath + 0.08 * grazing, 0.60, 0.95);
        diffuseColor.a *= mix(0.15 + 0.13 * grazing, aboveAlpha, fromAbove);
        diffuseColor.rgb *= mix(1.0, 0.88 + grazing * 0.16, fromAbove * deepWater);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        vec2 rp = vRiverWorld.xz;
        float ra = dot(rp, vec2(0.47, 0.24)) - riverTime * 0.85;
        float rb = dot(rp, vec2(-0.19, 0.61)) - riverTime * 1.1;
        vec2 ripple = vec2(0.47, 0.24) * cos(ra) * 0.10
          + vec2(-0.19, 0.61) * cos(rb) * 0.045;
        vec3 riverNormal = normalize(vec3(-ripple.x, 1.0, -ripple.y));
        normal = normalize(mat3(viewMatrix) * riverNormal) * faceDirection;`,
      );
  };
  material.customProgramCacheKey = () => "amazon_river_water_v2";
  const water = new THREE.Mesh(geometry, material);
  water.name = "amazon_river_water";
  water.renderOrder = 1;
  parent.add(water);

  // 一次绘制所有叶缘轻微水纹，不增加光源、纹理或离屏渲染。
  const leaves = amazonWaterlilyLayout().leaves,
    ringGeometry = keep(new THREE.PlaneGeometry(1, 1)),
    ringMaterial = keep(
      new THREE.ShaderMaterial({
        uniforms: { riverTime: time },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        vertexShader: `
          uniform float riverTime;
          varying vec2 vRing;
          varying float vRadius;
          varying float vPhase;
          varying float vDistance;
          void main() {
            vRing = uv * 2.0 - 1.0;
            float diameter = length(instanceMatrix[0].xyz);
            vRadius = (diameter * 0.5 - 0.55) / (diameter * 0.5);
            vPhase = instanceMatrix[3].x * 1.73 + instanceMatrix[3].z * 0.37;
            vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
            vDistance = distance(cameraPosition, world.xyz);
            gl_Position = projectionMatrix * viewMatrix * world;
          }`,
        fragmentShader: `
          uniform float riverTime;
          varying vec2 vRing;
          varying float vRadius;
          varying float vPhase;
          varying float vDistance;
          void main() {
            float r = length(vRing);
            float edge = max(fwidth(r) * 1.3, 0.008);
            float ripple = vRadius + 0.05 + fract(riverTime * 0.22 + vPhase) * 0.3;
            float meniscus = 1.0 - smoothstep(0.008, 0.008 + edge, abs(r-vRadius-0.02));
            float wave = (1.0 - smoothstep(0.006, 0.006 + edge, abs(r-ripple))) * (1.0-smoothstep(vRadius+0.05,1.0,r));
            float alpha = (meniscus * 0.12 + wave * 0.06)
              * smoothstep(3.8, 4.5, cameraPosition.y)
              * (1.0-smoothstep(35.0, 100.0, vDistance));
            if (alpha < 0.002) discard;
            gl_FragColor = vec4(0.35, 0.43, 0.28, alpha);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    );
  const rings = new THREE.InstancedMesh(
      ringGeometry,
      ringMaterial,
      leaves.length,
    ),
    dummy = new THREE.Object3D();
  leaves.forEach((l, i) => {
    dummy.position.set(l.x, W.surfaceY + 0.006, l.z);
    dummy.rotation.set(-Math.PI / 2, 0, 0);
    dummy.scale.setScalar(l.diameter + 1.1);
    dummy.updateMatrix();
    rings.setMatrixAt(i, dummy.matrix);
  });
  rings.name = "amazon_leaf_water_contacts";
  rings.renderOrder = 2;
  rings.computeBoundingSphere();
  parent.add(rings);
  return {
    water,
    rings,
    update(position) {
      rings.visible = position.y > W.surfaceY - 12;
    },
  };
}
