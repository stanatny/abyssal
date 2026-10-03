import * as THREE from "three";
import { PENGLAI_GUARDIANS } from "./penglai_config.js";
import { t, message, onLanguageChange } from "./i18n.js";

export const PENGLAI_WARD = Object.freeze({
  x: 0,
  y: 275,
  z: -650,
  radius: 185,
  thickness: 2,
});
const names = {
  penglai_azure: "青龙",
  penglai_tiger: "白虎",
  penglai_bird: "朱雀",
  penglai_tortoise: "玄武",
};
const colors = ["#65b99b", "#d8d9cc", "#d8a279", "#93b3c6"];
/** 四象结界是可见的薄球壳，内部仍可巡游；只有四守卫全败才移除完整碰撞边界。 */
export function createPenglaiWard(parent) {
  const root = new THREE.Group();
  root.name = "four_symbol_monastery_ward";
  parent.add(root);
  const barriers = [
    { type: "sphere_shell", kind: "four_symbol_ward", ...PENGLAI_WARD },
  ];
  const resources = new Set(),
    keep = (r) => (resources.add(r), r),
    center = new THREE.Vector3(PENGLAI_WARD.x, PENGLAI_WARD.y, PENGLAI_WARD.z);
  const sectors = PENGLAI_GUARDIANS.map((guardian, i) => {
    const start = [
      Math.PI * 0.75,
      -Math.PI * 0.25,
      Math.PI * 0.25,
      Math.PI * 1.25,
    ][i];
    const uniforms = {
      clock: { value: 0 },
      strength: { value: 1 },
      tint: { value: new THREE.Color(colors[i]) },
    };
    const mat = keep(
      new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        vertexShader:
          "varying vec3 vLocal; varying vec3 vNormal; varying vec3 vWorld; void main(){vLocal=position;vNormal=normalize(mat3(modelMatrix)*normal);vWorld=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.0);}",
        fragmentShader:
          "uniform float clock;uniform float strength;uniform vec3 tint;varying vec3 vLocal;varying vec3 vNormal;varying vec3 vWorld;void main(){vec3 eye=normalize(cameraPosition-vWorld);float rim=pow(1.0-abs(dot(normalize(vNormal),eye)),2.0);float ring=pow(.5+.5*cos(vLocal.y*.11-clock*.6),16.0);float angle=atan(vLocal.z,vLocal.x);float stitch=pow(.5+.5*cos(angle*24.0+vLocal.y*.021),28.0)*pow(.5+.5*cos(vLocal.y*.16),10.0);float alpha=(.018+rim*.2+ring*.07+stitch*.08)*strength;gl_FragColor=vec4(tint,alpha);}",
      }),
    );
    const mesh = new THREE.Mesh(
      keep(
        new THREE.SphereGeometry(
          PENGLAI_WARD.radius,
          24,
          24,
          start,
          Math.PI / 2,
        ),
      ),
      mat,
    );
    mesh.position.copy(center);
    mesh.name = guardian.id + "_seal";
    root.add(mesh);
    return { guardian, mesh, uniforms };
  });
  const rim = new THREE.Mesh(
    keep(new THREE.TorusGeometry(PENGLAI_WARD.radius, 0.7, 6, 96)),
    keep(
      new THREE.MeshBasicMaterial({
        color: "#b4ccb0",
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
      }),
    ),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.copy(center);
  root.add(rim);
  let defeated = new Set(),
    nextNotice = 0,
    disposed = false,
    canvas,
    texture,
    label,
    ctx;
  if (typeof document !== "undefined") {
    canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    ctx = canvas.getContext("2d");
    texture = keep(new THREE.CanvasTexture(canvas));
    texture.colorSpace = THREE.SRGBColorSpace;
    label = new THREE.Sprite(
      keep(
        new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
        }),
      ),
    );
    label.name = "four_symbol_remaining_label";
    label.scale.set(24, 6, 1);
    root.add(label);
  }
  function paint() {
    if (!ctx) return;
    ctx.clearRect(0, 0, 1024, 256);
    ctx.fillStyle = "rgba(8,34,39,.88)";
    ctx.beginPath();
    ctx.roundRect(0, 0, 1024, 256, 22);
    ctx.fill();
    ctx.strokeStyle = "#a7c9ae";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#e7dec1";
    ctx.textAlign = "center";
    ctx.font = "600 56px sans-serif";
    ctx.fillText(t(message`四象结界 · ${defeated.size}/4`), 512, 80, 980);
    ctx.font = "42px sans-serif";
    ctx.fillStyle = "#c4ded4";
    const remaining = PENGLAI_GUARDIANS.filter((g) => !defeated.has(g.id))
      .map((g) => t(names[g.id]))
      .join(" · ");
    ctx.fillText(remaining || t("四象护阵已解"), 512, 154, 980);
    ctx.font = "34px sans-serif";
    ctx.fillText(t("击败全部守卫后才可进入道观"), 512, 217, 980);
    texture.needsUpdate = true;
    label.userData.remaining = remaining;
  }
  const unsubscribe = onLanguageChange(paint);
  paint();
  function reset() {
    defeated.clear();
    nextNotice = 0;
    barriers.splice(0, barriers.length, {
      type: "sphere_shell",
      kind: "four_symbol_ward",
      ...PENGLAI_WARD,
    });
    root.visible = true;
    for (const s of sectors) s.uniforms.strength.value = 1;
    paint();
  }
  function updateProgress(player, position, bosses, notify) {
    const previous = defeated.size;
    for (const g of PENGLAI_GUARDIANS)
      if (bosses.some((b) => b.enabled && b.id === g.id && b.state.defeated))
        defeated.add(g.id);
    if (previous !== defeated.size) {
      for (const s of sectors)
        s.uniforms.strength.value = defeated.has(s.guardian.id) ? 0.15 : 1;
      paint();
      if (defeated.size === 4) {
        barriers.length = 0;
        notify?.("四象结界已解除 · 道观入口开启", 5);
      } else
        notify?.(message`结界减弱 · 仍有${4 - defeated.size}位神兽镇守`, 4);
    }
    root.visible = defeated.size < 4;
    if (
      root.visible &&
      Math.abs(position.distanceTo(center) - PENGLAI_WARD.radius) < 35 &&
      player.elapsed >= nextNotice
    ) {
      notify?.(
        message`四象结界阻挡通行 · 尚需击败${4 - defeated.size}位守卫`,
        4,
      );
      nextNotice = player.elapsed + 12;
    }
  }
  const offset = new THREE.Vector3();
  return {
    root,
    barriers,
    sectors,
    get defeated() {
      return defeated.size;
    },
    reset,
    updateProgress,
    update(time, position) {
      for (const s of sectors) s.uniforms.clock.value = time;
      if (label) {
        offset.copy(position).sub(center);
        if (offset.lengthSq() < 1) offset.set(0, 0, 1);
        label.position
          .copy(center)
          .addScaledVector(offset.normalize(), PENGLAI_WARD.radius * 0.88);
        // 近距离压小标牌并抬离准星，避免结界提示盖住角色和道观。
        label.position.y += 18;
        const width = THREE.MathUtils.clamp(
          position.distanceTo(label.position) * 0.38,
          24,
          56,
        );
        label.scale.set(width, width / 4, 1);
        // 窄屏竖向视野保留任务栏与通行提示，不让额外世界标牌叠在状态栏上。
        const narrowPortrait =
          typeof window !== "undefined" &&
          window.innerWidth < 600 &&
          window.innerHeight > window.innerWidth;
        label.visible =
          !narrowPortrait && root.visible && position.distanceTo(center) < 330;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      root.removeFromParent();
      resources.forEach((r) => r.dispose());
      root.clear();
      barriers.length = 0;
    },
  };
}
