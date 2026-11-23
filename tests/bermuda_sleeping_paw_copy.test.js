import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { parsers } from "prettier/plugins/babel";
import { bermudaCaveGuideEntries } from "../src/bermuda_cave_guide.js";
import { t } from "../src/i18n.js";

const han = /[\u3400-\u9fff]/u;
const oldGuard = /抬头松臂|呼吸抬头|头臂|松双臂|双臂松开|收臂|臂弯/;

test("Current cave guide describes one real grounded forepaw in both languages", () => {
  const entry = bermudaCaveGuideEntries().find(
    (item) => item.id === "kaiju_lair",
  );
  assert.ok(entry);
  for (const source of [entry.text, entry.counter]) {
    assert.match(source, /前爪/);
    assert.match(source, /卸重、轻翻掌/);
    assert.doesNotMatch(source, oldGuard);
    assert.doesNotMatch(source, /松趾|趾骨/);
    assert.equal(t(source, [], "zh-CN"), source);
    const english = t(source, [], "en");
    assert.equal(han.test(english), false);
    assert.match(english, /grounded forepaw/);
    assert.match(english, /eases its weight/);
    assert.doesNotMatch(english, /head and arms|loosens the arms|toe bones/);
  }
  assert.match(entry.text, /波纹、骨纹、火纹/);
  assert.match(entry.text, /60秒/);
  assert.match(entry.text, /四位领主/);
  assert.match(t(entry.text, [], "en"), /within 60 seconds/);
  assert.match(t(entry.text, [], "en"), /all four lords/);
});

test("Actual main HUD and notices keep concise translated paw states", async () => {
  const source = await readFile(
    new URL("../src/main.js", import.meta.url),
    "utf8",
  );
  const ast = await parsers.babel.parse(source);
  const messages = new Set();
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "StringLiteral" && node.value.includes("前爪"))
      messages.add(node.value);
    for (const [key, value] of Object.entries(node)) {
      if (["loc", "extra", "comments", "tokens"].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  }
  visit(ast);
  // 原有压回预告、闭合、开放、解封和遮挡通知各一条，不增加提示层。
  assert.equal(messages.size, 5);
  assert.ok([...messages].some((message) => message.includes("即将压回")));
  assert.ok([...messages].some((message) => message.includes("已卸重")));
  assert.ok([...messages].some((message) => message.includes("等待睡梦松掌")));
  for (const message of messages) {
    assert.doesNotMatch(message, oldGuard);
    assert.doesNotMatch(message, /\n|趾骨|松趾/);
    assert.ok(message.length <= 35);
    assert.equal(t(message, [], "zh-CN"), message);
    const english = t(message, [], "en");
    assert.equal(han.test(english), false, message);
    assert.ok(english.length <= 90, english);
  }
});

test("The rendered Ocean Guide still uses the current cave entries", async () => {
  const source = await readFile(
    new URL("../src/ocean_guide.js", import.meta.url),
    "utf8",
  );
  assert.match(source, /import \{ bermudaCaveGuideEntries \}/);
  assert.match(source, /\.\.\.bermudaCaveGuideEntries\(\)/);
});
