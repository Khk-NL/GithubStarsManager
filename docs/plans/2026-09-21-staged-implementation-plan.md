# 功能实现阶段规划（2026-09-21 重排）

依据 `docs/reports/2026-09-21-feature-coverage-audit.md`（开发守则 20 节对照现状的审计）重排实现顺序。

- 上游基线：`AmintaCCCP/GithubStarsManager` main = `a8d4b7c`
- 分支策略：每个阶段从上游 main 切一个 PR 分支，分支内**不带**版本文件与 `docs/`；阶段完成后在 fork main 写开发日志、bump 版本、提交
- 提交方式：推送分支 + 生成 `PR-*.md`，不自动创建 PR

---

## 一、现状

### 已完成，不重做

| 能力 | 出处 |
|---|---|
| Repository Health Facts（分组展示、保守信号、无总分） | 上游 #382，我们提的 |
| i18n 系统（10 语言、`useT`、格式化、CI 门禁） | 上游 `fe4992e` + `d224050` |
| 主题预设（12 套）与 CSS 语义 token | 上游既有 |
| 索引式内容检索（grep.app 代码搜索 + 向量语义检索） | 上游既有 |
| 搜索分层（多字段子串、输入即时过滤、AI 增强、向量、代码搜索） | 上游既有 |
| 插件运行时、权限、沙箱页面、CSP、Smart Release、Web Search | 上游既有 |

守则里这五项都属于"已存在，只做增量"。

### 在途：三笔欠账

| 分支 | 基线 | 欠什么 |
|---|---|---|
| `pr/installable-asset-detection` | `217c134`（落后 16 个提交） | 需 rebase 到 `a8d4b7c`；14 个 i18n key 只补了 zh/en，按现行门禁要补齐另外 8 种语言 |
| `pr/batch-repository-url-extraction` | `217c134` | 纯逻辑无 i18n，rebase 校验即可 |
| `pr/stream-release-downloads` | `a8d4b7c` | 已推送，等评审 |

`pr/repository-health-facts` 已随 #382 合并进上游（维护者还在该分支上追加了 2 个提交），本地分支可以退场。

fork main 目前落后上游 main 16 个提交，且带着自己的 0.9.0 发布提交——需要一次合并把上游的 health 修正、SearchBar、locales 拿进来，同时保留 fork 的版本行。

### 未做

守则推荐顺序里的 19 项（详见第四节映射表），全部落在下面的阶段里。

---

## 二、归类结论

判定规则（优先级从高到低）：涉及凭据或特权资源 → 只能 Core；是其他功能或插件的地基 → Core；需要本地持久化与跨功能一致性 → Core；是安全边界 → Core；主观、可替换、领域特定 → Plugin；缺了应用会显得残废 → Core；需要新增敏感插件能力 → 一般归 Core 或先不做。

| 归属 | 内容 |
|---|---|
| **Core** | Recently Viewed、Omni Search、My Apps、更新检测、Release 版本选择器、批量导入预览、Trending 快照、平台感知 Discovery 的兼容性事实、Deep Link、剪贴板识别、主题 token、首页布局、数据包加载器、插件注册表与校验逻辑 |
| **Plugin** | 健康分与权重、"值得装吗"、替代品推荐、AI 分类、生态特定的资产匹配、自定义导出与报告 |
| **数据包**（不是插件） | Language Pack（纯文本）、Theme Pack（纯外观），由 Core 加载器消费，只含数据 |
| **待定** | 本机软件检测（归 Core，但按平台拆且排在 My Apps 稳定之后） |

Plugin 那一栏不进关键路径：它们要么依赖 Core 先给出事实，要么纯主观，适合等生态起来后由社区插件承担，不必占队列。

---

## 三、阶段划分

### 阶段 0：还欠账（不写新功能）

- **0a** 资产识别分支 rebase 到 `a8d4b7c`，补齐 8 种语言的 14 个 key，跑门禁后推送 + 出 md。
- **0b** 批量提取分支 rebase 校验后推送 + 出 md。
- **0c** 清理 `pr/repository-health-facts` 本地分支（已合并）。
- **0d** fork main 合入上游 16 个提交：health 相关取上游，`package.json` 版本行取 fork，locales 取上游。
- **判定完成**：三个分支在 fork 上都能对着当前上游 main 干净地开 PR；fork main 与上游无冲突差异。

先把欠账还掉的理由很直接：后面每个阶段都要从上游 main 切分支，基线越干净，后面 rebase 越省事。

### 阶段 1：My Apps 基础（§3）—— 关键路径起点

四件后续工作都挂在它上面（更新检测、版本选择器的 installed version 标记、导入预览的"已在 My Apps"、首页 Updates widget），所以即使它最大也要先动。

**交付**：`LinkedApplication` 模型与本地持久化（含 migration）；手动关联仓库；手填/修正 installed version；展示最新稳定 Release 与 changelog；Update Available / Up to Date / Unknown 三态（纯本地比较）；prerelease 开关；用户确认后下载推荐资产；解除关联不影响软件本身；保存来源、版本、安装路径、下载时间、SHA-256、检测来源。

**不含**：自动执行安装器、静默安装/更新、通用卸载、通用降级、任意系统权限授予。

**依赖**：§1（已合并）、§2（阶段 0a）。

**拆分**：一个 PR 会偏大，建议两刀——
- **1a** 模型 + 存储 + migration + 手动关联 + 列表与详情 UI
- **1b** 下载推荐资产（复用阶段 0c 的流式落盘，落盘同时算 SHA-256）+ 解除关联 + 元数据面板（§20 的展示面、`Open system settings` 入口）

**判定完成**：Web 版与 Electron 版都不破坏既有 stars/分类/订阅逻辑；不新增 Electron 权限；migration 可回滚；不解关联不删用户文件。

### 阶段 2：更新检测（§4）

**交付**：手动检查 + 可关闭的后台检查 + 频率配置；默认不下载、不安装；版本解析不出来显示 Unknown；GitHub API 失败不误判为停止维护；最新版没有当前平台兼容资产时只提示有新版本，不推荐错误下载；更新通知与 changelog。

**依赖**：阶段 1b。

**必须独立成 PR**：引入后台任务与隐私面，评审关注点和其他阶段不同。

### 阶段 3：Release 版本选择器（§5）

**交付**：历史版本浏览（现有 `ReleaseTimeline` 已具备）、按当前平台过滤旧版资产（§2）、标记当前 installed version（阶段 1）、下载旧版时提示配置与用户数据可能不兼容、按钮文案统一为 `Download this version`。

**依赖**：0a、阶段 1b。

**判定完成**：不出现 `Downgrade` 这类暗示已执行安装的措辞；版本记录不因下载旧版而自动改写。

### 阶段 4：批量导入预览与批量动作（§6 收尾）

提取与归一已经做完（0b），这一步补的是工作台。

**交付**：预览表展示 name、full_name、description、stars、forks、language、topics、Health（§1）、latest release、installable asset（§2）、already starred、already in My Apps（阶段 1）、duplicate 状态；失败项分类（Invalid URL / not found / private / renamed / rate limited / duplicate / already exists）；仓库转移时显示 `old-owner/repo → new-owner/repo` 且不静默改写；批量 Star、分类、Tag、Subscribe Release、导出、发送到插件动作、进入 My Apps 关联流程。

**依赖**：0a、0b、阶段 1。

### 阶段 5：Recently Viewed（§9）—— 可与阶段 1 并行

无依赖，体积小，还顺带解决两件事：Discovery 的 Hide Seen、Omni Search 的空查询内容。

**交付**：本地记录最近访问、清空、关闭记录、数量与时间上限、不上传远端、不默认暴露给插件；Discovery 支持 Hide Seen，清空浏览历史后同步解除隐藏；已 Star、已关联 My Apps 或用户固定的仓库不被永久隐藏。

### 阶段 6：Omni Search（§10）

**交付**：全局 Ctrl+K；统一搜索 Repositories / Releases / Gists / Developers / My Apps / Plugins / Settings / Common Actions；排序按精确匹配 → 前缀 → 名称与元数据关键词 → 可选语义（延迟执行、允许降级）；关键词结果必须立即出现，不等语义；空查询显示最近访问（阶段 5）与常用操作；顺便把 SearchBar 里那 10 条组件内历史提升为全局历史（守则推荐项 10）。

**明确不做**：第一版不建大型全文索引，全部复用现有搜索源。

### 阶段 7：Trending 快照与历史（§7）

- **7a 快照**：`TrendingSnapshot` 存储与采集（daily/weekly/monthly × language）、当前 rank、上次 rank、rank 变化、首次出现时间、连续上榜、当前周期新增 stars、历史明细。Trending 不维护独立详情模型，统一走 Repository → Metadata → Health → Release → Installable Asset → Star/Local State → My Apps。
- **7b 筛选与批处理**：当前平台有兼容资产、Installable only、Not starred、Not seen（阶段 5）、Active only（§1 信号）、language、仓库类型；批量选中送入阶段 4 的导入工作台。

**依赖**：7a 无强依赖；7b 依赖 0a、阶段 4、阶段 5。

### 阶段 8：平台感知 Discovery（§8）

现有实现要认清：`buildPlatformQuery` 把平台拼成搜索关键词（`windows`、`macos OR mac OR osx`），这正是守则里"仅根据 topics / description 推测"的那一半，不要当新功能重做。

**交付**：Core 给出"已确认存在当前平台兼容 Release Asset"的事实（复用 §2，配合 release 数据缓存）；UI 明确区分"已确认"与"仅推测"；当前平台与架构作为推荐信号，不是不可取消的硬过滤；插件可以在此基础上排序。

**依赖**：0a。

### 阶段 9：系统入口（§11 + §12）

两个入口共享"把目标解析成导航动作"这一段，但风险面不同，建议两个 PR。

- **9a Deep Link**：`githubstarsmanager://repo|release|developer|plugins/...`，所有参数重新校验；不允许直接安装插件、下载文件或执行高风险操作；有副作用的行为需用户确认；Electron 侧协议注册与单实例转发，Web 侧由 URL 路由承接。
- **9b 剪贴板识别**：默认关闭或首次启用时说明；只在前台或用户主动触发时读取；本地解析；非 GitHub 内容立即丢弃；不保存完整剪贴板；不后台持续监控；可关闭。

### 阶段 10：个性化（§14 剩余 + §15）

- **10a Theme Token**：Accent Color、Font Scale、UI Density、Border Radius、Animation strength、Card spacing、Repository card 可见字段、Sidebar 宽度与折叠、List/Grid 默认模式。全部落在 CSS 变量与声明式偏好上，不引入依赖 DOM selector 的写法。
- **10b 首页布局**：声明式 widget 的 show/hide、reorder、limited size、default page、多套预设。只保存声明式布局数据，不允许布局配置注入 HTML / JavaScript / React Component；插件 widget 只做声明式注册。Updates 与 My Apps widget 依赖阶段 2/1，可先接现有 widget，其余后续补注册。

### 阶段 11：数据包加载器（§13 Language Pack + §16 Theme Pack）

一个加载器管两种包，机制相同：manifest v1、SHA-256 校验、版本兼容、可卸载、下载失败不影响当前语言/主题、缺失 key 自动回退（requested locale → en-US → internal fallback）。

- Language Pack：纯文本，不执行 JS、不访问 Node/网络/仓库/插件权限
- Theme Pack：只允许 CSS variables、theme tokens 与静态图片，禁止 JS、IPC、仓库访问、Token、网络、插件能力
- 原则：Theme 改变外观，Plugin 改变行为

**前置阻塞（必须先与维护者对齐）**：现行 `check-i18n.cjs` 要求 10 种语言 key 完全对齐，而 Language Pack 的目的恰恰是把非内置语言移出包体——两者方向相反。当前 10 种语言已经全部打进包体，包体大小就是守则想避免的问题。需要先定：内置保留哪几套、其余是否转成下载包、门禁如何改。在这个决定出来之前，阶段 11 无法开工。

### 阶段 12：插件生态（§17 + §18）

- **12a 静态注册表**：`community-plugins.json`、`removed-plugins.json`、`schemas/manifest.schema.json`；插件仓库 → 提 PR → CI 扫描 → 人工审核 → 合并 → 客户端按固定版本安装。CI 扫描项按守则清单：manifest、API 版本、ID、文件数与包体积、zip slip、symlink、依赖漏洞、密钥、eval、动态代码、shell、进程执行、install scripts、未声明网络、遥测、自更新逻辑、混淆、远程资源、CSP、message bridge。
- **12b 客户端校验与更新**：按固定版本安装并校验 SHA-256（复用现有下载器）、撤销列表、建议安全版本、更新提醒、changelog、权限 diff、回滚元数据。第一阶段只提醒，用户手动确认，不做全自动插件更新。

**依赖**：插件系统（已具备）。

### 阶段 13：本机软件检测（§19）

阶段 1 稳定之后再做，**每个平台单独一个 PR**（实现与风险面完全不同）：Windows（uninstall registry / winget / scoop）、macOS（Applications / package metadata）、Linux（dpkg / rpm / AppImage records）、Android（PackageManager 公开信息）。

检测结果只能是候选，必须由用户确认仓库匹配；禁止仅凭软件名相似自动关联。

---

## 四、守则推荐项到阶段的映射

| 守则推荐顺序 | 内容 | 落到 |
|---|---|---|
| 1 | repository health facts | 已完成（#382） |
| 2 | installable release assets | 阶段 0a |
| 3 | i18n 重构 | 已完成 |
| 4 | batch repository URL extraction | 阶段 0b |
| 5 | batch import preview | 阶段 4 |
| 6 | trending snapshots | 阶段 7a |
| 7 | trending history and filters | 阶段 7b |
| 8 | recently viewed | 阶段 5 |
| 9 | global omni search | 阶段 6 |
| 10 | search history → global | 阶段 6 |
| 11 | manual repository-app linking | 阶段 1a |
| 12 | detect updates for linked apps | 阶段 2 |
| 13 | platform-aware software discovery | 阶段 8 |
| 14 | release version picker | 阶段 3 |
| 15 | downloadable language packs | 阶段 11 |
| 16 | theme token customization | 阶段 10a |
| 17 | configurable home layout | 阶段 10b |
| 18 | safe community theme packs | 阶段 11 |
| 19 | indexed content search | 已完成 |
| 20 | repository deep links | 阶段 9a |
| 21 | clipboard GitHub URLs | 阶段 9b |
| 22 | community plugin registry | 阶段 12a |
| 23 | signed community plugin index | 阶段 12b |

---

## 五、顺序与并行

关键路径：**0 → 1（My Apps）→ 2（更新检测）→ 3（版本选择器）/ 4（导入预览）→ 7 / 8 → 10**。

可以穿插的：**阶段 5（Recently Viewed）与阶段 6（Omni Search）没有强依赖**，适合在阶段 1 开发或等评审时做，也适合在阶段 0 的等待期先推一个出去。

应该往后放的：**11（数据包）在前置决策落地前动不了**；**12（插件生态）需要另建注册表仓库与审核流程**，且它治的是生态问题而不是用户可见功能；**13（本机检测）必须等 My Apps 稳定**。

前端可见收益最快的是 5、6、10a；对后续解锁最多的是 1。

---

## 六、必须单独成 PR 或先对齐的事

**单独成 PR（不与其他功能合并）**
- 本机软件检测：按平台各一个
- 任何新增插件能力或权限
- CI / 重构类改动
- 更新检测（后台任务与隐私）

**需要先与维护者对齐**
1. 新 i18n key 放哪个 namespace（`repositories` 还是 `app`），以及是否每次都补齐 10 种语言（现行门禁要求补齐）
2. Language Pack 与内置语言的取舍（阶段 11 的前置）
3. fork 是否继续自行 bump 版本（现状：PR 分支不带版本文件，fork main 自己发版）
4. Web 侧下载：要不要给 `Repository` 加 `private` 字段，好让公开资产在浏览器里直开而不经过 blob（`pr/stream-release-downloads` 的遗留）
5. 新事实模型（My Apps、Trending 快照、Recently Viewed）要不要同步进 MCP 与 AI 的暴露面——`server/tests/mcp/parity.test.ts` 会约束镜像实现，需要先决定暴露范围

---

## 七、每个阶段的固定动作

守则原话就是验收标准，逐条对着做：

- 先读现有实现，复用已有 Service / Hook / Store / IPC，避免重复数据模型
- 补测试；跑 typecheck、lint、相关 unit/integration 测试
- 确认 Web 版与 Electron 版不互相破坏
- 保持 Plugin API v1 兼容；不扩大 Electron 权限边界
- 不新增不必要的持久化 Store migration
- PR 模板要求的本地检查全绿：`check:boundaries`、`check:i18n`、`check:pr-release-files`、`lint`、`typecheck`、`test:run`、`build`、`git diff --check`
- 阶段完成后写 `docs/logs/<日期>-stage-N-<slug>.md`，按代码量 bump 版本并提交
