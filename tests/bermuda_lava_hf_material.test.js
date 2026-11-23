import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { acquireBermudaLavaHfMaterial } from "../src/bermuda_lava_hf_material.js";

test("HF lava material uses real PBR and independent flow with bounded inward relief", () => {
  const a = acquireBermudaLavaHfMaterial({ kind: "stream" }),
    b = acquireBermudaLavaHfMaterial({ kind: "pool" });
  try {
    assert.ok(
      a.material.isMeshStandardMaterial && b.material.isMeshStandardMaterial,
    );
    assert.equal(a.material.transparent, false);
    assert.equal(a.material.side, T.FrontSide);
    assert.equal(b.material.side, T.DoubleSide);
    assert.equal(a.material.metalness, 0);
    a.setTime(4, { reducedMotion: true });
    b.setTime(9);
    assert.equal(a.material.userData.lavaUniforms.uLavaClock.value, 4);
    assert.equal(b.material.userData.lavaUniforms.uLavaClock.value, 9);
    assert.equal(a.material.userData.lavaUniforms.uLavaMotion.value, 0.18);
    const shader = {
      uniforms: {},
      vertexShader: "#include <uv_vertex>\n#include <begin_vertex>",
      fragmentShader: "#include <emissivemap_fragment>",
    };
    a.material.onBeforeCompile(shader);
    assert.ok(shader.uniforms.uLavaMaxRelief.value <= 0.06);
    assert.match(shader.vertexShader, /transformed\s*-=\s*normal/);
    assert.match(shader.fragmentShader, /uLavaSurface/);
    assert.match(shader.fragmentShader, /\.b/);
    assert.equal(b.material.userData.lavaUniforms.uLavaMaxRelief.value, 0);
  } finally {
    a.release();
    b.release();
  }
});

test("Preparing already-created leases shares the two HF textures with correct spaces and last-owner cleanup", async () => {
  const old = Object.fromEntries(
    ["window", "fetch", "createImageBitmap"].map((k) => [k, globalThis[k]]),
  );
  let requests = 0,
    closed = 0;
  globalThis.window = { addEventListener() {} };
  globalThis.fetch = async () => {
    requests++;
    return { ok: true, blob: async () => ({}) };
  };
  globalThis.createImageBitmap = async () => ({
    width: 512,
    height: 512,
    close() {
      closed++;
    },
  });
  const a = acquireBermudaLavaHfMaterial(),
    b = acquireBermudaLavaHfMaterial({ kind: "pool" });
  try {
    assert.equal(await a.prepare(), true);
    assert.equal(await b.prepare(), true);
    assert.equal(requests, 2);
    assert.equal(a.material.map, b.material.map);
    assert.equal(a.material.map.colorSpace, T.SRGBColorSpace);
    assert.equal(a.material.roughnessMap.colorSpace, T.NoColorSpace);
    assert.equal(a.material.bumpMap, a.material.roughnessMap);
    assert.equal(a.material.map.wrapS, T.RepeatWrapping);
    assert.equal(a.material.userData.hfTexturesReady, true);
    const late = acquireBermudaLavaHfMaterial();
    assert.equal(late.material.map, a.material.map);
    late.release();
    a.release();
    a.release();
    assert.equal(closed, 0);
    b.release();
    b.release();
    assert.equal(closed, 2);
    assert.equal(await b.prepare(), false);
  } finally {
    a.release();
    b.release();
    for (const [k, v] of Object.entries(old)) {
      if (v === undefined) delete globalThis[k];
      else globalThis[k] = v;
    }
  }
});

test("Unavailable HF textures keep a visible opaque fallback and recover only through the bounded preparation path", async () => {
  const old = Object.fromEntries(
    ["window", "fetch", "createImageBitmap"].map((k) => [k, globalThis[k]]),
  );
  globalThis.window = { addEventListener() {} };
  let good = false,
    requests = 0,
    closed = 0;
  globalThis.fetch = async () => {
    requests++;
    return { ok: good, blob: async () => ({}) };
  };
  globalThis.createImageBitmap = async () => ({
    close() {
      closed++;
    },
  });
  const a = acquireBermudaLavaHfMaterial();
  try {
    assert.equal(await a.prepare(), false);
    assert.equal(
      requests,
      4,
      "two attempts per texture, no unlimited requests",
    );
    assert.equal(a.material.userData.hfTexturesReady, false);
    assert.equal(a.material.transparent, false);
    assert.ok(a.material.color.r > a.material.color.g);
    good = true;
    assert.equal(await a.prepare({ retry: true }), true);
    assert.equal(requests, 6);
    assert.equal(a.material.userData.hfTexturesReady, true);
    a.release();
    assert.equal(closed, 2);
  } finally {
    a.release();
    for (const [k, v] of Object.entries(old)) {
      if (v === undefined) delete globalThis[k];
      else globalThis[k] = v;
    }
  }
});

test("The production broad-sheet material is opaque DoubleSide and shares the same bounded PBR surface contract", () => {
  const legacy = acquireBermudaLavaHfMaterial(),
    sheet = acquireBermudaLavaHfMaterial({ kind: "sheet" });
  try {
    assert.equal(legacy.material.side, T.FrontSide);
    assert.equal(sheet.material.side, T.DoubleSide);
    assert.equal(sheet.material.transparent, false);
    assert.equal(
      sheet.material.userData.hfSource,
      legacy.material.userData.hfSource,
    );
    assert.equal(
      sheet.material.userData.lavaUniforms.uLavaMaxRelief.value,
      0.06,
    );
  } finally {
    legacy.release();
    sheet.release();
  }
});

test("Cooling residue uses vertex thermal data and one transparent pass while legacy terminal pools remain opaque", () => {
  const residue = acquireBermudaLavaHfMaterial({
      kind: "residue",
      thermalAttributes: true,
    }),
    terminal = acquireBermudaLavaHfMaterial({ kind: "pool" });
  try {
    assert.equal(residue.material.transparent, true);
    assert.equal(residue.material.forceSinglePass, true);
    assert.equal(residue.material.depthWrite, false);
    assert.equal(terminal.material.transparent, false);
    const shader = {
      uniforms: {},
      vertexShader: "#include <uv_vertex>\n#include <begin_vertex>",
      fragmentShader:
        "#include <roughnessmap_fragment>\n#include <emissivemap_fragment>",
    };
    residue.material.onBeforeCompile(shader);
    assert.match(shader.vertexShader, /attribute vec2 aLavaThermal/);
    assert.doesNotMatch(shader.fragmentShader, /attribute vec2/);
    assert.match(shader.fragmentShader, /diffuseColor.a\*=coverage/);
    assert.match(shader.fragmentShader, /pow\(warmth,1.35\)/);
    assert.match(shader.fragmentShader, /roughnessFactor=clamp/);
    assert.notEqual(
      residue.material.customProgramCacheKey(),
      terminal.material.customProgramCacheKey(),
    );
  } finally {
    residue.release();
    terminal.release();
  }
});

test("Fresh closed cuts share the HF material but receive bounded warm exposure rather than black degenerate faces", () => {
  const lease = acquireBermudaLavaHfMaterial({
    kind: "sheet",
    exposureAttributes: true,
  });
  try {
    const shader = {
      uniforms: {},
      vertexShader: "#include <uv_vertex>\n#include <begin_vertex>",
      fragmentShader:
        "#include <emissivemap_fragment>\n#include <roughnessmap_fragment>",
    };
    lease.material.onBeforeCompile(shader);
    assert.match(shader.vertexShader, /attribute float aLavaExposure/);
    assert.match(shader.vertexShader, /vLavaExposure=clamp\(aLavaExposure/);
    assert.match(shader.fragmentShader, /fresh\*\.43/);
    assert.match(shader.fragmentShader, /vec3\(\.18,\.027,\.003\)/);
    assert.equal(lease.material.side, T.DoubleSide);
    assert.equal(lease.material.transparent, false);
    assert.deepEqual(lease.material.defaultAttributeValues.aLavaExposure, [0]);
  } finally {
    lease.release();
  }
});
