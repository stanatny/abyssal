import * as THREE from "three";

/**
 * 创建虎鲸周围的扩散回声：四组薄环和极淡球面共用几何体，由主循环驱动。
 * @param {THREE.Scene} scene 世界场景。
 * @returns {object} update({active, now, position, startedAt})、reset 和 dispose。
 */
export function createSonarWave(scene) {
  const group = new THREE.Group();
  group.name = "orca_sonar_wave";
  group.visible = false;
  scene.add(group);
  const ringGeometry = new THREE.RingGeometry(0.975, 1, 128);
  const shellGeometry = new THREE.SphereGeometry(1, 32, 16);
  const waves = Array.from({ length: 4 }, (_, index) => {
    const pulse = new THREE.Group();
    pulse.name = `sonar_pulse_${index}`;
    group.add(pulse);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x78f8ec,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
      toneMapped: false,
    });
    // 波前中间清晰、两缘柔化，避免三条硬圆环压住生物轮廓。
    ringMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec2 vWaveCoordinate;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvWaveCoordinate = position.xy;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec2 vWaveCoordinate;",
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
        float waveRadius = length(vWaveCoordinate);
        float waveEdge = smoothstep(0.975, 0.989, waveRadius) * (1.0 - smoothstep(0.992, 1.0, waveRadius));
        diffuseColor.a *= waveEdge;`,
        );
    };
    ringMaterial.customProgramCacheKey = () => "sonar_soft_wave_v6";
    for (const rotation of [
      [Math.PI / 2, 0, 0],
      [0, 0, 0],
      [0, Math.PI / 2, 0],
    ]) {
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.set(...rotation);
      ring.renderOrder = 8;
      pulse.add(ring);
    }
    const shellMaterial = new THREE.ShaderMaterial({
      uniforms: {
        opacity: { value: 0 },
        tint: { value: new THREE.Color(0x45cddc) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDirection;
        void main() {
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDirection = -viewPosition.xyz;
          gl_Position = projectionMatrix * viewPosition;
        }
      `,
      fragmentShader: `
        uniform float opacity;
        uniform vec3 tint;
        varying vec3 vNormal;
        varying vec3 vViewDirection;
        void main() {
          float facing = abs(dot(normalize(vNormal), normalize(vViewDirection)));
          float rim = pow(1.0 - facing, 4.0);
          gl_FragColor = vec4(tint, opacity * rim);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    shell.renderOrder = 7;
    pulse.add(shell);
    return { pulse, ringMaterial, shellMaterial };
  });
  let disposed = false;

  function reset() {
    group.visible = false;
    for (const wave of waves) {
      wave.pulse.visible = false;
      wave.ringMaterial.opacity = 0;
      wave.shellMaterial.uniforms.opacity.value = 0;
    }
  }

  return {
    update({ active, now, position, startedAt = now }) {
      if (disposed) return;
      if (
        !active ||
        !position ||
        ![position.x, position.y, position.z].every(Number.isFinite) ||
        !Number.isFinite(now) ||
        !Number.isFinite(startedAt)
      ) {
        reset();
        return;
      }
      group.visible = true;
      group.position.copy(position);
      const elapsed = Math.max(0, now - startedAt);
      for (let i = 0; i < waves.length; i++) {
        const wave = waves[i];
        const age = elapsed - i * 0.85;
        wave.pulse.visible = age >= 0;
        if (age < 0) continue;
        const progress = (age % 3.4) / 3.4;
        const radius = 2.8 + progress * 65;
        const fade = Math.pow(1 - progress, 1.25);
        wave.pulse.scale.setScalar(radius);
        wave.ringMaterial.opacity = 0.36 * fade;
        wave.shellMaterial.uniforms.opacity.value = 0.15 * fade;
      }
    },
    reset,
    dispose() {
      if (disposed) return;
      reset();
      scene.remove(group);
      ringGeometry.dispose();
      shellGeometry.dispose();
      for (const wave of waves) {
        wave.ringMaterial.dispose();
        wave.shellMaterial.dispose();
      }
      group.clear();
      disposed = true;
    },
    get group() {
      return group;
    },
  };
}
