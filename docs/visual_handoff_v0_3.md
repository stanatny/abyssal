# 给 Kimi 的 v0.3 视觉重绘交接

## 目标与授权

用户于2026-09-27明确要求：Codex先完成功能迭代，再交给Kimi重做所有界面元素、鱼类与巨兽模组和特效。需要实际可玩的新视觉，不止是方案或概念图。**本轮没有新的提交授权；不要commit、push或改GitHub Pages，先提供未提交试玩。**

工作目录：`/Users/stan/Developer/GitHub/abyssal`，公开仓库 `stanatny/abyssal`。已发布基线 `96d57ff` 是v0.2。本轮v0.3的功能代码已在同一工作区，禁止重置、覆盖或从远端拉回旧版替换。先阅读 `HANDOFF.md`、`docs/feedback_v0_3.md` 与 `docs/verification.md`，再看实际运行场景。

## 当前功能基础

- 虎鲸32米/秒冲刺、约7秒体力续航；中级猎手低频预警技能；领主仍有独立技能、领地、3秒虚弱、多次咬击。
- 真正的水下连续蓄势、过水线起跳、空中惯性和落水过渡；不允许水面起飞或空中二段跳。
- 一艘游轮、两艘帆船、海鸥、航迹和水花。船只纯环境，不参与伤害或捕食。
- 血雾、水流咬击弧、受击反馈、墨云空间遮挡及诱光；暂停/重开处理。
- 重做原创合成配乐/音效，音频已通过专项验证。优先保持声音接口，不需要再次推翻这部分。
- 首页海洋图鉴：13种生物、分类与搜索、三维拖动展示、体长/水层/技能/躲避提示；模型复用游戏资产。

## 需要你实际重绘的范围

1. **首页与HUD**：统一视觉语言、字级和信息密度，整理生存条、目标、深度、速度、奖励、技能预警、领主面板、暂停/死亡/胜利和触屏控件。保留清晰的玩法提示与可访问键盘焦点。
2. **生物模组**：虎鲸、小鱼/金枪鱼/蝠鲼、大白鲨/鮟鱇/大王乌贼/邓氏鱼、海鸥；姿态与轮廓需要更自然，避免球体与三角片拼接感。
3. **四领主**：克拉肯、玛雅风格原创巨兽、三头海德拉、利维坦必须有不同剪影、体态和动态；大王乌贼与克拉肯严格区分。玛雅巨兽是幻想设定，不声称还原历史神话。
4. **环境与特效**：改善水、海床地标、船只材质与层次；增强咬击、血雾、墨云、破水和领主技能的视觉力量，避免遮住敌人预警和路径。
5. **图鉴**：把功能完整的图鉴精修成适合欣赏生物的展示页；重绘后的游戏资产需在图鉴里同步呈现。

## 文件及接口约定

- 外观：`src/style.css`、`src/ocean_guide.css`、`index.html`。
- 模型：`src/creatures.js`、`src/creature_extra.js`；`createCreature(kind,length,seed)` 返回Group，**前方为-Z、Y向上，根节点scale使用length**；`root.userData.animate(time,speed)`必须保留。各kind不能改名。
- 世界：`src/ocean.js`、`src/ocean_extra.js`、`src/ships.js`、`src/surface.js`。
- 效果：`src/combat_effects.js`、`src/encounters.js`、`src/rewards.js`。
- 功能数据：`simulation.js`、`boss_rules.js`、`hunter_rules.js`、`surface_rules.js`。不随意改动数值和状态机；如视觉适配确需修改，说明理由并跑相应回归。
- `main.js`通过固定DOM id绑定交互；改页面结构时保留id或同步完整接线。
- 粒子池、墨云上限/清理、共享几何缓存、图鉴渲染生命周期需要保留，不能靠无限堆粒子提升效果。
- 音频 `OceanAudio`保留start/update/setPaused/toggle/reset/eat/hit/breach/splash/hunter等接口。

## 运行与验收

开发：`npm run dev`（通常5178，先复用实际存在服务）。规则：`npm test`；格式：`npm run check`；回归：`npm run test:browser`；v0.3专项：`node scripts/verify_feedback_v0_3.mjs`；音频：`node scripts/verify_audio.mjs`；构建：`npm run build`。

临时外网预览地址与进程均在被忽略的 `.local/preview_state.json`；它服务dist，修改后必须重建。正式GitHub Pages仍是v0.2，不能把正式地址当作本轮未提交预览。不要停止或重建已有隧道，除非检查确认失效。

交付标准：

- 真实浏览器截图：首页、追尾HUD、图鉴、四领主、捕食血雾、墨云、破水、深海地标，另有390px窄屏。
- 至少演示一次完整水下蓄势→起跳→落水，以及中级猎手预警→技能→恢复。保留自然试玩与开发接口制造场景的区别。
- 格式、规则、浏览器回归、生产构建通过；控制台无错误；不引入无法访问的外链资产，记录新素材来源与许可。
- 交付可打开的未提交预览，说明改动、验证和剩余限制；完成后在原话题@Codex回报，供最后核对。
