# 阶段 9b：剪贴板 GitHub 链接识别（开发守则 §11）

日期：2026-09-21
对应规划：`docs/plans/2026-09-21-staged-implementation-plan.md` 阶段 9b
分支：`pr/clipboard-github-links`（base `a8d4b7c`，1 个提交）

## 做了什么

可选的剪贴板识别，默认关闭。开启后只在一个时机读剪贴板：窗口重新获得焦点（也就是用户主动切回应用）。没有定时器、没有后台轮询、不保存剪贴板原文。

### 解析（`src/utils/githubClipboard.ts`）

识别三类 github.com 链接：仓库、Release tag、开发者主页。仓库内部的其它路径（`issues`、`tree/...`、`blob/...`、`pull/...`）统一归到所属仓库，和批量导入的口径一致。

放弃的情况写得很明确：非 GitHub 主机（含 `github.com.evil.example`、`gist.github.com`）、不是 URL 的纯文本、`github.com` 上被保留的一级路径（`settings`/`marketplace`/`topics`/`notifications`/`explore`…，这些不可能是用户名）、以及路径段里出现非 ASCII 或非法字符。剪贴板里往往是一整段话，只取第一个 URL，其余读完即丢。

### 状态与迁移

新增 `clipboardDetectionEnabled` 偏好，默认 false。持久化版本 16 → 17，migrate 对旧快照一律回落 false（安全优先，不因为升级就悄悄打开一个会读剪贴板的开关）。`useAppStore.modularization.test.ts` 的冻结形状同步更新。

### 读取通道（`src/hooks/useClipboardGitHubDetection.ts`）

只有一条：`window` 的 `focus` 事件。被忽略过的同一个链接不再重复打扰；读不到剪贴板（浏览器或 Electron 没有授权、`readText` 不存在）时静默放弃——它只是个便捷入口，不该弹错误。关闭开关会立刻清掉待处理提示。

### 界面

- `ClipboardLinkBanner`：提示条展示识别到的 `owner/repo`、`@login` 或 `owner/repo@tag`，两个动作是"打开"和"忽略"。命中本地已收藏的仓库就直接开 README（复用按需加载的模态）；否则在浏览器打开对应 GitHub 页面。**Release 与开发者链接一律交给浏览器**——点"打开 Release"却只打开仓库首页是不诚实的。
- 设置面板新增「剪贴板识别」卡片，说明文案写明：只在切回窗口时读一次、非 GitHub 内容立即丢弃、不保存、不后台监控。

### i18n

5 个新 key（`app` 的 `clipboardLinkBanner` 段 3 个 + `settings` 的 `generalPanel` 2 个），十种语言一次补齐。

## 验证

- 八项本地门禁全过；全量 vitest 1091 通过，唯一失败是 `RepositoryCard.lazyReadme` 的既有超时 flake（单独跑 2/2 通过）；`build` 通过且 bundle 预算内。
- 新增用例 19 例：解析器 8 例（三类目标、仓库子路径归一、保留路径拒绝、非 GitHub 拒绝、从长文本里取第一个 URL、非法路径段）、hook 6 例（关闭时不读、开启时 focus 读一次、非 GitHub 丢弃、忽略后不再打扰、读取失败静默、关闭开关清提示）、提示条 5 例（无目标不渲染、忽略、命中本地开 README、未收藏回落浏览器、Release 走浏览器）。
- 顺带把全局测试桩（`src/test/setup.ts`）补上 `repositories` 与新开关字段。

## 说明

- 不新增 Electron 权限：读剪贴板走标准 `navigator.clipboard`，浏览器与桌面同一套代码。
- 不做后台监控是刻意的：守则要求"不后台持续监控"，实现里连定时器都没有。
- 目前只在应用内提示，不写剪贴板历史；如果以后想让提示条支持"直接 Star"之类动作，可以在这个基础上加。

## 下一步

按规划继续阶段 9a（Deep Link）。
