import * as THREE from "three";

export const WORLD_EDGE_INSET = 5;
export const BOUNDARY_NOTICE_DISTANCE = 45;

/** 返回最近的既有水平边界；仅供显示，不引入新的移动规则。 */
export function nearestWorldBoundary(position, world) {
  const distances = [
    position.x - world.minX - WORLD_EDGE_INSET,
    world.maxX - WORLD_EDGE_INSET - position.x,
    position.z - world.minZ - WORLD_EDGE_INSET,
    world.maxZ - WORLD_EDGE_INSET - position.z,
  ];
  let edge = 0;
  for (let i = 1; i < 4; i++) if (distances[i] < distances[edge]) edge = i;
  return { edge, distance: Math.max(0, distances[edge]) };
}

/** 在原有不可越过的海域边缘显示洋流和悬沙；复用主循环与四张平面。 */
export function createWorldBoundary(parent) {
  const root = new THREE.Group();
  root.name = "world_boundary_currents";
  parent.add(root);
  const geometry = new THREE.PlaneGeometry(1, 1);
  const time = { value: 0 },
    player = { value: new THREE.Vector3() };
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { time, player, cliffMask: { value: 0 } },
    vertexShader: `varying vec3 wp;
      void main(){wp=(modelMatrix*vec4(position,1.)).xyz;
      gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}`,
    fragmentShader: `uniform float time; uniform vec3 player; uniform float cliffMask; varying vec3 wp;
      void main(){
        if(cliffMask>0.5 && wp.y<0. && wp.z < -90.) discard;
        float d=length(wp.xz-player.xz);
        float fade=(1.-smoothstep(18.,110.,d))*(1.-smoothstep(45.,115.,abs(wp.y-player.y)));
        fade*=1.-smoothstep(7.,25.,wp.y);
        float along=wp.x+wp.z;
        float flow=sin(along*.17+sin(wp.y*.09-time*.7)*2.7+time*.8);
        float strands=pow(max(0.,flow),30.);
        vec2 cell=floor(vec2(along*.35,wp.y*.4-time*.6));
        float h=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
        vec2 local=fract(vec2(along*.35,wp.y*.4-time*.6))-vec2(h,fract(h*13.7));
        float sediment=exp(-dot(local,local)*150.)*step(.68,h);
        float tide=exp(-abs(wp.y-4.+sin(along*.07-time)*.45)*1.5);
        float alpha=fade*(strands*.19+sediment*.28+tide*.65);
        if(alpha<.004)discard;
        vec3 color=mix(vec3(.35,.71,.77),vec3(.93,.73,.40),1.-smoothstep(12.,48.,d));
        gl_FragColor=vec4(color,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const planes = Array.from({ length: 4 }, (_, i) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `world_edge_${i}`;
    root.add(mesh);
    return mesh;
  });
  let current = null,
    disposed = false;
  return {
    root,
    update(elapsed, position, world, visible = true, rockySides = false) {
      if (disposed) return;
      root.visible = visible;
      material.uniforms.cliffMask.value = rockySides ? 1 : 0;
      time.value = elapsed;
      player.value.copy(position);
      if (current !== world) {
        current = world;
        const minX = world.minX + WORLD_EDGE_INSET,
          maxX = world.maxX - WORLD_EDGE_INSET;
        const minZ = world.minZ + WORLD_EDGE_INSET,
          maxZ = world.maxZ - WORLD_EDGE_INSET;
        const height = world.maxDepth + 40,
          centerY = 20 - world.maxDepth / 2;
        planes.forEach((p, i) => {
          p.rotation.y = i < 2 ? Math.PI / 2 : 0;
          p.position.set(
            i === 0 ? minX : i === 1 ? maxX : (minX + maxX) / 2,
            centerY,
            i === 2 ? minZ : i === 3 ? maxZ : (minZ + maxZ) / 2,
          );
          p.scale.set(i < 2 ? maxZ - minZ : maxX - minX, height, 1);
        });
      }
      planes.forEach((p, i) => {
        const distance =
          i < 2
            ? Math.abs(position.x - p.position.x)
            : Math.abs(position.z - p.position.z);
        p.visible = distance < 110;
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      root.clear();
      geometry.dispose();
      material.dispose();
    },
  };
}
