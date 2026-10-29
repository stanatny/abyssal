import test from "node:test";
import assert from "node:assert/strict";
import { RecordedMusic } from "../src/recorded_music.js";
import { REGIONAL_RECORDINGS } from "../src/regional_music_assets.js";
import fs from "node:fs";
import crypto from "node:crypto";

function fixture() {
  const starts = [],
    stops = [];
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    cancelScheduledValues() {},
    setValueCurveAtTime() {},
    linearRampToValueAtTime() {},
  });
  const node = () => ({
    gain: param(),
    connect() {
      return this;
    },
    disconnect() {},
    start(...args) {
      starts.push(args);
    },
    stop() {
      stops.push(this);
    },
  });
  const context = {
    currentTime: 0,
    createGain: node,
    createBufferSource: node,
    decodeAudioData: async () => ({
      duration: 60,
      length: 2880000,
      numberOfChannels: 2,
    }),
  };
  const fetches = [];
  const fetcher = async (url) => {
    fetches.push(url);
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(4) };
  };
  const player = new RecordedMusic(context, node(), { fetcher });
  return { player, context, fetches, starts, stops };
}

test("manifest binds only accepted recordings and packaged bytes", () => {
  const manifest = JSON.parse(
    fs.readFileSync(
      new URL("../docs/regional_music_assets.json", import.meta.url),
    ),
  );
  assert.equal(manifest.assets.length, 22);
  assert.equal(REGIONAL_RECORDINGS.hawaii, undefined);
  for (const x of manifest.assets) {
    const bytes = fs.readFileSync(new URL(`../${x.file}`, import.meta.url));
    assert.equal(
      crypto.createHash("sha256").update(bytes).digest("hex"),
      x.sha256,
    );
    assert.equal(REGIONAL_RECORDINGS[x.region][x.state].entry, x.offset);
  }
  assert.equal(REGIONAL_RECORDINGS.atlantis.lord.entry, 25.705);
  assert.equal(
    manifest.assets.find((x) => x.region === "penglai" && x.state === "sage")
      .sourceSha256,
    "372d9460deea2df81635cb3746ed878c88ae62ba43aaf491f68f53431123cd9f",
  );
});

test("only current region decodes, same-region request is reused, switching releases old buffers", async () => {
  const { player, fetches } = fixture();
  await player.setRegion("atlantis");
  assert.equal(fetches.length, 3);
  assert.equal(player.snapshot().decoded, 3);
  await player.setRegion("atlantis");
  assert.equal(fetches.length, 3);
  player.update();
  await player.setRegion("penglai");
  assert.equal(player.snapshot().voices, 0);
  assert.equal(player.snapshot().decoded, 4);
  await player.setRegion("hawaii");
  assert.equal(player.status, "procedural");
  assert.equal(player.buffers.size, 0);
});

test("actual pursuit fades in, ambush starts immediately at selected source passage, releases with hysteresis", async () => {
  const { player, context, starts } = fixture();
  await player.setRegion("atlantis");
  player.update();
  context.currentTime = 24;
  player.update({ pursuing: true });
  assert.equal(player.state, "chase");
  assert.equal(player.tracks.get("chase").envelope.duration, 6);
  context.currentTime = 24.3;
  player.update({ boss: true });
  assert.equal(player.state, "lord");
  assert.equal(starts.at(-1)[1], 25.705);
  assert.equal(player.tracks.get("lord").envelope.duration, 0.01);
  assert.equal(player.tracks.get("chase").envelope.duration, 0.15);
  context.currentTime = 25;
  player.update();
  assert.equal(player.state, "lord");
  context.currentTime = 27;
  player.update();
  assert.equal(player.state, "explore");
  assert.equal(player.tracks.get("explore").envelope.duration, 8);
});

test("Sage cue needs both genuine engagement and matching region/species", async () => {
  const { player } = fixture();
  await player.setRegion("penglai");
  player.update({ bossKind: "sword_sage" });
  assert.equal(player.state, "explore");
  player.update({ boss: true, bossKind: "sword_sage" });
  assert.equal(player.state, "sage");
  player.update({ boss: true, bossKind: "white_tiger" });
  assert.equal(player.state, "lord");
  await player.setRegion("europa");
  player.update({ boss: true, bossKind: "sword_sage" });
  assert.equal(player.state, "lord");
});

test("loops overlap without source accumulation; stop/mute/reset releases everything", async () => {
  const { player, context } = fixture();
  await player.setRegion("bermuda");
  for (let time = 0; time < 400; time += 0.1) {
    context.currentTime = time;
    player.update();
    for (const track of player.tracks.values())
      for (const voice of [...track.voices])
        if (voice.end <= time) voice.source.onended();
    assert.ok(player.snapshot().voices <= 2);
  }
  player.stop();
  assert.equal(player.snapshot().voices, 0);
  assert.equal(player.tracks.size, 0);
  assert.equal(player.buffers.size, 3);
});

test("delayed old decode cannot replace selected region or replay old attack", async () => {
  const { player, context } = fixture();
  let resume;
  context.decodeAudioData = () =>
    new Promise((r) => {
      resume = r;
    });
  const pending = player.setRegion("atlantis");
  await new Promise((r) => setImmediate(r));
  const switched = player.setRegion("hawaii");
  resume({ duration: 60, length: 1, numberOfChannels: 2 });
  await pending;
  await switched;
  assert.equal(player.region, "hawaii");
  assert.equal(player.buffers.size, 0);
  assert.equal(player.state, null);
});

test("failure stays on procedural fallback and an explicit preparation retries", async () => {
  const { player } = fixture();
  let fail = true;
  const old = player.fetcher;
  player.fetcher = (...args) =>
    fail ? Promise.reject(Error("offline")) : old(...args);
  assert.equal(await player.setRegion("odyssey"), false);
  assert.equal(player.status, "unavailable");
  assert.equal(player.update({ boss: true }), false);
  fail = false;
  assert.equal(await player.setRegion("odyssey"), true);
  player.update();
  assert.equal(player.state, "explore");
});
