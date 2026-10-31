import * as T from "three";

// Equal-strength candidate treatments: the membrane never receives the mural answer.
const COLORS = [
  0x7eddeb, 0xbbabef, 0xefd298, 0x91d9bc, 0x91bdf3, 0xb6d6ea, 0x8ccbd9,
  0xe7bedd,
].map((c) => new T.Color(c));
const WHITE = new T.Color(0xffffff);

/** One permeable sheet at the real crossing plane; shared geometry, no lights/timers. */
export function createMuralMembrane(geometry, glyphs, keep) {
  const group = new T.Group();
  group.name = "mural_seal_membrane";
  const uniforms = T.UniformsUtils.merge([
    T.UniformsLib.fog,
    {
      time: { value: 0 },
      symbol: { value: 0 },
      mode: { value: 0 }, // dormant, active, passed, recovery
      tint: { value: new T.Color() },
      change: { value: 1 },
      eventAge: { value: 1 },
      eventKind: { value: 0 }, // pass, failure, protected contact
      hit: { value: new T.Vector2(0.5, 0.5) },
      reduced: { value: 0 },
    },
  ]);
  const material = keep(
    new T.ShaderMaterial({
      name: "mural_membrane",
      uniforms,
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      forceSinglePass: true,
      fog: true,
      vertexShader: `varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
      fragmentShader: `
      uniform float time, symbol, mode, change, eventAge, eventKind, reduced;
      uniform vec3 tint;
      uniform vec2 hit;
      varying vec2 vUv;
      #include <fog_pars_fragment>
      float line(float x, float width) { return 1.0-smoothstep(width, width+.035, abs(x)); }
      void main() {
        vec2 p=(vUv-.5)*vec2(1.3333,1.0);
        float r=length(p), a=atan(p.y,p.x);
        float t=time*.55;
        float flow=sin(p.x*21.+sin(p.y*16.+t)*1.6-t)
                  +sin(p.y*27.+sin(p.x*11.-t)*1.3+t);
        float caustic=pow(max(0.,flow*.5),7.);
        float pattern=0.;
        // Surface vocabulary follows each pictogram, not merely a different hue.
        if(symbol<.5) pattern=line(sin(p.y*35.+sin(p.x*12.-t)*1.3),.10);
        else if(symbol<1.5) pattern=line(sin(r*50.-a*3.-t),.10);
        else if(symbol<2.5) pattern=line(sin(r*45.-cos(a*5.)*2.-t),.10);
        else if(symbol<3.5) pattern=line(sin(p.x*35.)*sin(p.y*25.+p.x*12.),.06);
        else if(symbol<4.5) pattern=line(sin(p.x*32.+sin(p.y*6.-t)*.8),.09);
        else if(symbol<5.5) pattern=line(sin(r*50.-t*1.7),.10);
        else if(symbol<6.5) pattern=line(sin((p.y+abs(p.x)*.7)*40.-t),.10);
        else pattern=line(sin(atan(p.y+.48,p.x)*15.),.08);
        float edgeDistance=min(min(vUv.x,1.-vUv.x), min(vUv.y,1.-vUv.y));
        float edge=exp(-edgeDistance*65.);
        float border=line(edgeDistance-.025,.002)*.28;
        float energized=1.-step(.5,abs(mode-1.));
        float passed=1.-step(.5,abs(mode-2.));
        float pulse=(1.-change)*(1.-reduced);
        float sweep=line(r-change*.95,.025)*pulse;
        float event=(1.-eventAge);
        float ripple=line(length((vUv-hit)*vec2(1.3333,1.))-eventAge*1.25,.022)
                     *event*(1.-reduced);
        vec3 color=mix(vec3(.16,.31,.36),tint,energized*.72);
        float opacity=.16+edge*.24+border*.2;
        opacity+=energized*(.09+caustic*.16+pattern*.12+sweep*.25);
        color+=energized*(caustic*.15+pattern*.12+sweep*.20);
        // Passed seals open from the contact outwards, leaving a quiet lit rim.
        if(passed>.5) {
          color=vec3(.48,.82,.66);
          float opening=smoothstep(eventAge*1.3-.06,eventAge*1.3+.06,
                                  length((vUv-hit)*vec2(1.3333,1.)));
          opacity=(.20+pattern*.09)*opening*(1.-reduced)+edge*.28+border*.15;
        }
        if(eventKind>1.5 && eventKind<2.5) {
          color=mix(color,vec3(.95,.27,.13),event*.78);
          opacity+=event*.12;
        }
        if(eventKind>2.5) color=mix(color,vec3(.85,.73,.46),event*.6);
        opacity+=ripple*.3;
        opacity*=smoothstep(0.,.006,edgeDistance);
        gl_FragColor=vec4(color,clamp(opacity,0.,.70));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
    }),
  );
  const sheet = new T.Mesh(geometry, material);
  sheet.name = "permeable_crossing_plane";
  group.add(sheet);
  // Existing relief silhouettes are projected through the film, readable without color.
  const iconMaterial = keep(
    new T.MeshBasicMaterial({
      color: 0xd7eff5,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      side: T.DoubleSide,
      forceSinglePass: true,
    }),
  );
  const icons = glyphs.map((glyph) => {
    const icon = glyph.clone();
    icon.scale.set(4.4, 4.4, 0.1);
    icon.position.set(0, 1, 0.12);
    icon.traverse((c) => {
      if (c.isMesh) c.material = iconMaterial;
    });
    icon.visible = false;
    group.add(icon);
    return icon;
  });
  let elapsed = 0,
    changedAt = -10,
    eventAt = -10,
    lastMode = -1,
    lastSymbol = -1;
  return {
    group,
    sheet,
    uniforms,
    icons,
    reset() {
      elapsed = 0;
      changedAt = eventAt = -10;
      lastMode = lastSymbol = -1;
      uniforms.eventKind.value = 0;
      uniforms.hit.value.set(0.5, 0.5);
    },
    trigger(kind, hit) {
      eventAt = elapsed;
      uniforms.eventKind.value =
        kind === "failed" ? 2 : kind === "blocked" ? 3 : 1;
      uniforms.hit.value.copy(hit ?? new T.Vector2(0.5, 0.5));
    },
    update(mode, symbol, dt, reduced) {
      elapsed += Math.max(0, Math.min(0.12, Number.isFinite(dt) ? dt : 0));
      if (mode !== lastMode || symbol !== lastSymbol) changedAt = elapsed;
      lastMode = mode;
      lastSymbol = symbol;
      uniforms.time.value = reduced ? 0 : elapsed;
      uniforms.mode.value = mode;
      uniforms.symbol.value = Math.max(0, symbol);
      uniforms.tint.value.copy(COLORS[Math.max(0, symbol)]);
      uniforms.change.value = Math.min(1, (elapsed - changedAt) / 0.8);
      uniforms.eventAge.value = Math.min(1, (elapsed - eventAt) / 1.25);
      uniforms.reduced.value = reduced ? 1 : 0;
      icons.forEach((icon, i) => {
        icon.visible = mode === 1 && i === symbol;
      });
      iconMaterial.color.copy(uniforms.tint.value).lerp(WHITE, 0.45);
    },
  };
}
