import * as THREE from "three";

/** 两层有厚度的电弧；预分配实例矩阵，避免平视时细线消失或每帧创建网格。 */
export function createElectricArcs(parent, capacity, name) {
  const group = new THREE.Group();
  group.name = name;
  group.visible = false;
  parent.add(group);
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0xe8faff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  const haloMaterial = coreMaterial.clone();
  haloMaterial.color.setHex(0x55bfff);
  haloMaterial.blending = THREE.AdditiveBlending;
  // 近镜头电弧软化，避免玩家穿过放电中心时被放大的亮条遮住视野。
  for (const material of [coreMaterial, haloMaterial]) {
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying float vArcDepth;",
        )
        .replace(
          "#include <project_vertex>",
          "#include <project_vertex>\nvArcDepth = -mvPosition.z;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying float vArcDepth;",
        )
        .replace(
          "#include <opaque_fragment>",
          "diffuseColor.a *= smoothstep(0.35, 2.0, vArcDepth);\n#include <opaque_fragment>",
        );
    };
    material.customProgramCacheKey = () => "electric_arc_near_fade_v1";
  }
  const core = new THREE.InstancedMesh(geometry, coreMaterial, capacity);
  const halo = new THREE.InstancedMesh(geometry, haloMaterial, capacity);
  for (const mesh of [halo, core]) {
    mesh.name = name + (mesh === core ? "_core" : "_halo");
    mesh.userData.keepSeparate = true;
    mesh.userData.visualOnly = true;
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
  }
  const start = new THREE.Vector3(),
    end = new THREE.Vector3(),
    delta = new THREE.Vector3(),
    mid = new THREE.Vector3(),
    scale = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0),
    rotation = new THREE.Quaternion(),
    matrix = new THREE.Matrix4();
  let count = 0,
    disposed = false;
  return {
    group,
    core,
    halo,
    begin() {
      count = 0;
    },
    segment(ax, ay, az, bx, by, bz, width) {
      if (count >= capacity || disposed) return;
      start.set(ax, ay, az);
      end.set(bx, by, bz);
      delta.subVectors(end, start);
      const length = delta.length();
      if (length < 1e-7) return;
      rotation.setFromUnitVectors(up, delta.multiplyScalar(1 / length));
      mid.addVectors(start, end).multiplyScalar(0.5);
      scale.set(width, length, width);
      matrix.compose(mid, rotation, scale);
      core.setMatrixAt(count, matrix);
      scale.set(width * 3.2, length, width * 3.2);
      matrix.compose(mid, rotation, scale);
      halo.setMatrixAt(count++, matrix);
    },
    finish() {
      core.count = halo.count = count;
      core.instanceMatrix.needsUpdate = true;
      halo.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      core.dispose();
      halo.dispose();
      geometry.dispose();
      coreMaterial.dispose();
      haloMaterial.dispose();
    },
  };
}
