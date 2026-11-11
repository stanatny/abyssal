import * as THREE from "three";
const up = new THREE.Vector3(0, 1, 0);

/** 只取近远景实际引用的底部顶点；简模缓冲区中未引用的原顶点不属于接触面。 */
export function sceneryFootSamples(geometries, fraction = 0.06) {
  return geometries.map((geometry) => {
    const position = geometry.attributes.position,
      referenced = geometry.index
        ? [...new Set(geometry.index.array)]
        : Array.from({ length: position.count }, (_, i) => i);
    let min = Infinity,
      max = -Infinity;
    for (const i of referenced) {
      min = Math.min(min, position.getY(i));
      max = Math.max(max, position.getY(i));
    }
    return {
      position,
      ids: referenced.filter(
        (i) => position.getY(i) <= min + (max - min) * fraction,
      ),
    };
  });
}

/** 直立装饰顺坡生长，所有可见LOD底面都略微入土；不用于倒伏或悬挂物件。 */
export function seatUprightScenery(
  dummy,
  { x, z, yaw, scale, heightAt, samples, embed = 0.08, step = 0.2 },
) {
  const normal = new THREE.Vector3(
    heightAt(x - step, z) - heightAt(x + step, z),
    2 * step,
    heightAt(x, z - step) - heightAt(x, z + step),
  ).normalize();
  dummy.position.set(x, 0, z);
  dummy.quaternion.setFromUnitVectors(up, normal);
  dummy.rotateY(yaw);
  if (Array.isArray(scale)) dummy.scale.set(...scale);
  else dummy.scale.setScalar(scale);
  dummy.updateMatrix();
  const point = new THREE.Vector3();
  let maximum = -Infinity;
  for (const { position, ids } of samples)
    for (const id of ids) {
      point.fromBufferAttribute(position, id).applyMatrix4(dummy.matrix);
      maximum = Math.max(maximum, point.y - heightAt(point.x, point.z));
    }
  dummy.position.y = -maximum - embed;
  dummy.updateMatrix();
  return dummy.matrix;
}
