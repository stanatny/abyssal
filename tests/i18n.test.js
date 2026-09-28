import assert from "node:assert/strict";
import test from "node:test";
import {
  detectLanguage,
  getLanguage,
  LANGUAGE_KEY,
  message,
  normalizeLanguage,
  onLanguageChange,
  setLanguage,
  t,
} from "../src/i18n.js";
import { UI_EN } from "../src/locales/ui_en.js";
import { CATALOG_EN } from "../src/locales/catalog_en.js";
import { ECOSYSTEM_SPECIES } from "../src/ecosystem_config.js";
import { PLAYER_CHARACTERS } from "../src/character_rules.js";
import { BOSS_SPECIES } from "../src/boss_rules.js";
import { HUNTER_ABILITIES } from "../src/hunter_rules.js";
import { createReward, makeLabel } from "../src/rewards.js";

const chinese = /[\u3400-\u9fff]/u;
const placeholders = (text) =>
  [...text.matchAll(/\{\d+\}/g)].map(([value]) => value).sort();

test("locale selection uses a valid saved preference, then the browser language", () => {
  for (const value of ["zh", "zh-CN", "zh-Hant", "zh-TW"])
    assert.equal(normalizeLanguage(value), "zh-CN");
  for (const value of ["en", "en-US", "fr", "ja"])
    assert.equal(normalizeLanguage(value), "en");
  assert.equal(
    detectLanguage({ getItem: (key) => (key === LANGUAGE_KEY ? "en" : null) }, [
      "zh-CN",
    ]),
    "en",
  );
  assert.equal(
    detectLanguage({ getItem: () => "invalid" }, ["zh-TW"]),
    "zh-CN",
  );
  assert.equal(
    detectLanguage(
      {
        getItem() {
          throw new Error("Storage unavailable");
        },
      },
      ["en-GB"],
    ),
    "en",
  );
});

test("catalogs contain complete English translations and preserve every placeholder", () => {
  for (const [key, value] of Object.entries({ ...CATALOG_EN, ...UI_EN })) {
    assert.ok(value.trim(), `Empty translation: ${key}`);
    assert.equal(
      chinese.test(value),
      false,
      `Chinese text in English value: ${key}`,
    );
    assert.deepEqual(
      placeholders(value),
      placeholders(key),
      `Placeholder mismatch: ${key}`,
    );
  }
  for (const [key, value] of Object.entries(UI_EN)) {
    if (Object.hasOwn(CATALOG_EN, key))
      assert.equal(value, CATALOG_EN[key], `Conflicting translation: ${key}`);
  }
});

test("all ecological descriptions and ability warnings translate without changing source data", () => {
  for (const entry of [
    ...ECOSYSTEM_SPECIES,
    ...Object.values(PLAYER_CHARACTERS),
    ...BOSS_SPECIES,
    ...Object.values(HUNTER_ABILITIES),
  ]) {
    for (const field of [
      "name",
      "label",
      "ability",
      "description",
      "counter",
      "realSize",
      "habitatNote",
      "tell",
      "advice",
    ]) {
      if (typeof entry[field] !== "string" || !chinese.test(entry[field]))
        continue;
      assert.equal(
        chinese.test(t(entry[field], [], "en")),
        false,
        `${entry.kind || entry.id}: ${field}`,
      );
    }
    for (const ability of [entry.active, entry.passive].filter(Boolean)) {
      for (const field of ["name", "description"])
        assert.equal(chinese.test(t(ability[field], [], "en")), false);
    }
  }
});

test("a pending message can be translated repeatedly, including nested names and parameters", () => {
  const pending = message`捕食 ${"沙丁鱼"} · ${message`生命 +${8} · `}体长 ${"3.2"} m`;
  assert.equal(t(pending, [], "en"), "Ate Sardine · Health +8 · Length 3.2m");
  assert.equal(t(pending, [], "zh-CN"), "捕食 沙丁鱼 · 生命 +8 · 体长 3.2 m");
  assert.equal(t("unregistered source", [], "en"), "unregistered source");
  assert.equal(t("constructor", [], "en"), "constructor");
});

test("language changes notify once and unsubscribe without timers or new game state", () => {
  setLanguage("zh-CN");
  const changes = [];
  const unsubscribe = onLanguageChange((locale) => changes.push(locale));
  assert.equal(setLanguage("en"), true);
  assert.equal(setLanguage("en"), false);
  assert.equal(setLanguage("xx"), false);
  assert.equal(getLanguage(), "en");
  unsubscribe();
  setLanguage("zh-CN");
  assert.deepEqual(changes, ["en"]);
});

test("world labels redraw in the same texture and release language subscriptions on disposal", () => {
  const originalDocument = globalThis.document;
  const rendered = [];
  const context = new Proxy(
    {
      fillText: (...args) => rendered.push(args[0]),
      createRadialGradient: () => ({ addColorStop() {} }),
    },
    { get: (target, key) => target[key] || (() => {}) },
  );
  globalThis.document = {
    documentElement: { lang: "zh-CN" },
    createElement: () => ({ width: 0, height: 0, getContext: () => context }),
  };
  let label, reward;
  try {
    setLanguage("zh-CN");
    label = makeLabel("禁入领地", "克拉肯");
    reward = createReward("frenzy");
    const texture = label.material.map;
    setLanguage("en");
    assert.equal(label.material.map, texture);
    assert.deepEqual(label.userData.labelText, {
      title: "Hostile territory",
      subtitle: "Kraken",
    });
    assert.match(
      reward.userData.label.userData.labelText.title,
      /Abyssal Frenzy/,
    );
    texture.dispose();
    reward.userData.label.material.map.dispose();
    const calls = rendered.length;
    setLanguage("zh-CN");
    assert.equal(rendered.length, calls);
  } finally {
    label?.material.dispose();
    reward?.traverse((object) => {
      object.geometry?.dispose();
      object.material?.map?.dispose();
      object.material?.dispose();
    });
    globalThis.document = originalDocument;
    setLanguage("zh-CN");
  }
});
