import * as THREE from "three";
import { createBermudaCargo } from "./bermuda_cargo.js";
import { createBermudaAircraft } from "./bermuda_aircraft.js";
import { createBermudaBuilder, bermudaMaterials } from "./bermuda_geometry.js";
import { createBermudaGeology } from "./bermuda_geology.js";
import { createBermudaColonies } from "./bermuda_colonies.js";
import { createBermudaVents } from "./bermuda_vents.js";

/** 礁峡、失事残骸与热液群落；地标有实体接触，植物装饰合批并保持航道净空。 */
export function createBermudaBiomes(parent, { heightAt } = {}) {
  const root = new THREE.Group();
  root.name = "bermuda_exploration_biomes";
  parent.add(root);
  const resources = new Set(),
    keep = (r) => (resources.add(r), r),
    m = bermudaMaterials(keep),
    b = createBermudaBuilder(root, keep),
    contacts = [],
    lights = [],
    landmarks = [];
  const bacteria = keep(
    new THREE.MeshStandardMaterial({
      color: "#8c815b",
      roughness: 0.9,
      emissive: "#69866b",
      emissiveIntensity: 0.5,
    }),
  );
  bacteria.name = "vent_bacterial_mats";
  const geologyArt = createBermudaGeology(root, { heightAt });
  root.userData.geologyArt = geologyArt;
  contacts.push(...geologyArt.colliders);
  for (const [id, x, z] of [
    ["reef_arch", -245, -365],
    ["trench_arch", 170, -775],
  ])
    landmarks.push({
      name: id === "reef_arch" ? "迷雾礁拱" : "深沟石门",
      position: new THREE.Vector3(x, heightAt(x, z) + 35, z),
      radius: 75,
    });
  // HF 残骸与九个接触体共同贴坡；四个翼尾盒继续占用原来的编号。
  const aircraft = [174, heightAt(174, -570) + 5, -570],
    aircraftArt = createBermudaAircraft(root, { heightAt });
  root.userData.aircraftArt = aircraftArt;
  for (const box of aircraftArt.boxes)
    b.box(null, box.center, box.size, true, box.rotation, false);
  contacts.push(...aircraftArt.contacts);
  landmarks.push({
    name: "失踪机群残骸",
    position: new THREE.Vector3(...aircraft),
    radius: 60,
  });
  // 深处小型货船残骸与断锚链，形成第二个探索点而不是空海床。
  const sx = 185,
    sz = -930,
    sy = heightAt(sx, sz) + 1;
  const cargoArt = createBermudaCargo(root, { heightAt });
  root.userData.cargoArt = cargoArt;
  contacts.push(...cargoArt.colliders);
  for (let i = 0; i < 18; i++) {
    const cx = cargoArt.root.position.x - 10 - i * 0.55,
      cz = cargoArt.root.position.z - 18 + i * 0.5;
    b.add(
      new THREE.TorusGeometry(0.5, 0.13, 6, 12).rotateX(
        i % 2 ? Math.PI / 2 : 0,
      ),
      m.brass,
      [cx, heightAt(cx, cz) + 0.2, cz],
    );
  }
  landmarks.push({
    name: "锈蚀货船墓地",
    position: new THREE.Vector3(sx, sy + 8, sz),
    radius: 60,
  });
  const coloniesArt = createBermudaColonies(root, { heightAt }),
    ventsArt = createBermudaVents(root, { heightAt });
  root.userData.coloniesArt = coloniesArt;
  root.userData.ventsArt = ventsArt;
  contacts.push(...ventsArt.colliders);
  for (let i = 0; i < 12; i++) {
    const { x, z, top } = ventsArt.placements[i],
      y = heightAt(x, z);
    for (let j = 0; j < 12; j++) {
      const a = j * 2.4,
        r = 3 + (j % 3);
      b.add(
        new THREE.CylinderGeometry(0.13, 0.25, 1.8 + (j % 4), 6),
        bacteria,
        [x + Math.cos(a) * r, y + 1.2, z + Math.sin(a) * r],
      );
    }
    if (i % 3 === 0)
      lights.push({
        position: new THREE.Vector3(...top).add(new THREE.Vector3(0, 2, 0)),
        color: 0x73c6b9,
        intensity: 15,
        distance: 40,
      });
  }
  const colliders = [...b.finish(), ...contacts];
  const time = { value: 0 };
  const snowGeo = keep(new THREE.BufferGeometry()),
    positions = [];
  for (let i = 0; i < 700; i++)
    positions.push(
      ((i * 37.17) % 120) - 60,
      ((i * 13.73) % 80) - 40,
      ((i * 23.87) % 120) - 60,
    );
  snowGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  const snowMat = keep(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { time },
      vertexShader:
        "uniform float time;varying float fade;void main(){vec3 p=position;p.y=mod(p.y+40.-time*.5,80.)-40.;vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp(90./-v.z,1.,2.5);fade=.16*(1.-smoothstep(30.,80.,-v.z));}",
      fragmentShader:
        "varying float fade;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(.62,.76,.73,fade*(1.-smoothstep(.1,.5,d)));}",
    }),
  );
  const snow = new THREE.Points(snowGeo, snowMat);
  snow.frustumCulled = false;
  root.add(snow);
  let disposed = false;
  return {
    root,
    colliders,
    lightSources: lights,
    landmarks,
    update(t, position, quality = true) {
      time.value = t;
      coloniesArt.update(t, position);
      geologyArt.update(t, position);
      snow.position.copy(position);
      snow.visible = position.y < -30;
      snowGeo.setDrawRange(0, quality ? 700 : 300);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      coloniesArt.dispose();
      geologyArt.dispose();
      ventsArt.dispose();
      aircraftArt.dispose();
      cargoArt.dispose();
      root.removeFromParent();
      for (const r of resources) r.dispose();
      resources.clear();
      root.clear();
      colliders.length = 0;
    },
  };
}
