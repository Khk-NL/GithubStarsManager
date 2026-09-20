# 阶段 9a：Deep Link（开发守则 §12）

日期：2026-09-21
对应规划：`docs/plans/2026-09-21-staged-implementation-plan.md` 阶段 9a
分支：`pr/deep-links`（base `a8d4b7c`，1 个提交）

## 做了什么

支持四类链接：

```
githubstarsmanager://repo/owner/name
githubstarsmanager://release/owner/name/tag
githubstarsmanager://developer/login
githubstarsmanager://plugins/plugin-id
```

### 主进程

`electron/deepLink.js` 是纯逻辑：从 argv 里找出深链、校验确实是本应用协议（大小写不敏感，只有协议头没有目标的不算）。**主进程不解释参数含义**，也不根据链接执行任何动作。

`main.js` 负责接线：注册 `githubstarsmanager` 协议；macOS 的 `open-url` 与 Windows/Linux 第二次启动的 `second-instance` 都把链接转给渲染进程；窗口还没建好（冷启动）时先存在主进程，等渲染进程用 `deeplink:consumePending` 取一次。单实例锁是本来就有的，这里只是把 argv 里的链接一起处理——原来第二次启动只恢复窗口，现在有链接就先送链接。

### 渲染进程

`src/utils/deepLink.ts` 解析并重新校验每个参数，不信任来源：

- 先 `decodeURIComponent` 再校验，所以 `%20`、`%2e%2e` 这类编码绕过不了字符规则；
- 仓库名/用户名只允许 GitHub 实际会用到的字符，且不能以 `.` 开头或结尾；
- 开发者主页里 github.com 的保留一级路径（`settings`、`marketplace`、`topics`…）一律拒绝——它们不可能是用户名；
- Release tag 允许含斜杠（`release/1.0`），但不允许空白与反斜杠；
- 插件 id 只允许反向域名风格，长度至少 3。

`src/components/DeepLinkHandler.tsx` 只做导航：

| 目标 | 行为 |
|---|---|
| 仓库，且已在收藏里 | 开 README（复用按需加载的模态） |
| 仓库，未收藏 | 交给浏览器打开 github.com 页面 |
| Release，仓库已收藏 | 开该仓库的 Release 面板（同样按需加载） |
| Release，仓库未收藏 | 交给浏览器 |
| 开发者 | 交给浏览器 |
| 插件 | 只切到设置页 |

**不执行任何有副作用的动作**：不安装插件、不下载文件、不自动 Star、不改动插件状态，所以守则要求的"有副作用的行为需要用户确认"在这一版里不适用——没有这种动作可确认。

## 验证

- 八项本地门禁全过；全量 vitest 1084 通过，唯一失败是 `RepositoryCard.lazyReadme` 的既有超时 flake（单独跑 2/2 通过）；`build` 通过且 bundle 预算内。
- 新增用例 15 例：主进程纯逻辑 3 例（协议校验、非字符串/相对路径拒绝、从 argv 取出）、渲染侧解析器 6 例（四类目标、三斜杠与大小写、tag 含斜杠、参数数量/类型错误、非本协议、编码绕过与保留路径）、处理器 6 例（无桌面桥时不做事、冷启动待处理链接、事件链接、未收藏走浏览器、开发者走浏览器且插件切设置、畸形链接全部忽略）。
- `electron/deepLink.test.js` 已挂进 `test:electron:mcp`。

## 说明

- 插件深链目前只切到设置页，不能精确落到"插件"这个 tab：`SettingsPanel` 的 `activeTab` 还是组件内 state，没有进 store。要精确落位需要把它提上去，属后续增量——但**无论如何都不会自动安装插件**。
- macOS 之外的平台需要用户在系统里确认一次协议关联（`app.setAsDefaultProtocolClient` 只负责注册）。
- Web 形态暂时不承接深链：`githubstarsmanager://` 需要浏览器侧的协议处理，规则与 Electron 不同，留待需要时再定（构造上不会破坏现有行为，处理器在没有桌面桥时什么都不做）。

## 下一步

按规划继续阶段 10a（Theme Token）。
