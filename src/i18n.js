import { UI_EN } from "./locales/ui_en.js";
import { CATALOG_EN } from "./locales/catalog_en.js";
import { BERMUDA_EN } from "./locales/bermuda_en.js";
import { ATLANTIS_EN } from "./locales/atlantis_en.js";

export const LANGUAGE_KEY = "abyssal-language";
export const SUPPORTED_LANGUAGES = Object.freeze(["zh-CN", "en"]);
const english = Object.freeze(
  Object.assign(
    Object.create(null),
    CATALOG_EN,
    UI_EN,
    ATLANTIS_EN,
    BERMUDA_EN,
  ),
);
const listeners = new Set();
const sources = new WeakMap();
const attributes = ["aria-label", "title", "placeholder", "alt", "content"];

/** 将系统语言归一到游戏支持的两种语言。 */
export function normalizeLanguage(language) {
  return /^zh(?:-|$)/i.test(language || "") ? "zh-CN" : "en";
}

/** 私密浏览禁用存储时仍可在本页切换语言。 */
export function detectLanguage(storage, languages = ["zh-CN"]) {
  try {
    const saved = storage?.getItem(LANGUAGE_KEY);
    if (SUPPORTED_LANGUAGES.includes(saved)) return saved;
  } catch {
    /* 存储不可用时使用浏览器语言。 */
  }
  return normalizeLanguage(languages[0]);
}
function browserLanguage() {
  if (typeof window === "undefined") return "zh-CN";
  let storage;
  try {
    storage = window.localStorage;
  } catch {
    /* 隐私模式下访问属性本身也可能抛出异常。 */
  }
  return detectLanguage(storage, navigator.languages || [navigator.language]);
}
let language = browserLanguage();
let languageEnabled = true;
export const getLanguage = () => language;

/** 消息描述保留原文与参数，通知显示期间切换语言不丢失语义。 */
export function message(parts, ...values) {
  return {
    key: parts.reduce(
      (text, part, index) =>
        text + part + (index < values.length ? `{${index}}` : ""),
      "",
    ),
    values,
  };
}
export function t(source, values = [], locale = language) {
  if (source === null || source === undefined) return "";
  if (typeof source === "object" && typeof source.key === "string") {
    return t(source.key, source.values, locale);
  }
  const key = String(source);
  const template =
    locale === "en"
      ? (english[key] ?? english[key.replace(/\s+/g, " ")] ?? key)
      : key;
  return template.replace(/\{(\d+)\}/g, (match, index) =>
    index < values.length ? t(values[index], [], locale) : match,
  );
}
export const tr = (parts, ...values) => t(message(parts, ...values));

/** 仅首页允许切换语言，出发、暂停及结算都锁住同一语言状态。 */
export function setLanguageEnabled(enabled) {
  languageEnabled = Boolean(enabled);
  if (typeof document === "undefined") return;
  for (const control of document.querySelectorAll("[data-language-select]")) {
    control.disabled = !languageEnabled;
    control.title = languageEnabled ? t("语言") : t("返回主界面后可切换语言");
  }
}

export function onLanguageChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function setLanguage(next) {
  if (
    !languageEnabled ||
    !SUPPORTED_LANGUAGES.includes(next) ||
    next === language
  )
    return false;
  language = next;
  try {
    if (typeof window !== "undefined")
      window.localStorage?.setItem(LANGUAGE_KEY, language);
  } catch {
    /* 语言切换不依赖持久存储成功。 */
  }
  if (typeof document !== "undefined") document.documentElement.lang = language;
  for (const listener of listeners) listener(language);
  setLanguageEnabled(languageEnabled);
  return true;
}

/** 只在创建界面或切换语言时翻译静态节点，不启动观察器或额外动画循环。 */
export function translateDOM(root) {
  const visit = (node) => {
    if (node.nodeType === 3) {
      const current = node.nodeValue;
      const saved = sources.get(node);
      const original =
        saved && saved.rendered === current ? saved.original : current;
      const text = original.trim();
      const translated = text ? original.replace(text, t(text)) : original;
      node.nodeValue = translated;
      sources.set(node, { original, rendered: translated });
      return;
    }
    if (node.nodeType === 1) {
      if (node.matches("script, style, [data-no-i18n]")) return;
      let saved = sources.get(node);
      if (!saved) sources.set(node, (saved = {}));
      for (const name of attributes) {
        if (!node.hasAttribute(name)) continue;
        const current = node.getAttribute(name);
        const previous = saved[name];
        const original =
          previous && previous.rendered === current
            ? previous.original
            : current;
        const rendered = t(original);
        node.setAttribute(name, rendered);
        saved[name] = { original, rendered };
      }
    }
    for (const child of node.childNodes) visit(child);
  };
  visit(root);
}

export function localizeRecord(entry) {
  return Object.fromEntries(
    Object.entries(entry).map(([key, value]) => [
      key,
      typeof value === "string" ? t(value) : value,
    ]),
  );
}

/** 设置首页和暂停菜单共用的语言入口，并更新静态无障碍说明。 */
export function initializeLanguage() {
  document.documentElement.lang = language;
  translateDOM(document.documentElement);
  for (const control of document.querySelectorAll("[data-language-select]")) {
    control.value = language;
    control.addEventListener("change", () => setLanguage(control.value));
  }
  onLanguageChange(() => {
    translateDOM(document.documentElement);
    for (const control of document.querySelectorAll("[data-language-select]"))
      control.value = language;
  });
}

const markupCache = new WeakMap();
export function setMarkup(element, markup) {
  const previous = markupCache.get(element);
  if (previous?.markup === markup && previous.language === language) return;
  markupCache.set(element, { markup, language });
  element.innerHTML = markup;
  translateDOM(element);
}
