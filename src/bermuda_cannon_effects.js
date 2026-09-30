import * as THREE from "three";
import { createFluidTexture } from "./effect_textures.js";

/** 有界炮击池：炮口闪焰、膨胀冲击环、翻滚烟雾与水花碎屑，回合时钟统一。 */
export function createCannonEffects(parent, keep) {
  const root = new THREE.Group();
  root.name = "dutchman_cannon_effects";
  parent.add(root);
  const mistTexture = keep(createFluidTexture("mist"));
  const foamTexture = keep(createFluidTexture("foam"));
  const ring = keep(new THREE.RingGeometry(0.89, 1, 64));
  const pulses = Array.from({ length: 10 }, () => {
    const group = new THREE.Group();
    root.add(group);
    group.visible = false;
    const hot = keep(
      new THREE.SpriteMaterial({
        map: mistTexture,
        blending: THREE.AdditiveBlending,
        color: 0xc9ffe6,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    const vapor = keep(
      new THREE.SpriteMaterial({
        map: mistTexture,
        color: 0x7a9892,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    const foam = keep(
      new THREE.MeshBasicMaterial({
        color: 0xbfdad5,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    const plume = keep(
      new THREE.SpriteMaterial({
        map: foamTexture,
        color: 0xbdd9d4,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    const core = new THREE.Sprite(hot),
      cloud = new THREE.Sprite(vapor),
      wave = new THREE.Mesh(ring, foam),
      spray = new THREE.Group();
    for (let i = 0; i < 6; i++) spray.add(new THREE.Sprite(plume));
    wave.rotation.x = -Math.PI / 2;
    group.add(core, cloud, wave, spray);
    return {
      group,
      core,
      cloud,
      wave,
      spray,
      hot,
      vapor,
      foam,
      plume,
      life: 0,
      duration: 1.65,
      muzzle: false,
    };
  });
  const chipMat = keep(
    new THREE.MeshBasicMaterial({
      color: 0xc3ddd6,
      transparent: true,
      opacity: 0.7,
    }),
  );
  const chips = new THREE.InstancedMesh(
    keep(new THREE.SphereGeometry(0.13, 5, 4)),
    chipMat,
    160,
  );
  chips.frustumCulled = false;
  root.add(chips);
  const dummy = new THREE.Object3D();
  function emit(point, muzzle = false) {
    const pulse =
      pulses.find((p) => p.life <= 0) ||
      pulses.reduce((a, b) => (a.life < b.life ? a : b));
    pulse.life = pulse.duration = muzzle ? 0.32 : 1.65;
    pulse.muzzle = muzzle;
    pulse.group.position.copy(point);
    pulse.group.visible = true;
  }
  function update(dt) {
    let n = 0;
    for (const pulse of pulses) {
      if (pulse.life <= 0) continue;
      pulse.life = Math.max(0, pulse.life - dt);
      const t = 1 - pulse.life / pulse.duration,
        fade = (1 - t) ** 2;
      pulse.group.visible = pulse.life > 0;
      pulse.hot.opacity = fade * (pulse.muzzle ? 0.85 : 0.5);
      pulse.core.scale.setScalar((pulse.muzzle ? 1.5 : 3) * (1 + t * 3));
      pulse.vapor.opacity =
        (pulse.muzzle ? 0.35 : 0.42) * Math.sin(t * Math.PI);
      pulse.cloud.scale.set(3 + t * 8, 2 + t * 6, 3 + t * 7);
      pulse.cloud.rotation.y = t * 1.8;
      pulse.foam.opacity = fade * 0.3;
      pulse.plume.opacity = fade * 0.48;
      pulse.wave.visible = !pulse.muzzle;
      pulse.spray.visible = !pulse.muzzle && pulse.group.position.y > -1;
      pulse.wave.scale.setScalar(3 + t * 17);
      pulse.spray.position.y = 4 - pulse.group.position.y;
      pulse.spray.children.forEach((drop, i) => {
        const angle = (i * Math.PI) / 3;
        drop.position.set(
          Math.cos(angle) * (2 + t * 7),
          t * 12 - t * t * 9,
          Math.sin(angle) * (2 + t * 7),
        );
        drop.scale.set(3 + t * 5, 5 + t * 7, 1);
      });
      if (!pulse.muzzle)
        for (let i = 0; i < 16; i++) {
          const a = i * 2.399,
            r = t * (5 + i * 0.5);
          dummy.position.copy(pulse.group.position);
          dummy.position.x += Math.cos(a) * r;
          dummy.position.z += Math.sin(a) * r;
          dummy.position.y += t * (12 + (i % 4) * 5) - t * t * 24;
          dummy.scale.setScalar((1 - t) * (0.8 + (i % 3) * 0.4));
          dummy.updateMatrix();
          chips.setMatrixAt(n++, dummy.matrix);
        }
    }
    chips.count = n;
    chips.instanceMatrix.needsUpdate = true;
  }
  function reset() {
    for (const p of pulses) {
      p.life = 0;
      p.group.visible = false;
    }
    chips.count = 0;
  }
  reset();
  return { root, emit, update, reset };
}
