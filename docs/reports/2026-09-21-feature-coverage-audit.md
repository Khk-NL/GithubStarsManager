# 功能覆盖审计：开发守则 20 节 / 23 项建议 PR 对照现状

审计时间：2026-09-21
审计对象：`main`（fork 侧 `18a04ac`，含上游 `a8d4b7c` 的全部提交）
审计方法：按开发守则逐节取值，在 `src/`、`electron/`、`server/`、`scripts/` 中检索实际实现并核对调用链，不以文件名为准，以能否在 UI/服务/IPC 中被真实调用为准。

结论先说：守则里 23 项建议 PR，**5 项已实现，4 项部分实现，14 项未实现**。用户"很多预想功能其实已经实现"的直觉是对的，但集中在搜索、健康事实、i18n、主题预设这四块；守则后半段的 My Apps、Omni Search、Trending 历史、布局个性化、插件商城整块都还是空的。

---

## 一、逐项对照

状态口径：
- **已实现**：功能可被用户实际使用，且覆盖面基本符合守则描述。
- **部分实现**：核心能力已有，但守则要求的某些面缺失，或已有实现正好是守则里"低置信的那一半"。
- **未实现**：无对应实现。

| # | 守则条目 | 状态 | 证据与差距 |
|---|---|---|---|
| 1 | Repository Health Core | **已实现**（已合并上游 #382） | `src/types/health.ts`、`src/utils/repositoryHealth.ts`、`src/components/RepositoryHealthPanel.tsx`、`electron/repoHealth.js`、`server/src/mcp/repoHealth.ts`。Activity / Maintenance / Community / Maturity 分组、保守状态信号（`archived` / `no-releases` / `no-recent-activity`）都有；按要求不产出 0–100 总分，`isArchivedRepository()` 保持三态语义，避免把"提交少"误判成不健康。 |
| 2 | Installable Asset Detection | **已实现**（在 `pr/installable-asset-detection`，未合并） | `src/utils/installableAssets.ts`、`src/utils/deviceTarget.ts`、`src/utils/formatBytes.ts`、`src/components/InstallableAssetRecommendation.tsx`。四平台扩展名规则（含 AAB 只识别不安装）、x64/arm64/x86/universal、排除清单（source / checksum / signature / symbols / debug / blockmap）、confidence + reason、不确定时列多候选、架构未定时不放开下载。 |
| 3 | My Apps 已安装软件管理 | **未实现** | 全仓无 `LinkedApplication` / `linkedApplication` 命中。这是后半段几乎所有功能的前置依赖。 |
| 4 | 更新检测 | **未实现** | 依赖 §3，无 installed version 可比较。 |
| 5 | Release 历史版本与旧版下载 | **部分实现** | `src/components/ReleaseTimeline.tsx` 已能浏览历史 Release、显示发布日期与 prerelease、维护未读快照。缺：标记当前 installed version、按当前平台可用性过滤旧版 asset、`Download this version` 语义与"配置/用户数据可能不兼容"提示——这些都挂在 §3 上。 |
| 6 | Batch Repository Intake | **部分实现**（在 `pr/batch-repository-url-extraction`，未合并） | `src/utils/repositoryImport.ts` 已覆盖守则的 Paste → Extract → Normalize → Deduplicate 整段：文本 / Markdown / JSON 递归扫字符串、GitHub URL 与 `owner/repo` 归一、Release / Issue / PR / Tree / Blob URL 归到所属仓库、大小与深度上限、错误码区分。缺：Import Preview（元数据富化后的展示与勾选）、批量动作（Star / 分类 / Tag / Subscribe / 导出 / 发插件 / 进 My Apps）、失败原因细分（not found / private / renamed / rate limited）、转移时的 old → new 提示。 |
| 7 | Trending Sync 与榜单历史 | **未实现** | 无 `TrendingSnapshot`；`useDiscoveryActions.ts` 直接调 `api.getTrendingRepositories(...)` 即时取数，不留历史。rank change、连续上榜、首次出现时间、当前周期新增 Stars 全部没有。 |
| 8 | Platform-aware Discovery | **部分实现**，且现有实现恰好是守则里"仅推测"的那一半 | 已有 `DiscoveryPlatform = 'All' \| 'Android' \| 'Macos' \| 'Windows' \| 'Linux'`（`src/types/index.ts:686`）与平台下拉筛选（`DiscoveryView.tsx`）。但筛选方式是 `buildPlatformQuery()`（`src/services/githubApi.ts:1544`）把平台拼成搜索关键词——`windows`、`macos OR mac OR osx`、`linux`、`android`——即完全基于全文/topics 推测。缺：确认存在当前平台兼容 Release Asset 的信号、优先排序、以及"已确认"与"仅推测"的 UI 区分。正好可以复用 §2 的产物。 |
| 9 | Recently Viewed | **未实现** | 无 `recentlyViewed` 命中；Discovery 也没有 `Hide Seen Repositories`。 |
| 10 | Omni Search | **未实现** | 无 `OmniSearchResult`、无 Ctrl+K 聚合面板。注意：这不代表"搜索不行"，只是没有统一入口（见第二节）。 |
| 11 | Clipboard GitHub URL Detection | **未实现** | 无剪贴板读取逻辑。插件确有 `clipboard:write` 权限，但那是给插件写剪贴板的，与本功能无关。 |
| 12 | Deep Link | **未实现** | 全仓无 `githubstarsmanager://` 协议处理。 |
| 13 | i18n 多语言重构 | **主体已实现**（上游 `fe4992e`），**Language Pack 未实现** | 已实现：`src/i18n/**`、10 语言 × 嵌套 JSON、`useT` / `TranslateFn`、`src/i18n/format.ts`（数字 / 日期 / date-fns locale），以及 CI 门禁 `scripts/check-i18n.cjs`——10 个语言 key 集合必须完全一致、非 en 不得照抄英文、zh-TW 不得照抄简体、禁用 `useTPair`、JSX 硬编码中文会被拦。未实现：下载式 Language Pack（manifest、SHA-256 校验、卸载、缺失 key fallback）。当前 10 种语言全部打进包体，恰好是守则想避免的形态。 |
| 14 | GUI 个性化 Theme Token | **部分实现** | 已有：Light / Dark 模式、12 套主题预设（`themePreset` 在 20 个文件出现）、CSS 语义 token（`--radius`、`--ui-radius-xs/sm/md/lg`，Tailwind 侧由 token 驱动圆角，见 `src/index.css` + `tailwind.config.js` 注释）。缺：Accent Color 自定义、Font Scale、UI Density、Animation strength、Card spacing、Repository card 可见字段、Sidebar 宽度与折叠、List / Grid 默认模式、Home widgets order、Default home page。 |
| 15 | Dashboard / Layout Personalization | **未实现** | 无 `homeWidget` / `homeLayout`；首页区块顺序不可配置。 |
| 16 | Community Theme Packs | **未实现** | 无 `themePack` 命中。 |
| 17 | Plugin Store / Community Registry | **未实现** | 本地插件系统本身很完备（`pluginRegistry`、manifest 校验、权限、sandboxed Plugin Pages、capabilityRouter），但安装入口只有"从本地目录装载"（PluginSettingsPanel 的 FolderPlus），没有 `community-plugins.json` 静态索引、没有提交/CI/审核流程、没有按固定版本安装。**注意**：`pluginRegistry` 是客户端"已安装插件注册表"，不是社区索引，按名字检索容易误判为已实现。 |
| 18 | Plugin Store 签名 / 撤销 / 更新 | **未实现** | 依赖 §17。可复用件已经存在：`electron/plugins/releaseDownload.js` 已有下载与校验链路。 |
| 19 | 后续本机软件检测 | **未实现**（且守则本身要求 MVP 稳定后再做） | 无 uninstall registry / winget / scoop / Applications / dpkg 等只读探测。 |
| 20 | 软件权限管理边界 | **未实现** | 依赖 §3；守则这一节主要是"不要做什么"的边界约束，`Open system settings` 入口也还没有。 |

### 推荐顺序里额外两项

| 建议 PR | 状态 | 说明 |
|---|---|---|
| `expand repository search history to global history` | **部分实现** | `SearchBar.tsx:206` 有 `searchHistory` state，取最近 10 条（`:252`、`:401-403`），但只存在于搜索栏组件内，不是全局 store，换页面即丢，也未能被复用。 |
| `add indexed content search` | **已实现**（形态与守则预期一致） | 两类来源：`grepAppService` + `CodeSearchView`（走 grep.app 外部索引搜仓库代码内容），以及 `vectorSearchService` / `VectorSearchSettings`（AI 向量语义检索）。守则明说"第一版不要建立大型全文索引，先复用已有搜索源"，现有实现正好是复用外部索引 + 语义检索，无需自建。 |

---

## 二、关于"模糊搜索"：现有搜索能力分层

守则 §10 的 Omni Search 未实现，但搜索本身在应用里已经有五层，这也是"感觉功能都在"的主要原因：

1. **多字段子串 + 分词 AND**：`src/utils/repoSearch.ts:17` 的 `performBasicTextSearch()`，把 name / full_name / description / custom_description / language / topics / ai_summary / ai_tags / ai_platforms / custom_tags / custom_category / license 拼成一个可搜索字符串，查询按空格分词后要求每个词都命中（`queryWords.every(...)`）。跨这么多字段，用起来确实像模糊搜索。
2. **输入即时过滤**：`SearchBar` 边打字边筛，并保留最近 10 条搜索词。
3. **AI 增强检索**：`src/services/aiService.ts:2422` 的 `performEnhancedBasicSearch()`，在 AI 请求失败时降级回基础检索；AI 可用时走术语扩展。
4. **向量语义检索**：`vectorSearchService` + 设置面板可配 embedding 供应商与维度。
5. **代码内容检索**：`CodeSearchView` + grep.app，Discovery 侧也有 `search` / `code-search` 通道。

需要说清楚的一点：`performBasicTextSearch` 做的是**子串匹配**，没有拼写容错（无 Levenshtein / 编辑距离 / 前缀模糊）。所以"模糊"是多重字段覆盖 + 即时过滤带来的体感，不是算法级模糊匹配；真正的语义近似由第 4 层承担。要补的也不是模糊算法，而是 §10 的统一聚合入口（Ctrl+K，把 Repository / Release / Gist / Developer / My Apps / Plugin / Action 分组展示，关键词优先、语义延迟且可降级）。

---

## 三、还剩什么

按依赖关系看，真正卡住整条链的是 **§3 My Apps**：§4 更新检测、§5 旧版下载的 installed version 标记、§6 的 Import Preview 里"already in My Apps"、§20 的元数据展示，全都挂在它上面。在它之前，能独立交付且已经写好的是 §2 与 §6 的两块。

守则第 1105 行还给了明确指引：发现需求已在 main 中实现时，应标记为已存在、评估是否只需增强、优先提交小型增量改动。据此，已实现的四项（§1、§13 主体、§14 的预设部分、indexed content search）不应重做，只需按上表"缺"的列做增量。

未实现部分按守则推荐顺序排列，前五项就是接下来的实际待办：

1. §3 My Apps（守则建议 PR 11 `feat: add manual repository-app linking`）
2. §4 更新检测（PR 12）
3. §5 Release Version Picker（PR 14）
4. §7 Trending Snapshots + 历史与筛选（PR 6、7）
5. §9 Recently Viewed（PR 8）
6. §10 Omni Search（PR 9）+ 搜索历史提升为全局（PR 10）
7. §8 平台感知 Discovery（PR 13，可复用 §2 的 compatible-asset 判定）
8. §11 剪贴板识别（PR 21）、§12 Deep Link（PR 20）
9. §14 剩余 token（PR 16）、§15 首页布局（PR 17）
10. §13 Language Pack（PR 15）、§16 Theme Packs（PR 18）
11. §17 / §18 插件注册表与签名（PR 22、23）
12. §19 本机软件检测（最后做）

---

## 四、审计中确认"不要重做"的清单

- i18n 基础设施及 CI 门禁：已超出守则 §13 的要求（10 语言强对齐、禁照抄、JSX 硬编码检查）。
- Repository Health 的 facts 与保守信号：已合并上游，含维护者补的折叠面板与 MCP evidence 截断。
- 搜索的四个数据源：全部可被 §10 直接复用，Omni Search 不需要新建索引。
- 插件运行时、权限、沙箱页面：守则开头就声明不重写，现状确实完备。
- 下载与哈希校验链路（`releaseDownload.js`）：§18 可直接复用，无需新造。
