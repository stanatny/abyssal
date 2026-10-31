import * as THREE from "three";

/** 为已验收的雕像原网格增加连续肩肘绑定；持戟手和整柄武器同一刚性变换。 */
export function createPoseidonAwakening(
  asset,
  origin,
  scale,
  sourceColliders,
  transformCollider,
) {
  const geometry = asset.geometry.clone(),
    p = geometry.attributes.position;
  const ids = new Uint16Array(p.count * 4),
    weights = new Float32Array(p.count * 4);
  const smooth = THREE.MathUtils.smoothstep;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const weapon = (x < -8.3 && y < 40) || y > 67;
    let arm = smooth(-x, 5.8, 8.6) * smooth(y, 40, 44);
    let fore = smooth(y, 44, 53) * smooth(-x, 6.5, 9.0) * smooth(z, -0.5, 2.5);
    // 叉杆位于臂前；以连续深度权重连接握持处，杜绝分区边界拉出尖刺。
    const grip = y < 40 ? 0 : smooth(z, 1.8, 3.2) * smooth(-x, 7, 9);
    arm = Math.max(arm, grip);
    fore = Math.max(fore, grip);
    if (weapon) {
      arm = 1;
      fore = 1;
    }
    ids.set([0, 1, 2, 0], i * 4);
    weights.set([1 - arm, arm * (1 - fore), arm * fore, 0], i * 4);
  }
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(ids, 4));
  geometry.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(weights, 4),
  );
  const mesh = new THREE.SkinnedMesh(geometry, asset.material);
  mesh.name = "poseidon_hf_monument";
  mesh.position.copy(origin);
  mesh.scale.setScalar(scale);
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const root = new THREE.Bone(),
    shoulder = new THREE.Bone(),
    elbow = new THREE.Bone();
  shoulder.position.set(-7.1, 50, 0);
  elbow.position.set(-3.5, -5.5, 1.6);
  root.add(shoulder);
  shoulder.add(elbow);
  mesh.add(root);
  const skeleton = new THREE.Skeleton([root, shoulder, elbow]);
  mesh.bind(skeleton);
  const eyeMaterial = new THREE.MeshBasicMaterial({
    color: 0x9cfff4,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const eyeGeo = new THREE.SphereGeometry(0.3, 16, 10),
    eyes = [];
  for (const x of [-1.12, 1.12]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMaterial);
    eye.position.set(x, 59.6, 3.35);
    eye.scale.set(1.6, 0.6, 0.7);
    mesh.add(eye);
    eyes.push(eye);
  }
  const tipGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 16, 12),
    eyeMaterial,
  );
  mesh.add(tipGlow);
  const fixed = [],
    moving = [],
    bindings = [];
  for (const c of sourceColliders) {
    const transformed = transformCollider(
      c,
      origin.x,
      origin.y,
      origin.z,
      scale,
      0,
    );
    if (/right_upper_arm|right_forearm|right_hand|trident/.test(c.kind)) {
      moving.push(transformed);
      bindings.push({
        source: c,
        collider: transformed,
        bone: c.kind.includes("upper_arm") ? 1 : 2,
      });
    } else fixed.push(transformed);
  }
  let time = 0,
    active = false,
    disposed = false;
  const transforms = [
    new THREE.Matrix4(),
    new THREE.Matrix4(),
    new THREE.Matrix4(),
  ];
  function update(dt) {
    if (disposed) return;
    if (active) time = Math.min(5, time + Math.max(0, Math.min(dt, 0.1)));
    const progress = smooth(time, 0.5, 4);
    shoulder.rotation.z = -0.8 * progress;
    elbow.rotation.z = 0.8 * progress;
    eyeMaterial.opacity = active ? smooth(time, 0, 0.5) * 0.95 : 0;
    mesh.updateMatrixWorld(true);
    skeleton.bones.forEach((bone, i) =>
      transforms[i]
        .multiplyMatrices(bone.matrixWorld, skeleton.boneInverses[i])
        .multiply(mesh.bindMatrix),
    );
    for (const { source, collider, bone } of bindings) {
      for (const key of ["a", "b"]) {
        const v = new THREE.Vector3(
          source[key].x,
          source[key].y,
          source[key].z,
        ).applyMatrix4(transforms[bone]);
        Object.assign(collider[key], { x: v.x, y: v.y, z: v.z });
      }
    }
    // 戟尖与手臂共用矩阵，光点不能留在旧的高度。
    const tip = new THREE.Vector3(-9.8, 81.5, 4.2).applyMatrix4(transforms[2]);
    mesh.worldToLocal(tip);
    tipGlow.position.copy(tip);
  }
  update(0);
  return {
    mesh,
    fixed,
    moving,
    eyes,
    target: new THREE.Vector3(0, 47.5, 7.4).multiplyScalar(scale).add(origin),
    get progress() {
      return time;
    },
    awaken() {
      active = true;
    },
    update,
    reset() {
      active = false;
      time = 0;
      update(0);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      geometry.dispose();
      skeleton.dispose();
      eyeMaterial.dispose();
      eyeGeo.dispose();
      tipGlow.geometry.dispose();
    },
  };
}
