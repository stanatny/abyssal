import * as T from "three";
import data from "./assets/models/sage_jian_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
let cache;
/** 御剑真君的乘剑、剑阵和飞射共用同一实体剑与色图，实例不持有待释放资源。 */
export function sageJianAsset() {
  if (cache) return cache;
  const geometry = decodeOrganicMesh(data, null, (x, y, z, c) =>
    c.set(y > -0.16 ? 0xbac9d0 : y > -0.22 ? 0x8c7751 : 0x304e4b),
  );
  geometry.deleteAttribute("skinIndex");
  geometry.deleteAttribute("skinWeight");
  geometry.translate(0, 0.03, 0);
  const source = geometry.attributes.position;
  const bladeTip = 0.7715461239218712 / 2.05;
  for (let i = 0; i < source.count; i++)
    if (source.getY(i) > 0)
      source.setY(i, (source.getY(i) * bladeTip) / (data.max[1] + 0.03));
  const ridingGeometry = geometry.clone(),
    p = ridingGeometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i),
      z = p.getZ(i);
    const blade = T.MathUtils.smoothstep(y, -0.09, -0.055);
    p.setX(i, p.getX(i) * (1 + 0.8 * blade));
    // 整段剑身保持同一条直脊；不再单独抬高中段形成弓形承脚面。
    const flatBlade = T.MathUtils.smoothstep(y, -0.09, -0.055);
    const centeredZ = z - 0.00035;
    const bevel = T.MathUtils.clamp(centeredZ / 0.0001, -1, 1);
    const point = 1 - T.MathUtils.smoothstep(y, 0.36, bladeTip);
    p.setZ(i, T.MathUtils.lerp(z, bevel * 0.009 * point, flatBlade));
  }
  // 量化的 Int16 法线不能直接累加微小三角面的面积向量；先改用浮点缓冲。
  ridingGeometry.setAttribute(
    "normal",
    new T.Float32BufferAttribute(new Float32Array(p.count * 3), 3),
  );
  ridingGeometry.computeVertexNormals();
  const fittedNormal = ridingGeometry.attributes.normal,
    originalNormal = geometry.attributes.normal;
  for (let i = 0; i < p.count; i++)
    if (
      Math.hypot(
        fittedNormal.getX(i),
        fittedNormal.getY(i),
        fittedNormal.getZ(i),
      ) < 0.5
    )
      fittedNormal.setXYZ(
        i,
        originalNormal.getX(i),
        originalNormal.getY(i),
        originalNormal.getZ(i),
      );
  for (const g of [geometry, ridingGeometry]) {
    g.computeBoundingBox();
    g.computeBoundingSphere();
  }
  const material = new T.MeshStandardMaterial({
    roughness: 0.52,
    metalness: 0.28,
    vertexColors: true,
  });
  material.name = "sage_jian_silver_bronze_jade";
  const prepare = createMaterialPreparation(
    [
      {
        name: "color",
        url: new URL(
          "./assets/models/sage_jian_hf_color.webp",
          import.meta.url,
        ),
        colorSpace: T.SRGBColorSpace,
        apply(texture) {
          material.map = texture;
          material.vertexColors = false;
          material.needsUpdate = true;
        },
      },
    ],
    (ready) => {
      material.userData.texturesReady = ready;
    },
  );
  return (cache = { geometry, ridingGeometry, material, prepare });
}
/** 局部 +Y 是剑尖；调用方保留既有发射方向和尺度。 */
export function createSageJian(
  parent,
  position = [0, 0, 0],
  scale = 1,
  riding = false,
) {
  const a = sageJianAsset(),
    group = new T.Group();
  group.name = riding ? "sage_riding_greatsword" : "sage_cloud_jian";
  group.position.fromArray(position);
  group.scale.setScalar(scale);
  const mesh = new T.Mesh(riding ? a.ridingGeometry : a.geometry, a.material);
  mesh.name = "sword_blade";
  group.add(mesh);
  parent.add(group);
  void a.prepare();
  return group;
}
