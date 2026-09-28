import { selectCharacter } from "./menu_picker_helpers.mjs";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// 使用真实浏览器检查双语界面；开发接口仅用于读状态、切换语言和隔离安全水域。
const baseUrl = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178/";
const outputDirectory = ".local/i18n_verification";
const report = {
  startedAt: new Date().toISOString(),
  baseUrl,
  checks: [],
  consoleErrors: [],
  screenshots: [],
  limits: [
    "Viewport emulation is not real-phone acceptance.",
    "Controlled language and state checks do not establish natural full-run gameplay, audio quality, or device performance.",
    "Intentional horizontal scrolling in guide filters and mobile entry lists is allowed; containing layouts must stay within the viewport.",
  ],
};
await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });

async function capture(page, name) {
  const path = `${outputDirectory}/${name}.png`;
  await page.screenshot({ path, animations: "disabled", timeout: 15000 });
  report.screenshots.push(path);
  return path;
}

async function check(page, name, action) {
  try {
    const evidence = await action();
    report.checks.push({ name, passed: true, evidence });
    console.log(`PASS ${name}`);
    return true;
  } catch (error) {
    let screenshot;
    try {
      screenshot = await capture(
        page,
        `failure_${report.checks.length}_${name.replaceAll(/[^a-z0-9_-]/gi, "_")}`,
      );
    } catch {
      // 页面崩溃时保留原始失败，不让截图错误覆盖原因。
    }
    report.checks.push({
      name,
      passed: false,
      error: error.stack || String(error),
      screenshot,
    });
    console.error(`FAIL ${name}: ${error.message.slice(0, 1000)}`);
    return false;
  }
}

async function settle(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

async function openPage(viewport) {
  const context = await browser.newContext({
    viewport,
    locale: "en-US",
    colorScheme: "light",
    isMobile: viewport.width < 900,
    hasTouch: viewport.width < 900,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => {
    report.consoleErrors.push({
      viewport,
      kind: "pageerror",
      message: error.message,
      url: page.url(),
    });
  });
  page.on("console", (entry) => {
    if (entry.type() === "error")
      report.consoleErrors.push({
        viewport,
        kind: "console",
        message: entry.text(),
        location: entry.location(),
        url: page.url(),
      });
  });
  await page.goto(baseUrl);
  await page.waitForFunction(() => !!window.__ABYSSAL__?.guide);
  await page.evaluate(() => document.fonts.ready);
  await settle(page);
  return { context, page };
}

async function setLanguage(page, locale) {
  await page.evaluate((next) => {
    // 复用页面实际绑定的监听器，避免 Vite HMR 查询参数生成第二份语言模块。
    const control = document.querySelector("header [data-language-select]");
    control.value = next;
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }, locale);
  await settle(page);
  assert.equal(await page.locator("html").getAttribute("lang"), locale);
}

async function assertEnglish(page, rootSelector) {
  const untranslated = await page.evaluate((selector) => {
    const root = document.querySelector(selector);
    if (!root) throw new Error(`Missing text root: ${selector}`);
    const issues = [];
    const chinese = /[\u3400-\u9fff]/u;
    function visible(element) {
      if (element.closest("[hidden], [data-no-i18n], script, style, canvas"))
        return false;
      if (element.tagName === "OPTION") element = element.closest("select");
      return element?.checkVisibility({
        checkOpacity: true,
        checkVisibilityCSS: true,
      });
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.nodeValue.trim();
      if (text && chinese.test(text) && visible(node.parentElement))
        issues.push({
          kind: "text",
          text,
          element: node.parentElement.outerHTML.slice(0, 400),
        });
    }
    for (const element of [
      root,
      ...root.querySelectorAll("[aria-label], [title], [placeholder]"),
    ]) {
      if (!visible(element)) continue;
      for (const name of ["aria-label", "title", "placeholder"]) {
        const text = element.getAttribute(name);
        if (text && chinese.test(text))
          issues.push({
            kind: name,
            text,
            element: element.outerHTML.slice(0, 400),
          });
      }
    }
    return issues;
  }, rootSelector);
  assert.deepEqual(untranslated, [], JSON.stringify(untranslated, null, 2));
  return { rootSelector, untranslated };
}

async function assertLayout(page, selectors) {
  const layout = await page.evaluate((roots) => {
    const viewport = { width: innerWidth, height: innerHeight };
    const documents = [document.documentElement, document.body].map(
      (element) => ({
        tag: element.tagName,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }),
    );
    const containers = roots.flatMap((selector) =>
      [...document.querySelectorAll(selector)]
        .filter((element) =>
          element.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
          }),
        )
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            selector,
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            overflowX: style.overflowX,
            borderLeft: parseFloat(style.borderLeftWidth) || 0,
          };
        }),
    );
    return { viewport, documents, containers };
  }, selectors);
  for (const document of layout.documents)
    assert.ok(
      document.scrollWidth <= layout.viewport.width + 1,
      JSON.stringify(layout),
    );
  for (const container of layout.containers) {
    assert.ok(
      container.left >= -1 && container.right <= layout.viewport.width + 1,
      JSON.stringify(layout),
    );
    // 嵌套容器允许可见内容进入自身外侧留白，但不能越过视口；裁切与滚动容器仍严格检查。
    assert.ok(
      container.overflowX === "visible"
        ? container.left + container.borderLeft + container.scrollWidth <=
            layout.viewport.width + 1
        : container.scrollWidth <= container.clientWidth + 1,
      JSON.stringify(layout),
    );
  }
  return layout;
}

async function assertGuideEntryText(page) {
  const entries = await page.locator(".guide-entry").evaluateAll((buttons) =>
    buttons.map((button) => ({
      id: button.dataset.catalogId,
      parts: [...button.querySelectorAll("b, small, em")]
        .filter((element) => element.checkVisibility())
        .map((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return {
            tag: element.tagName,
            text: element.textContent,
            rects: [...range.getClientRects()].map((rect) => ({
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
            })),
          };
        }),
    })),
  );
  for (const entry of entries) {
    for (let left = 0; left < entry.parts.length; left++) {
      for (let right = left + 1; right < entry.parts.length; right++) {
        for (const a of entry.parts[left].rects) {
          for (const b of entry.parts[right].rects) {
            const overlapX =
              Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const overlapY =
              Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            assert.ok(overlapX <= 1 || overlapY <= 1, JSON.stringify(entry));
          }
        }
      }
    }
  }
  return entries;
}

async function verifyMenu(page) {
  await check(page, "language_default_follows_browser", async () => {
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    assert.equal(
      await page.locator("header [data-language-select]").inputValue(),
      "en",
    );
    return assertEnglish(page, "body");
  });
  await check(page, "language_selector_reload_persistence", async () => {
    const observed = [];
    for (const locale of ["zh-CN", "en"]) {
      await page.locator("header [data-language-select]").selectOption(locale);
      await settle(page);
      assert.equal(await page.locator("html").getAttribute("lang"), locale);
      assert.equal(
        await page.evaluate(() => localStorage.getItem("abyssal-language")),
        locale,
      );
      await page.reload();
      await page.waitForFunction(() => !!window.__ABYSSAL__?.guide);
      assert.equal(await page.locator("html").getAttribute("lang"), locale);
      assert.equal(
        await page.locator("header [data-language-select]").inputValue(),
        locale,
      );
      observed.push({
        locale,
        heading: await page.locator("#menu h1").innerText(),
      });
    }
    assert.notEqual(observed[0].heading, observed[1].heading);
    return observed;
  });
  await check(page, "menu_options_survive_language_switches", async () => {
    await selectCharacter(page, "squid");
    await page.locator(".expedition-settings summary").click();
    await page.locator("#menu-markers").uncheck();
    await page.locator("#menu-invert-y").check();
    await page.locator(".ability-details summary").click();
    const before = await menuState(page);
    assert.equal(before.character, "squid");
    assert.equal(before.markers, false);
    assert.equal(before.invert, true);
    const changes = [];
    for (const locale of ["zh-CN", "en", "zh-CN", "en"]) {
      await page.locator("header [data-language-select]").selectOption(locale);
      await settle(page);
      const after = await menuState(page);
      assert.deepEqual(after, before);
      if (locale === "en") await assertEnglish(page, "body");
      changes.push(locale);
    }
    await page.reload();
    await page.waitForFunction(() => !!window.__ABYSSAL__?.guide);
    assert.equal(await page.locator("#menu-markers").isChecked(), false);
    assert.equal(await page.locator("#menu-invert-y").isChecked(), true);
    return {
      preserved: before,
      switches: changes,
      storedPreferencesSurvivedReload: true,
    };
  });
}

async function menuState(page) {
  return page.evaluate(() => ({
    character: document.querySelector("#character-select").value,
    region: document.querySelector("#region-select").value,
    markers: document.querySelector("#menu-markers").checked,
    invert: document.querySelector("#menu-invert-y").checked,
    settingsOpen: document.querySelector(".expedition-settings").open,
    abilitiesOpen: document.querySelector(".ability-details").open,
    avatar: window.__ABYSSAL__.avatar.uuid,
    markerState: window.__ABYSSAL__.markersEnabled,
  }));
}

async function verifyCatalog(page) {
  await setLanguage(page, "en");
  await page.click("#open-guide");
  await settle(page);
  for (const [category, count] of [
    ["all", 35],
    ["player", 2],
    ["reward", 3],
    ["shoal", 13],
    ["hunter", 5],
    ["ancient", 6],
    ["lord", 4],
    ["surface", 1],
    ["human", 4],
  ]) {
    await check(page, `guide_english_${category}`, async () => {
      await page.click(`[data-category="${category}"]`);
      assert.equal(await page.locator(".guide-entry").count(), count);
      const entries = await page
        .locator(".guide-entry")
        .evaluateAll((buttons) =>
          buttons.map((button) => ({
            id: button.dataset.catalogId,
            name: button.innerText,
          })),
        );
      if (category === "all") {
        await assertEnglish(page, "#ocean-guide");
        return { count, entries };
      }
      for (const entry of entries) {
        await page
          .locator(`.guide-entry[data-catalog-id="${entry.id}"]`)
          .click();
        await assertEnglish(page, "#ocean-guide");
      }
      if (category === "human") {
        await page.click('.guide-entry[data-kind="swimmer"]');
        await page.click('[data-human-sex="female"]');
        await assertEnglish(page, "#ocean-guide");
        await page.click('.guide-entry[data-kind="diver"]');
        await page.click('[data-human-sex="male"]');
        await assertEnglish(page, "#ocean-guide");
      }
      return { count, entries };
    });
  }
  await check(
    page,
    "guide_model_and_renderer_reused_across_languages",
    async () => {
      await page.click('[data-category="player"]');
      await page.click('.guide-entry[data-kind="squid"]');
      await settle(page);
      const result = await page.evaluate(() => {
        const setLanguage = (locale) => {
          const control = document.querySelector(
            "header [data-language-select]",
          );
          control.value = locale;
          control.dispatchEvent(new Event("change", { bubbles: true }));
        };
        const guide = window.__ABYSSAL__.guide;
        const initial = guide.inspectPreview();
        const canvas = document.querySelector(".guide-preview canvas");
        const selected = () =>
          document.querySelector('.guide-entry[aria-pressed="true"]').dataset
            .catalogId;
        const initialId = selected();
        const results = [];
        for (const locale of ["zh-CN", "en", "zh-CN", "en"]) {
          setLanguage(locale);
          const after = guide.inspectPreview();
          results.push({
            locale,
            sameModel: after.model === initial.model,
            sameRenderer: after.renderer === initial.renderer,
            sameScene: after.scene === initial.scene,
            sameCanvas:
              document.querySelector(".guide-preview canvas") === canvas,
            canvasCount: document.querySelectorAll(".guide-preview canvas")
              .length,
            selectedId: selected(),
            initialId,
            title: document.querySelector(".guide-info h3").textContent,
            geometries: after.renderer.info.memory.geometries,
          });
        }
        return results;
      });
      for (const entry of result) {
        assert.ok(
          entry.sameModel &&
            entry.sameRenderer &&
            entry.sameScene &&
            entry.sameCanvas,
        );
        assert.equal(entry.canvasCount, 1);
        assert.equal(entry.selectedId, entry.initialId);
        assert.equal(entry.geometries, result[0].geometries);
        assert.match(
          entry.title,
          entry.locale === "en" ? /Giant Squid/ : /大王乌贼/,
        );
      }
      return result;
    },
  );
  await check(
    page,
    "guide_empty_search_restores_same_entry_details",
    async () => {
      await page.fill("#guide-search", "");
      await setLanguage(page, "en");
      await page.click('[data-category="all"]');
      await page.locator(".guide-entry").first().click();
      const before = {
        id: await page
          .locator('.guide-entry[aria-pressed="true"]')
          .getAttribute("data-catalog-id"),
        title: await page.locator(".guide-info h3").innerText(),
      };
      await page.fill("#guide-search", "no_such_species_93741");
      assert.equal(await page.locator(".guide-entry").count(), 0);
      assert.equal(await page.locator(".guide-info h3").count(), 0);
      await page.fill("#guide-search", "");
      assert.equal(await page.locator(".guide-entry").count(), 35);
      assert.equal(
        await page
          .locator('.guide-entry[aria-pressed="true"]')
          .getAttribute("data-catalog-id"),
        before.id,
      );
      assert.equal(
        await page.locator(".guide-info h3").innerText(),
        before.title,
      );
      return before;
    },
  );
  await check(page, "guide_search_in_both_languages_and_rewards", async () => {
    const searches = [];
    for (const locale of ["en", "zh-CN"]) {
      await page.fill("#guide-search", "");
      await setLanguage(page, locale);
      await page.click('[data-category="all"]');
      for (const [query, kind] of locale === "en"
        ? [
            ["Megalodon", "megalodon"],
            ["Frenzy", "reward_frenzy"],
          ]
        : [
            ["巨齿鲨", "megalodon"],
            ["狂食", "reward_frenzy"],
          ]) {
        await page.fill("#guide-search", query);
        assert.equal(await page.locator(".guide-entry").count(), 1);
        assert.equal(
          await page.locator(".guide-entry").getAttribute("data-kind"),
          kind,
        );
        if (locale === "en") await assertEnglish(page, "#ocean-guide");
        searches.push({ locale, query, kind });
      }
      await page.fill("#guide-search", "no_such_species_93741");
      assert.equal(await page.locator(".guide-entry").count(), 0);
      assert.match(
        await page.locator(".guide-info").innerText(),
        locale === "en" ? /No results/ : /无结果/,
      );
    }
    await page.fill("#guide-search", "");
    await setLanguage(page, "en");
    return searches;
  });
  await page.click(".guide-close");
}

async function verifyRuntime(page, character) {
  await page.reload();
  await page.waitForFunction(() => !!window.__ABYSSAL__?.guide);
  await setLanguage(page, "en");
  await selectCharacter(page, character);
  await page.click("#start");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  // 无敌人移动或结算注入；安全水域避免语言断言期间的自然接触造成噪声。
  await page.evaluate(() => window.__ABYSSAL__.setPosition(180, -90, -320));
  await page.waitForFunction(() => window.__ABYSSAL__.player.elapsed > 0.2);
  await page.keyboard.press("KeyJ");
  await page.waitForFunction(
    () => document.querySelector("#sonar-control").disabled,
  );
  await check(
    page,
    `${character}_playing_language_preserves_state`,
    async () => {
      const results = await page.evaluate(() => {
        const setLanguage = (locale) => {
          const control = document.querySelector(
            "header [data-language-select]",
          );
          control.value = locale;
          control.dispatchEvent(new Event("change", { bubbles: true }));
        };
        const g = window.__ABYSSAL__;
        const beforePlayer = g.player;
        const beforeAvatar = g.avatar;
        const snapshot = () => ({
          mode: g.mode,
          player: JSON.parse(JSON.stringify(g.player)),
          position: g.position.toArray(),
          controls: g.controls,
          sonar: g.sonar.state,
          ink: { ...g.inkAbility },
        });
        const result = [];
        for (const locale of ["zh-CN", "en"]) {
          const before = snapshot();
          setLanguage(locale);
          result.push({
            locale,
            before,
            after: snapshot(),
            samePlayer: g.player === beforePlayer,
            sameAvatar: g.avatar === beforeAvatar,
            disabled: document.querySelector("#sonar-control").disabled,
            skillLabel: document.querySelector("#sonar-control").textContent,
          });
        }
        return result;
      });
      for (const result of results) {
        assert.deepEqual(result.after, result.before);
        assert.ok(result.samePlayer && result.sameAvatar && result.disabled);
        assert.ok(result.before.player.elapsed > 0);
        const activeState =
          character === "orca" ? result.before.sonar : result.before.ink;
        assert.ok(activeState.readyAt > result.before.player.elapsed);
      }
      await assertEnglish(page, "body");
      return results;
    },
  );
  await page.click("#pause");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "paused");
  await check(
    page,
    `${character}_pause_selector_preserves_player_and_skill`,
    async () => {
      const state = () =>
        page.evaluate(() => {
          const g = window.__ABYSSAL__;
          return {
            player: g.player,
            position: g.position.toArray(),
            sonar: g.sonar.state,
            ink: g.inkAbility,
            avatar: g.avatar.uuid,
            mode: g.mode,
          };
        });
      const before = await state();
      for (const locale of ["zh-CN", "en"]) {
        await page
          .locator("#overlay [data-language-select]")
          .selectOption(locale);
        await settle(page);
        assert.deepEqual(await state(), before);
        assert.equal(
          await page.locator("header [data-language-select]").inputValue(),
          locale,
        );
        if (locale === "en") await assertEnglish(page, "#overlay");
      }
      await page.waitForTimeout(250);
      assert.deepEqual(await state(), before);
      await page.click("#resume");
      await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
      assert.equal(await page.locator("#sonar-control").isDisabled(), true);
      return { pausedState: before, resumedWithCooldown: true };
    },
  );
}

async function verifyWorldLabels(page) {
  await check(
    page,
    "world_labels_translate_without_replacing_textures",
    async () => {
      await setLanguage(page, "en");
      const rows = await page.evaluate(() => {
        const g = window.__ABYSSAL__;
        const labels = [
          ...g.pickups.map((pickup) => pickup.mesh.userData.label),
          ...g.encounters.bosses.map((boss) => boss.label),
        ];
        const before = labels.map((label) => ({
          label,
          texture: label.material.map,
          canvas: label.material.map.image,
          bitmap: label.material.map.image.toDataURL(),
        }));
        const result = [];
        for (const locale of ["zh-CN", "en"]) {
          const control = document.querySelector(
            "header [data-language-select]",
          );
          control.value = locale;
          control.dispatchEvent(new Event("change", { bubbles: true }));
          result.push({
            locale,
            labels: before.map(({ label, texture, canvas, bitmap }) => ({
              ...label.userData.labelText,
              sameTexture: label.material.map === texture,
              sameCanvas: label.material.map.image === canvas,
              bitmapChangedFromEnglish: canvas.toDataURL() !== bitmap,
            })),
          });
        }
        return result;
      });
      for (const row of rows) {
        assert.ok(row.labels.length > 0);
        for (const label of row.labels) {
          assert.ok(label.sameTexture && label.sameCanvas);
          assert.equal(label.bitmapChangedFromEnglish, row.locale === "zh-CN");
          assert.equal(
            /[\u3400-\u9fff]/u.test(label.title + label.subtitle),
            row.locale === "zh-CN",
          );
        }
      }
      return rows;
    },
  );
}

async function verifyLayouts(page, viewport) {
  const size = `${viewport.width}x${viewport.height}`;
  await page.reload();
  await page.waitForFunction(() => !!window.__ABYSSAL__?.guide);
  for (const locale of ["en", "zh-CN"]) {
    await setLanguage(page, locale);
    await page.evaluate(() => (document.querySelector("#menu").scrollTop = 0));
    await check(page, `${size}_${locale}_menu_layout`, async () => {
      if (locale === "en") await assertEnglish(page, "body");
      const layout = await assertLayout(page, [
        "header",
        ".header-tools",
        "#menu",
        ".menu-copy",
        ".menu-actions",
      ]);
      const screenshot = await capture(page, `${size}_${locale}_menu`);
      let actionsScreenshot;
      if (viewport.width < 900) {
        await page.locator("#start").scrollIntoViewIfNeeded();
        const button = await page.locator("#start").boundingBox();
        assert.ok(
          button &&
            button.y >= 0 &&
            button.y + button.height <= viewport.height + 1,
        );
        actionsScreenshot = await capture(
          page,
          `${size}_${locale}_menu_actions`,
        );
      }
      return { ...layout, screenshot, actionsScreenshot };
    });
    await page.click("#open-guide");
    await page.fill("#guide-search", "");
    await page.click('[data-category="player"]');
    await page.click('.guide-entry[data-kind="squid"]');
    await settle(page);
    await check(page, `${size}_${locale}_guide_layout`, async () => {
      if (locale === "en") await assertEnglish(page, "#ocean-guide");
      const entries = await assertGuideEntryText(page);
      const layout = await assertLayout(page, [
        "#ocean-guide",
        ".guide-heading",
        ".guide-content",
        ".guide-detail",
        ".guide-info",
      ]);
      const screenshot = await capture(page, `${size}_${locale}_guide`);
      let detailScreenshot;
      if (viewport.width < 900) {
        const advice = page.locator(".guide-info > .guide-advice").last();
        await advice.scrollIntoViewIfNeeded();
        const rect = await advice.boundingBox();
        assert.ok(
          rect && rect.y >= 0 && rect.y + rect.height <= viewport.height + 1,
        );
        detailScreenshot = await capture(
          page,
          `${size}_${locale}_guide_detail`,
        );
      }
      return { ...layout, entries, screenshot, detailScreenshot };
    });
    await page.click('[data-category="reward"]');
    await page.click('.guide-entry[data-kind="reward_frenzy"]');
    await check(page, `${size}_${locale}_reward_layout`, async () => {
      if (locale === "en") await assertEnglish(page, "#ocean-guide");
      const entries = await assertGuideEntryText(page);
      const layout = await assertLayout(page, [
        "#ocean-guide",
        ".guide-content",
        ".guide-detail",
        ".guide-info",
      ]);
      return {
        ...layout,
        entries,
        screenshot: await capture(page, `${size}_${locale}_reward`),
      };
    });
    await page.click(".guide-close");
  }
  await selectCharacter(page, "orca");
  await page.click("#start");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  await page.keyboard.press("KeyJ");
  for (const locale of ["en", "zh-CN"]) {
    await setLanguage(page, locale);
    await check(page, `${size}_${locale}_sonar_status_text`, async () => {
      // 仅布置已有展示接口的零组/一组/四组状态；不移动或改写任何生物和技能时钟。
      const states = await page.evaluate(() => {
        const panel = document.querySelector("#sonar-panel");
        const count = panel.querySelector(".sonar-count");
        const time = panel.querySelector(".sonar-time");
        const bounds = (element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          const rect = range.getBoundingClientRect();
          return {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
          };
        };
        return [0, 1, 4].map((groups) => {
          window.__ABYSSAL__.sonar.setPresentation({
            frontVisible: groups * 2,
            shownGroups: groups,
          });
          const rect = panel.getBoundingClientRect();
          return {
            groups,
            text: count.textContent,
            timeText: time.textContent,
            visible: count.checkVisibility(),
            panel: {
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
            },
            count: bounds(count),
            time: bounds(time),
          };
        });
      });
      for (const state of states) {
        assert.ok(state.visible, JSON.stringify(states));
        assert.ok(
          state.count.right <= state.time.left + 1,
          JSON.stringify(states),
        );
        assert.ok(
          state.count.left >= state.panel.left &&
            state.time.right <= state.panel.right + 1,
          JSON.stringify(states),
        );
        assert.ok(
          state.count.top >= state.panel.top &&
            state.count.bottom <= state.panel.bottom + 1,
          JSON.stringify(states),
        );
      }
      return states;
    });
    await check(page, `${size}_${locale}_hud_layout`, async () => {
      if (locale === "en") await assertEnglish(page, "body");
      const layout = await assertLayout(page, [
        "header",
        ".header-tools",
        "#hud",
        "#hud-overview",
        ".bottom-hud",
        "#combat-status",
        "#sonar-panel",
      ]);
      return {
        ...layout,
        screenshot: await capture(page, `${size}_${locale}_hud`),
      };
    });
  }
  await page.click("#pause");
  for (const locale of ["en", "zh-CN"]) {
    await page.locator("#overlay [data-language-select]").selectOption(locale);
    await settle(page);
    await check(page, `${size}_${locale}_pause_layout`, async () => {
      if (locale === "en") await assertEnglish(page, "#overlay");
      const layout = await assertLayout(page, [
        "#overlay",
        ".modal-card",
        ".overlay-language",
      ]);
      return {
        ...layout,
        screenshot: await capture(page, `${size}_${locale}_pause`),
      };
    });
  }
}

try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 667 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    const { context, page } = await openPage(viewport);
    try {
      if (viewport.width === 1440) {
        await verifyMenu(page);
        await verifyCatalog(page);
        await verifyWorldLabels(page);
        await verifyRuntime(page, "orca");
        await verifyRuntime(page, "squid");
      }
      await verifyLayouts(page, viewport);
    } catch (error) {
      await check(
        page,
        `${viewport.width}x${viewport.height}_scenario_setup`,
        () => {
          throw error;
        },
      );
    } finally {
      await context.close();
    }
  }
} catch (error) {
  report.fatalError = error.stack || String(error);
  process.exitCode = 1;
} finally {
  await browser.close();
  report.finishedAt = new Date().toISOString();
  report.passed = report.checks.filter((entry) => entry.passed).length;
  report.failed = report.checks.filter((entry) => !entry.passed).length;
  report.ok =
    !report.fatalError &&
    report.failed === 0 &&
    report.consoleErrors.length === 0;
  if (!report.ok) process.exitCode = 1;
  await writeFile(
    `${outputDirectory}/report.json`,
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(
    JSON.stringify({
      passed: report.passed,
      failed: report.failed,
      consoleErrors: report.consoleErrors.length,
      report: `${outputDirectory}/report.json`,
    }),
  );
}
