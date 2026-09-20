# 阶段 5：最近浏览（开发守则 §9）

日期：2026-09-21
对应规划：`docs/plans/2026-09-21-staged-implementation-plan.md` 阶段 5
分支：`pr/recently-viewed`（base `a8d4b7c`，1 个提交）

## 做了什么

本地记录用户最近打开过的仓库。规划里把它排在阶段 1 之前，因为它没有依赖、体积小，还顺带解决两件事：Discovery 的 Hide Seen，以及以后 Omni Search 的空态内容。

### 数据与上限

`src/utils/recentlyViewed.ts` 是纯函数：按 id 去重（仓库重命名后 id 不变）、条数上限 30、时间上限 90 天，时间戳解析不出来的脏记录在写入时清掉。去重与裁剪都在写入路径上完成，所以列表永远不会超限。

记录存整份 `Repository` 快照而不是只存 id。原因写在类型注释里：Discovery 里的仓库不在本地 stars 列表里，而 `discoveryRepos` 本身不持久化，只存 id 的话重启后无法还原展示内容。条数与时间上限保证了体积可控。

### 商店与迁移

`recentlyViewed`、`recentlyViewedEnabled`、`discoveryHideSeen` 三个字段进唯一的持久化 Store，版本 16 → 17。migrate 按 ADR 的要求做成幂等且完备：字段缺失或类型不对就回落默认值（默认开启记录），已经是新快照时再跑一遍是 no-op。`useAppStore.modularization.test.ts` 的冻结形状同步更新。

### 记录时机

打开 README 就算一次浏览，记录点放在 `ReadmeModal`。`RepositoryCard`（点击与键盘两个入口）和 `SubscriptionRepoCard` 三个入口都经过它，放在这里只有一处。关闭记录后不再写入，已有记录保留到用户主动清空——这是"关闭记录"和"清空历史"两件事的分工。

### 界面

- 仓库页 `SearchBar` 下方新增最近浏览条带：头像 + `full_name` + 相对时间，点击开 README，右侧可清空；没有记录时整块不渲染，不给主列表添噪音。README 模态沿用 `React.lazy` 按需加载，避免把 Markdown 渲染链拉进主包（构建后主包只增加约 3 KiB）。
- Discovery 工具栏新增「隐藏已浏览」开关（带 `aria-pressed`）。过滤基于浏览过的 id 集合；**已 Star 的仓库不因看过而消失**，清空历史后所有仓库自动恢复显示。全部被过滤掉时给出说明文案，而不是留一片空白。
- 设置面板新增「最近浏览」卡片：记录开关、条数说明、清空按钮。文案里写明"仅保存在本地，不上传远端，也不会提供给插件"。

### i18n

9 个新 key，跨 `repositories` / `discovery` / `settings` 三个 namespace，十种语言一次补齐。zh-TW 的用词与简体刻意区分（清空 / 清除、最近浏览 / 最近瀏覽）。

## 验证

- 本机按 PR 模板跑完八项：`check:boundaries`、`check:i18n`、`check:pr-release-files`、`lint`、`typecheck`、`test:run`、`build`、`git diff --check` 全过。
- 全量 vitest 1087 通过，只有 `RepositoryCard.lazyReadme` 在并行满载下超时（单独跑 2/2 通过，既有 flake）。
- 新增用例：utils 6 例（顺序、去重后刷新时间戳、条数上限、时间上限、脏时间戳、id 集合）、store 切片 6 例（含两条 migrate 幂等性断言）、条带组件 3 例（空态不渲染、顺序与清空、点击开模态）。
- 顺带修了三处测试桩：全局 `src/test/setup.ts` 的 store mock 与新字段、`GeneralPanel.desktop.test.tsx` 与 `App.startup.test.tsx` 各自的最小 mock——它们都是因为组件新读了字段而缺字段，不是生产代码的问题。

## 说明

- 插件拿不到这些数据：没有新增任何插件能力，浏览记录也不进插件快照。
- 不新增 Electron 权限：整块是纯前端与本地持久化。
- "用户固定的 Repository"这一条暂时无对应概念（应用里没有 pin/fixed 字段），实现里只覆盖了"已 Star"这一种例外；等以后有固定功能再补。

## 下一步

按规划继续阶段 9（系统入口：剪贴板识别与 Deep Link），两者都不依赖 My Apps。
