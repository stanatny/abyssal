import * as THREE from "three";

/** 限量电弧池；共用主循环、预分配顶点及材质，暂停和重开不会残留放电。 */
export function createElectricDischarge(parent) {
  const slots = Array.from({ length: 4 }, (_, slot) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(12 * 8 * 6), 3),
    );
    const material = new THREE.LineBasicMaterial({
      color: 0xf0e5a9,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new THREE.LineSegments(geometry, material);
    mesh.name = "river_electric_discharge";
    mesh.visible = false;
    mesh.frustumCulled = false;
    parent.add(mesh);
    return { mesh, age: 0, radius: 12, frame: -1, slot };
  });
  let cursor = 0;
  return {
    emit(point, radius = 12) {
      const s = slots[cursor++ % slots.length];
      s.mesh.position.copy(point);
      s.radius = radius;
      s.age = 0;
      s.frame = -1;
      s.mesh.visible = true;
    },
    update(dt) {
      for (const s of slots) {
        if (!s.mesh.visible) continue;
        s.age += dt;
        if (s.age >= 0.65) {
          s.mesh.visible = false;
          continue;
        }
        s.mesh.material.opacity =
          Math.max(0, 1 - s.age / 0.65) *
          (0.65 + Math.sin(s.age * 75) ** 2 * 0.35);
        const frame = Math.floor(s.age * 20);
        if (frame === s.frame) continue;
        s.frame = frame;
        const array = s.mesh.geometry.attributes.position.array;
        let index = 0;
        for (let ray = 0; ray < 12; ray++) {
          const angle = (ray * Math.PI) / 6 + s.slot * 0.3;
          let x = 0,
            y = 0,
            z = 0;
          for (let j = 1; j <= 8; j++) {
            const t = j / 8,
              jitter =
                Math.sin(ray * 32 + j * 47 + frame * 9) * s.radius * 0.035;
            const nx =
              Math.cos(angle) * s.radius * t + Math.sin(angle) * jitter;
            const nz =
              Math.sin(angle) * s.radius * t - Math.cos(angle) * jitter;
            const ny = Math.sin(ray * 4 + j * 8 + frame) * s.radius * 0.12 * t;
            array[index++] = x;
            array[index++] = y;
            array[index++] = z;
            array[index++] = nx;
            array[index++] = ny;
            array[index++] = nz;
            x = nx;
            y = ny;
            z = nz;
          }
        }
        s.mesh.geometry.attributes.position.needsUpdate = true;
      }
    },
    reset() {
      for (const s of slots) s.mesh.visible = false;
    },
    dispose() {
      for (const s of slots) {
        parent.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.mesh.material.dispose();
      }
    },
  };
}
