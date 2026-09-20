# 阶段 10a：Theme Token（开发守则 §14 第一刀）

日期：2026-09-21
对应规划：`docs/plans/2026-09-21-staged-implementation-plan.md` 阶段 10a
分支：`pr/theme-tokens`（base `a8d4b7c`，1 个提交）

## 做了什么

给用户四项外观控制：**强调色、圆角、字号、动效强度**。全部以 CSS 变量与 `data-*` 落到 `<html>`，组件不依赖任何 DOM selector。

### 为什么这样落

主题预设是通过 `[data-theme='id']` 的样式表生效的（`buildThemePresetCss`），所以这里用**内联**变量覆盖——优先级确定，不受样式表顺序影响。用户把某项恢复默认时删掉内联值，预设的 `--radius` / `--primary` 自然重新生效，不需要知道预设里写了什么。

### 纯函数（`src/utils/themeTokens.ts`）

- `normalizeThemeTokens`：收敛脏值。旧快照、手改的 localStorage 都会在这里回落到默认；字号限制在 0.75–1.5，挡住 0.1 或 4 这种会毁掉布局的值。
- `hexToHslTriplet`：`#rrggbb` → `H S% L%`，因为 index.css 里的颜色 token 都是 HSL 三元组（`hsl(var(--primary))`）。
- `pickPrimaryForeground`：按相对亮度挑前景色，浅色强调色配深字、深色配浅字。
- `themeTokenStyle`：产出"要写什么"（含哪一项要恢复默认），`applyThemeTokens` 只负责写/删根节点的内联属性与 `data-animation`。副作用被限制在一个函数里。

### store

新增 `themeTokens`（持久化 16→17；migrate 里 `normalize` 后写回、缺字段补默认）。action 是**局部更新** `updateThemeTokens(patch)`：内部与当前值合并再 normalize。这不是洁癖——一开始写成整体替换时，连续两次调整（先选强调色再改圆角）会丢掉前一次的结果，因为调用方展开的是渲染期的旧对象。

### CSS

`html[data-animation='reduced']` 下把动画与过渡压缩到接近零（`animation-duration` / `transition-duration` 0.01ms、迭代一次、`scroll-behavior: auto`）。只压缩时长，不动布局与配色，也不碰预设的颜色变量。

### 设置面板

主题卡片里新增：强调色（8 个预设色 + 取色器 + "跟随主题预设"）、圆角（跟随预设 / 无 / 小 / 中 / 大）、字号（90% / 100% / 110% / 125%）、减弱动效开关、恢复默认外观。12 个新 key 十种语言一次补齐。

## 验证

- 八项本地门禁全过；全量 vitest 1086 通过，唯一失败是 `RepositoryCard.lazyReadme` 的既有超时 flake（单独跑 2/2 通过）；`build` 通过且 bundle 预算内（主包 1044.81 KiB，未因新 UI 增长）。
- 新增 20 例：纯函数 12 例（脏值收敛、字号夹取、HSL 转换含已知值、前景色明暗、默认态要求删除全部变量、应用与还原）、设置卡片 8 例（原有 6 例 + token 写入与恢复默认各 1 例）。
- 校验口径是"根节点上真的写了/删了哪些属性"，不只是断言 mock 被调用。

## 说明

**这次没有做 UI Density、Card spacing 和"仓库卡片可见字段"**。这三个要改的是大量组件内部的间距与字段渲染，跟这四个能干净落到根节点变量的 token 不是一回事；硬塞进同一个 PR 会让评审很难看清边界。建议作为 10a 的后续增量单独提。

动效强度只做了 `reduced` / `normal`：守则里的 `enhanced` 目前没有可增强的对象（应用没有统一的动画系统），先不做没有意义的选项。
