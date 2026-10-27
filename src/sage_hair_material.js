import { MathUtils } from "three";
const s = (a, b, x) => MathUtils.smoothstep(x, a, b);
/** 按当前人物实体的发际、披发与长须分区，保持脸部、发冠和衣袍原色。 */
export function sageHairWeight(x, y, z) {
  const ax = Math.abs(x);
  const scalp =
    s(
      0.366 + 0.018 * (1 - s(-0.03, 0.018, z)),
      0.375 + 0.018 * (1 - s(-0.03, 0.018, z)),
      y,
    ) *
    (1 - s(0.4, 0.409, y));
  const back =
    s(0.073, 0.087, z) *
    s(0.015, 0.05, y) *
    (1 - s(0.36, 0.385, y)) *
    (1 - s(0.037, 0.065, ax));
  const sides =
    s(0.025, 0.034, ax) *
    (1 - s(0.049, 0.064, ax)) *
    s(-0.018, 0.001, z) *
    s(0.305, 0.322, y) *
    (1 - s(0.368, 0.39, y));
  const beard =
    (1 - s(0.019, 0.033, ax)) *
    (1 - s(-0.026, -0.018, z)) *
    s(0.257, 0.274, y) *
    (1 - s(0.316, 0.328, y));
  const moustache =
    (1 - s(0.018, 0.026, ax)) *
    (1 - s(-0.041, -0.034, z)) *
    s(0.324 - ax * 0.3, 0.331 - ax * 0.3, y) *
    (1 - s(0.341 - ax * 0.3, 0.346 - ax * 0.3, y));
  return Math.max(
    scalp * (1 - s(0.034, 0.041, ax)),
    back,
    sides,
    beard,
    moustache,
  );
}
/** 仅改变发须反照率，保留色图细节和真实光照，不增加自发光。 */
export function applySageHairMaterial(material, geometry) {
  const p = geometry.attributes.position;
  const weights = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++)
    weights[i] = sageHairWeight(p.getX(i), p.getY(i), p.getZ(i));
  geometry.setAttribute("sageHair", new p.constructor(weights, 1));
  material.onBeforeCompile = (shader) => {
    shader.vertexShader =
      "attribute float sageHair; varying float vSageHair;\n" +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvSageHair = sageHair;",
    );
    shader.fragmentShader =
      "varying float vSageHair;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      float hairLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
      vec3 silverHair = vec3(0.94, 0.965, 1.0) * (0.55 + 0.4 * sqrt(clamp(hairLuma, 0.0, 1.0)));
      diffuseColor.rgb = mix(diffuseColor.rgb, silverHair, vSageHair);`,
    );
  };
  material.customProgramCacheKey = () => "sage_silver_hair_v1";
}
