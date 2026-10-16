import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { deepHazardTerrainBlocked } from "./deep_hazard_rules.js";
import {
  createPenglaiWeather,
  stepPenglaiWeather,
  weatherDischarge,
  weatherOpacity,
  penglaiWeatherContact,
} from "./penglai_sky_hazard_rules.js";

const noise = `float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}float fbm(vec2 p){return noise2(p)*.57+noise2(p*2.07+17.)*.28+noise2(p*4.11-9.)*.15;}`;
const output =
  "\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n#include <fog_fragment>\n";
/** 有界天气池：软云以三维分布的朝向相机云絮合成，风幕使用完整立体涡流。 */
export function createPenglaiSkyHazards(
  parent,
  { heightAt, random = Math.random } = {},
) {
  const root = new T.Group();
  root.name = "penglai_sky_hazards";
  parent.add(root);
  const owned = new Set(),
    keep = (r) => (owned.add(r), r),
    pool = createPenglaiWeather(random, heightAt);
  let disposed = false;
  try {
    const shader = (uniforms, vertexShader, fragmentShader) =>
      keep(
        new T.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          side: T.DoubleSide,
          fog: true,
          uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, uniforms]),
          vertexShader,
          fragmentShader,
        }),
      );
    const billboardVertex = `varying vec2 vUv;varying float vSeed;uniform float weatherTime,seed;\n#include <fog_pars_vertex>\nvoid main(){vUv=uv;vec4 center=instanceMatrix*vec4(0,0,0,1);vSeed=center.x*.11+center.z*.19+seed;vec4 mvPosition=modelViewMatrix*center;float sx=length(instanceMatrix[0].xyz),sy=length(instanceMatrix[1].xyz);mvPosition.xy+=position.xy*vec2(sx,sy);gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}`;
    const billboardFragment = `varying vec2 vUv;varying float vSeed;uniform float weatherTime,opacity,storm;\n#include <fog_pars_fragment>\n${noise}\nvoid main(){vec2 p=(vUv-.5)*2.;float n=fbm(p*2.2+vec2(vSeed,weatherTime*.035));float density=smoothstep(.02,.72,(1.-dot(p,p))*.75+n*.65-.30);float shade=clamp(.22+vUv.y*.46+n*.32,0.,1.);vec3 dark=mix(vec3(.20,.34,.35),vec3(.055,.09,.13),storm);vec3 light=mix(vec3(.70,.79,.76),vec3(.43,.51,.57),storm);gl_FragColor=vec4(mix(dark,light,shade),density*opacity);${output}}`;
    const plane = keep(new T.PlaneGeometry(1, 1)),
      transform = new T.Object3D();
    function mist(group, count, storm) {
      const material = shader(
        {
          weatherTime: { value: 0 },
          seed: { value: 0 },
          opacity: { value: 0 },
          storm: { value: storm },
        },
        billboardVertex,
        billboardFragment,
      );
      const mesh = new T.InstancedMesh(plane, material, count);
      mesh.name = storm ? "soft_layered_storm_cloud" : "windborne_mist";
      mesh.frustumCulled = false;
      for (let i = 0; i < count; i++) {
        const a = i * 2.399963,
          r = Math.sqrt((i * 0.618034 + 0.13) % 1);
        transform.position.set(
          Math.cos(a) * r * (storm ? 75 : 70),
          storm ? 58 + Math.sin(i * 4.1) * 18 : Math.sin(a) * r * 30,
          Math.sin(a) * r * (storm ? 48 : 19),
        );
        const size = storm ? 55 + (i % 5) * 7 : 28 + (i % 4) * 9;
        transform.scale.set(size, size * (storm ? 0.75 : 0.45), 1);
        transform.rotation.set(0, 0, 0);
        transform.updateMatrix();
        mesh.setMatrixAt(i, transform.matrix);
      }
      group.add(mesh);
      return mesh;
    }
    const boltParts = [];
    for (let i = 0; i < 6; i++) {
      const a = i * 2.399963,
        r = 18 + Math.sqrt(i / 5) * 43,
        x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      const points = [];
      for (let n = 0; n <= 15; n++)
        points.push(
          new T.Vector3(
            x + Math.sin(n * 3.1 + i) * 3,
            65 - n * 8,
            z + Math.cos(n * 4.3 + i) * 2,
          ),
        );
      const curve = new T.CurvePath();
      for (let n = 1; n < points.length; n++)
        curve.add(new T.LineCurve3(points[n - 1], points[n]));
      boltParts.push(new T.TubeGeometry(curve, 30, 0.23, 4, false));
    }
    const flat = boltParts.map((g) => g.toNonIndexed()),
      bolts = keep(mergeGeometries(flat));
    for (const g of [...boltParts, ...flat]) g.dispose();
    const rainGeo = keep(new T.BufferGeometry()),
      rain = [],
      rainSeed = [];
    for (let i = 0; i < 150; i++) {
      const a = i * 2.399963,
        r = Math.sqrt((i * 0.618034) % 1);
      for (const tip of [0, 1]) {
        rain.push(Math.cos(a) * r * 82, tip, Math.sin(a) * r * 62);
        rainSeed.push((i * 0.317) % 1);
      }
    }
    rainGeo.setAttribute("position", new T.Float32BufferAttribute(rain, 3));
    rainGeo.setAttribute("rainSeed", new T.Float32BufferAttribute(rainSeed, 1));
    const windPositions = [],
      windUv = [],
      windIndex = [];
    for (let i = 0; i < 24; i++)
      for (let n = 0; n <= 40; n++) {
        const u = n / 40,
          z = (u - 0.5) * 62,
          a = i * 2.399963,
          radius = Math.sqrt((i * 0.618034 + 0.13) % 1),
          x = Math.sin(a) * 78 * radius + Math.sin(u * 3.8 + i) * 8,
          y = Math.cos(a) * 37 * radius + Math.sin(u * 4.4 + i * 2) * 4,
          w = 0.8 + Math.sin(u * Math.PI) * (0.9 + (i % 4) * 0.3);
        for (const side of [-1, 1]) {
          windPositions.push(x, y + side * w, z);
          windUv.push(u + i * 2, side < 0 ? 0 : 1);
        }
        if (n) {
          const k = (i * 41 + n) * 2;
          windIndex.push(k - 2, k, k - 1, k - 1, k, k + 1);
        }
      }
    const windGeo = keep(new T.BufferGeometry());
    windGeo.setAttribute(
      "position",
      new T.Float32BufferAttribute(windPositions, 3),
    );
    windGeo.setAttribute("uv", new T.Float32BufferAttribute(windUv, 2));
    windGeo.setIndex(windIndex);
    windGeo.computeVertexNormals();
    for (const e of pool.slots) {
      const group = new T.Group();
      group.name = `random_${e.kind}_weather`;
      root.add(group);
      const cloud = mist(
        group,
        e.kind === "thunder" ? 30 : 12,
        e.kind === "thunder" ? 1 : 0,
      );
      e.art = { group, cloud };
      if (e.kind === "thunder") {
        const material = keep(
          new T.MeshBasicMaterial({
            color: "#dcecff",
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
          }),
        );
        const core = new T.Mesh(bolts, material);
        core.name = "broad_storm_lightning";
        group.add(core);
        const rainMat = shader(
          { weatherTime: { value: 0 }, opacity: { value: 0 } },
          `attribute float rainSeed;uniform float weatherTime;\n#include <fog_pars_vertex>\nvoid main(){vec3 p=vec3(position.x,65.-fract(rainSeed+weatherTime*.35)*125.-position.y*5.,position.z);vec4 mvPosition=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}`,
          `uniform float opacity;\n#include <fog_pars_fragment>\nvoid main(){gl_FragColor=vec4(.49,.67,.75,opacity);${output}}`,
        );
        const drops = new T.LineSegments(rainGeo, rainMat);
        drops.frustumCulled = false;
        group.add(drops);
        Object.assign(e.art, { core, rainMat });
      } else {
        const material = shader(
          { weatherTime: { value: 0 }, opacity: { value: 0 } },
          `varying vec2 vUv;\n#include <fog_pars_vertex>\nvoid main(){vUv=uv;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}`,
          `varying vec2 vUv;uniform float weatherTime,opacity;\n#include <fog_pars_fragment>\nvoid main(){float across=abs(vUv.y-.5)*2.;float edge=1.-smoothstep(.72,1.,across);float core=1.-smoothstep(.10,.40,across);float u=fract(vUv.x);float tips=pow(max(0.,sin(u*3.14159)),.6);float flow=.35+.65*smoothstep(.2,.75,sin(u*6.-weatherTime*5.+floor(vUv.x)*1.7)*.5+.5);vec3 color=mix(vec3(.035,.12,.16),vec3(.84,.95,.96),core);gl_FragColor=vec4(color,edge*tips*flow*opacity);${output}}`,
        );
        const streaks = new T.Mesh(windGeo, material);
        streaks.name = "sweeping_air_vortex";
        group.add(streaks);
        e.art.windMaterial = material;
      }
      group.visible = false;
    }
    return {
      root,
      events: pool.slots,
      pool,
      onMovement(
        a,
        b,
        now,
        { dt = 0, length = 3, blocked = () => false } = {},
      ) {
        if (disposed) return [];
        stepPenglaiWeather(pool, dt, b);
        const events = [];
        for (const e of pool.slots) {
          if (e.phase === "quiet") continue;
          const near =
            b.y >= 60 && Math.hypot(b.x - e.x, b.y - e.y, b.z - e.z) < 250;
          if (near && !e.announced) {
            events.push({ warning: e.profile.warning, site: e });
            e.announced = true;
          }
          const pulse = weatherDischarge(e);
          if (pulse < 0 || e.hitPulse === pulse) continue;
          const contact = penglaiWeatherContact(
            a,
            b,
            e,
            Math.min(3, Math.max(0.6, length * 0.08)),
          );
          if (!contact) continue;
          const source =
            e.kind === "thunder"
              ? { x: contact.x, y: e.y + 90, z: contact.z }
              : {
                  x: e.x - Math.sin(e.yaw) * 105,
                  y: contact.y,
                  z: e.z - Math.cos(e.yaw) * 105,
                };
          if (
            blocked(source, contact) ||
            deepHazardTerrainBlocked(source, contact, heightAt)
          )
            continue;
          e.hitPulse = pulse;
          events.push({
            damage: e.profile.damage,
            message: e.profile.hit,
            site: e,
          });
        }
        return events;
      },
      update(now, position, reduced = false, highQuality = true) {
        if (disposed) return;
        for (const e of pool.slots) {
          const art = e.art,
            alpha = weatherOpacity(e);
          art.group.visible =
            alpha > 0 &&
            Math.hypot(position.x - e.x, position.y - e.y, position.z - e.z) <
              650;
          art.group.position.set(e.x, e.y, e.z);
          art.group.rotation.y = e.yaw;
          const time = reduced ? 0 : pool.time,
            discharge = weatherDischarge(e) >= 0;
          art.cloud.count = e.kind === "thunder" ? (highQuality ? 30 : 18) : 12;
          art.cloud.material.uniforms.weatherTime.value = time;
          art.cloud.material.uniforms.seed.value = e.seed;
          art.cloud.material.uniforms.opacity.value =
            alpha *
            (e.kind === "thunder" ? 0.78 : 0.24) *
            (e.kind === "thunder" ? 30 / art.cloud.count : 1);
          if (art.core) {
            art.core.visible = discharge;
            art.rainMat.uniforms.weatherTime.value = time;
            art.rainMat.uniforms.opacity.value =
              alpha * (e.phase === "active" ? 0.27 : 0.09);
          } else {
            art.windMaterial.uniforms.weatherTime.value = time;
            art.windMaterial.uniforms.opacity.value =
              alpha * (e.phase === "active" ? 0.88 : 0.36);
          }
        }
      },
      reset() {
        if (disposed) return;
        for (const e of pool.slots) {
          e.phase = "quiet";
          e.age = 0;
          e.remaining = pool.range(
            e.kind === "thunder" ? 8 : 17,
            e.kind === "thunder" ? 14 : 25,
          );
          e.hitPulse = -1;
          e.announced = false;
          e.art.group.visible = false;
        }
        pool.time = 0;
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        root.removeFromParent();
        root.traverse((n) => {
          if (n.isInstancedMesh) n.dispose();
        });
        for (const r of owned) r.dispose();
        owned.clear();
        root.clear();
        pool.slots.length = 0;
      },
    };
  } catch (error) {
    root.removeFromParent();
    root.traverse((n) => {
      if (n.isInstancedMesh) n.dispose();
    });
    for (const r of owned) r.dispose();
    root.clear();
    throw error;
  }
}
