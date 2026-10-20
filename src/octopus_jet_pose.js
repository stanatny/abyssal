import * as THREE from "three";

/**
 * Offline arm-frame transport retains each arm/cup cross-section. The halfway
 * target avoids flattening during a large roll. Only the shared asset owns these
 * buffers; individual meshes retain their own pose influences.
 */
export function prepareOctopusJetPose(geometry, pose) {
  geometry.morphAttributes.position = [];
  geometry.morphAttributes.normal = [];
  for (const target of pose.targets) {
    const decode = (encoded, Type) => {
      const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
      return new Type(bytes.buffer);
    };
    const packed = decode(target.position, Uint16Array),
      position = new Float32Array(packed.length),
      packedNormal = decode(target.normal, Int16Array),
      normal = new Float32Array(packed.length),
      vector = new THREE.Vector3();
    for (let i = 0; i < packed.length; i++) {
      const axis = i % 3;
      position[i] =
        target.min[axis] +
        (packed[i] / 65535) * (target.max[axis] - target.min[axis]);
      normal[i] = packedNormal[i] / 32767;
    }
    for (let i = 0; i < normal.length; i += 3)
      vector.fromArray(normal, i).normalize().toArray(normal, i);
    geometry.morphAttributes.position.push(
      new THREE.BufferAttribute(position, 3),
    );
    geometry.morphAttributes.normal.push(new THREE.BufferAttribute(normal, 3));
  }
  geometry.computeBoundingSphere();
}

/** Interpolate neighboring poses instead of collapsing a large roll to a line. */
export function setOctopusJetBlend(mesh, amount) {
  const blend = THREE.MathUtils.clamp(amount, 0, 1);
  mesh.morphTargetInfluences[0] = blend <= 0.5 ? blend * 2 : (1 - blend) * 2;
  mesh.morphTargetInfluences[1] = Math.max(0, blend * 2 - 1);
}
