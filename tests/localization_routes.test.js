import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { parsers } from "prettier/plugins/babel";
import { t } from "../src/i18n.js";
import { REGIONS, CHARACTERS } from "../src/expedition_config.js";

const han = /[\u3400-\u9fff]/u;
function translated(source, label) {
  if (!han.test(source) || source.includes("<")) return;
  assert.equal(han.test(t(source, [], "en")), false, `${label}: ${source}`);
  assert.equal(t(source, [], "zh-CN"), source, label);
}

test("every loaded English dictionary preserves language and interpolation slots", async () => {
  const path = new URL("../src/i18n.js", import.meta.url);
  const ast = await parsers.babel.parse(await readFile(path, "utf8"));
  const slots = (text) =>
    [...text.matchAll(/\{\d+\}/g)].map(([slot]) => slot).sort();
  for (const declaration of ast.program.body) {
    if (declaration.type !== "ImportDeclaration") continue;
    const module = await import(new URL(declaration.source.value, path));
    for (const binding of declaration.specifiers) {
      for (const [key, value] of Object.entries(
        module[binding.imported.name],
      )) {
        assert.equal(typeof value, "string", key);
        assert.ok(value.trim(), key);
        assert.equal(han.test(value), false, key);
        assert.deepEqual(slots(value), slots(key), key);
      }
    }
  }
});

test("regional names, objectives and character choices translate in either locale", () => {
  for (const region of REGIONS) {
    for (const field of ["name", "description", "departureHint"])
      if (region[field]) translated(region[field], `${region.id}.${field}`);
    for (const [field, value] of Object.entries(region.objective))
      if (typeof value === "string") translated(value, `${region.id}.${field}`);
  }
  for (const character of CHARACTERS) {
    translated(character.name, character.id);
    for (const ability of [character.active, character.passive].filter(Boolean))
      for (const field of ["name", "description"])
        if (ability[field])
          translated(ability[field], `${character.id}.${field}`);
  }
});

// 核对实际渲染/通知调用中的源文案，而不是只验证词典里已经存在的键。
// HTML 由原生浏览器检查实际文本节点；配置引用由独立目录契约覆盖。
test("literal runtime messages and loading stages have English translations", async () => {
  const failures = [];
  let checked = 0;
  const routed = new Set(["t", "notify", "damage", "stage"]);
  function literals(node, file) {
    walk(node, (child) => {
      if (
        child.type !== "StringLiteral" ||
        !han.test(child.value) ||
        child.value.includes("<")
      )
        return;
      checked++;
      if (han.test(t(child.value, [], "en")))
        failures.push(`${file}:${child.loc.start.line}: ${child.value}`);
    });
  }
  function walk(node, visit) {
    if (!node || typeof node !== "object") return;
    visit(node);
    for (const [key, value] of Object.entries(node)) {
      if (["loc", "extra", "comments", "tokens"].includes(key)) continue;
      if (Array.isArray(value)) value.forEach((child) => walk(child, visit));
      else if (value && typeof value === "object") walk(value, visit);
    }
  }
  async function inspect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = `${directory}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name !== "locales") await inspect(file);
        continue;
      }
      if (!file.endsWith(".js")) continue;
      const ast = await parsers.babel.parse(await readFile(file, "utf8"));
      const usesTranslation = ast.program.body.some(
        (node) =>
          node.type === "ImportDeclaration" &&
          node.source.value.endsWith("/i18n.js") &&
          node.specifiers.some((s) => s.imported?.name === "t"),
      );
      walk(ast, (node) => {
        if (
          node.type === "CallExpression" &&
          routed.has(node.callee.name || node.callee.property?.name)
        ) {
          if (node.callee.name === "t" && !usesTranslation) return;
          node.arguments.forEach((argument) => literals(argument, file));
        } else if (
          node.type === "TaggedTemplateExpression" &&
          ["tr", "message"].includes(node.tag.name)
        ) {
          const key = node.quasi.quasis
            .map(
              (part, i) =>
                part.value.cooked +
                (i < node.quasi.expressions.length ? `{${i}}` : ""),
            )
            .join("");
          if (!han.test(key) || key.includes("<")) return;
          checked++;
          if (han.test(t(key, [], "en")))
            failures.push(`${file}:${node.loc.start.line}: ${key}`);
        }
      });
    }
  }
  await inspect("src");
  assert.ok(checked > 100);
  assert.deepEqual([...new Set(failures)], []);
});
