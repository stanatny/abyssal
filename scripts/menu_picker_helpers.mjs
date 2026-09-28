/** 通过真实选择面板切换角色，等待关闭后再继续后续交互。 */
export async function selectCharacter(page, id) {
  await page.locator("#character-select").click();
  const picker = page.locator("#expedition-picker");
  await picker.waitFor({ state: "visible" });
  await picker.locator(`button[data-choice-value="${id}"]`).click();
  await picker.waitFor({ state: "hidden" });
}
