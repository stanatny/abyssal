import * as THREE from "three";
import { polyphemusEyeFrame } from "./polyphemus_weakpoint.js";

/** 细轮廓只标出真实单眼，贴随当前皮肤；它不参与任何碰撞或伤害。 */
export function createPolyphemusEyeMarker(scene) {
  const geometry = new THREE.RingGeometry(1.04, 1.13, 48),
    material = new THREE.MeshBasicMaterial({
      color: 0xffd477,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.FrontSide,
    }),
    mesh = new THREE.Mesh(geometry, material),
    axis = new THREE.Vector3(0, 0, 1),
    offset = new THREE.Vector3();
  mesh.name = "polyphemus_actual_eye_opening_outline";
  mesh.userData.visualOnly = true;
  mesh.raycast = () => {};
  mesh.visible = false;
  scene.add(mesh);
  let disposed = false;
  return {
    mesh,
    update(entry, playerPosition, time) {
      if (disposed) return;
      const open =
        entry.enabled &&
        !entry.state.defeated &&
        !entry.state.openingSpent &&
        entry.state.phase === "recover";
      mesh.visible = open;
      if (!open) return;
      const frame = polyphemusEyeFrame(entry.mesh);
      offset.copy(playerPosition).sub(frame.center);
      if (offset.length() > 160 || offset.dot(frame.normal) <= 0) {
        mesh.visible = false;
        return;
      }
      mesh.position.copy(frame.center).addScaledVector(frame.normal, 0.12);
      mesh.quaternion.setFromUnitVectors(axis, frame.normal);
      mesh.scale.set(frame.radiusX, frame.radiusY, 1);
      material.opacity = 0.5 + 0.18 * Math.sin(time * 4);
    },
    reset() {
      mesh.visible = false;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      mesh.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
