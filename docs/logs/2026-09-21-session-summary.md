# 交接文档：GithubStarsManager fork 自主开发（2026-09-21 → 09-22）

给下一个会话/接手的人看的**唯一入口文档**。读完这一页 + `docs/development-guide.md`，就能继续推进，
不需要回溯对话历史。

## 一、现在的状态（客观事实）

| 项 | 值 |
|---|---|
| fork main | `2b241ba`，版本 **0.9.9**（fork 自己的发布线，与上游版本无关） |
| 上游基线 | `AmintaCCCP/GithubStarsManager` main = **`f60d766`**（2026-09-22 更新，见第八节；13 个分支仍切自旧的 `a8d4b7c`） |
| 待开 PR 的分支 | **13 个**（下表），全部基于 `a8d4b7c`、每个 1 个提交、已推送 |
| PR 正文 | 工作区根目录 `PR-<slug>.md`（13 份），含标题、一键创建链接、验证清单 |
| 全量测试 | vitest **1346 通过**；`RepositoryCard.lazyReadme` 在并行满载下会超时（既有 flake，单独跑 2/2 通过，不要改被测代码） |
| 其它测试 | electron 插件 100、electron 核心 32、CI 门禁 21、update-version 10 全通过 |
| 构建 | `npm run build` 通过，主包 ~1065 KiB（预算 3000 KiB） |
| 门禁 | 13 个分支的**提交后** i18n 门禁都已复核干净；main 的八项门禁全过 |
| fork 发布 | tag `v0.9.5` 已推（触发桌面构建）；0.9.6–0.9.9 只 bump 了版本未打 tag，`versions/version-info.xml` 里这几条 URL 目前指向还不存在的 release |

## 二、13 个分支（按建议开 PR 的顺序）

| # | 分支 | 内容 | 规模 |
|---|---|---|---|
| 1 | `pr/installable-asset-detection` | 可安装资产识别（§2） | 19 文件 +1619/−9 |
| 2 | `pr/batch-repository-url-extraction` | 批量导入提取与归一化（§6 前半） | 3 文件 +858 |
| 3 | `pr/stream-release-downloads` | 桌面端 release 资产流式落盘 + 进度 + 取消 | — |
| 4 | `pr/recently-viewed` | 最近浏览（§9）+ Discovery 隐藏已浏览 | 52 文件 +759/−31 |
| 5 | `pr/clipboard-github-links` | 剪贴板 GitHub 链接识别（§11） | 37 文件 +682/−14 |
| 6 | `pr/deep-links` | Deep Link（§12） | 11 文件 +566/−2 |
| 7 | `pr/theme-tokens` | Theme Token：强调色/圆角/字号/动效（§14） | 25 文件 +616/−13 |
| 8 | `pr/repository-card-fields` | 仓库卡片可见字段（§14 续） | 24 文件 +301/−16 |
| 9 | `pr/my-apps-linking` | My Apps 手动关联（§3，**关键路径起点**） | 35 文件 +3066/−8 |
| 10 | `pr/trending-snapshots` | Trending 快照与榜单历史（§7 前半） | 26 文件 +987/−2 |
| 11 | `pr/community-plugin-registry` | 社区插件注册表提案 + 骨架（§17/§18 契约） | 6 文件 +267 |
| 12 | `pr/plugin-registry-client` | 插件注册表客户端对照（§18 只读一半） | 22 文件 +1149/−11 |
| 13 | `pr/repository-health-facts` | 已随上游 #382 合并，**本地分支可删** | — |

> 每个分支都是"从上游 main 切 1 个提交"，不含版本文件、不含 fork 内部文档（`docs/logs|plans|reports|audit`）。
> `docs/adr/` 与 `docs/proposals/` 属于上游面向文档，可以进 PR 分支。
> 除 #11 需要维护者先定托管位置外，其余都可以直接开 PR。

## 三、剩余工作（按依赖与阻塞分类）

### A. 可以立刻做的（无上游依赖）

1. **§12b 安装一半**：下载固定 `releaseUrl` → 流式校验 `sha256` → **解包** → 复用
   `pluginManager.installFromDirectory`。**卡在解包方案**：仓库现有依赖没有解压库，要么手写严格的
   最小实现（必须带 zip slip 与 symlink 防护），要么引入运行时依赖（要考虑 electron-builder 打包
   与体积）。**需要维护者表态**。
2. **§14 剩余两项**：UI Density、Card spacing。要逐个组件把 Tailwind 固定间距换成语义间距变量，
   是跨几十个文件的改造——建议先定语义间距刻度（如 `--ui-space-1..4` 与密度三档映射）再批量替换。
3. **§15 首页布局**：声明式 widget 的显示/排序/默认页/预设；只保存声明式数据，不允许注入
   HTML/JS/React 组件。Updates 与 My Apps widget 依赖阶段 2/1。
4. **§7b Trending 筛选**：当前平台兼容资产 / Installable only / Not starred / Not seen / Active only
   —— 依赖 #1 与 #4 先合并；批量选中送入导入工作台依赖导入工作台本身。

### B. 依赖前面阶段先合并

5. **§4 更新检测**：建在 `pr/my-apps-linking` 之上（installedVersion 与 includePrereleases 已就位），
   需要新增可关闭的后台检查、频率配置、通知。**必须独立 PR**（后台任务与隐私）。
6. **§5 Release 版本选择器**：按平台过滤旧版资产依赖 #1，标记 installed version 依赖 #9。
7. **§6 导入工作台（预览 + 批量动作）**：依赖 #1、#9、#2，Health 列已在 main。
8. **§8 平台感知 Discovery**：Core 提供"已确认存在兼容资产"的事实（复用资产识别），UI 区分
   "已确认"与"仅推测"。现有 `buildPlatformQuery` 就是"推测"那一半，不要当新功能重做。
9. **§10 Omni Search**：Ctrl+K 聚合现有搜索源；空态用最近浏览（依赖 #4）。明确不做大型全文索引。
10. **§13 数据包加载器（Language Pack + Theme Pack）**：**前置阻塞未解**——现行 `check-i18n.cjs`
    要求 10 语言 key 完全对齐，与"非内置语言做成下载包"方向相反；当前 10 语言已全打进包体。需要先
    与维护者定：内置保留哪几套、其余是否转包、门禁如何改。
11. **§3/§4 深入项**：My Apps 的 `installPath`、下载记录、SHA-256 与检测来源等元数据展示（§20 的
    展示面 + `Open system settings`）；本机软件检测（§19）按平台拆，排在 My Apps 稳定之后。

### C. 已明确不做（避免重复劳动）

- 守则开头声明不重写的：插件系统、AI Host API、Web Search、Release Processor、Smart Release
  Recommendation、sandboxed Plugin Pages、插件权限与生命周期。
- Plugin 领域（健康分与权重、"值得装吗"、替代品、AI 分类、生态特定资产匹配、自定义导出）——
  留给生态插件，不占 Core 队列。

## 四、需要维护者拍板的问题（发 PR 时一并问）

1. **插件注册表托管位置**：放主仓库 `registry/`，还是单独开一个插件注册表仓库？（影响审核权限与提交历史）
2. **§12b 解包方案**：手写最小 unzip，还是允许引入一个只做解压的运行时依赖（如 `yauzl`）？
3. **Language Pack 与内置语言的取舍**：内置保留哪几套？门禁（要求 10 语言齐全）是否要改？
4. **新 i18n key 的 namespace 归属**，以及是否每次都必须补齐 10 种语言（现行门禁要求补齐，我们一直照做）。
5. **新事实模型是否进 MCP/AI 暴露面**（My Apps、Trending 快照、最近浏览）——
   `server/tests/mcp/parity.test.ts` 约束镜像实现，决定要改几处。
6. **fork 是否继续自行 bump 版本**（现状：PR 分支不带版本文件，fork main 自己发版）。
7. **Web 侧下载的公开/私有判据**：要不要给 `Repository` 加 `private` 字段，好让公开资产在浏览器里
   直开而不经过 blob（`pr/stream-release-downloads` 的遗留）。

## 五、流程与踩坑（下次照做能省一半时间）

### 5.1 分支与交付

- 从 `refs/remotes/aminta/main` 切分支（一次性 fetch，见开发说明 7.1）；一个分支一个提交；推送分支
  + 生成 `PR-<slug>.md`，**不自动创建 PR**。
- PR 分支禁区：版本文件、`versions/version-info.xml`、fork 内部文档、codemod 脚本。

### 5.2 门禁

- 八项门禁在每个分支与每次合并后都跑：boundaries / i18n / pr-release-files / lint / typecheck /
  test:run / build / `git diff --check`。
- **`check-i18n.cjs` 读的是 HEAD 的提交内容，不是工作区**——未提交时跑会假通过，必须提交后复验。
- **zh-TW 与简体同形的词会被判"照抄简体"**：`小/中/大`、`上升/下降`、`描述`、`有新版本`、
  `已是最新`、`立即停用` 都中过招。写 zh-TW 时主动换说法（`小號/中號/大號`、`爬升/下滑`、`說明`、
  `版本 {{v1}} 已推出`、`已更新至最新`、`立刻停用`）。

### 5.3 合并进 main 的固定套路

多个阶段并行推进时，`src/store/**`（类型、schema、initialState、持久化选项、normalizer、
modularization 测试）、`src/types/index.ts`、设置面板、`DiscoveryView.tsx` 几乎必然冲突；而
"两边各自往同一处追加"的文件用并集策略会**看起来合并成功但其实是坏的**。可靠做法：

1. 冲突文件先用"两边都保留"的并集脚本过一遍（把 `<<<<<<<`/`=======`/`>>>>>>>` 之间的两段按
   ours→theirs 顺序拼起来；脚本要在仓库目录里跑 `git diff --name-only --diff-filter=U`——Node 的
   CWD 不一定是仓库），并注意锚点要适配 CRLF；
2. 然后**人工检查并集必然出错的五类地方**：
   - 持久化 `version` 变成两行（只留一行并 +1），迁移注释跟着改；
   - migrate 块的 `if (state) {` 收尾被吞、或下一块被吞进上一块；
   - modularization 测试里 version 断言出现两行；冻结 key 列表**顺序**要与 partialize 一致；
   - JSX 子节点被塞进错误的表达式（`DiscoveryView`、设置面板各翻过一次）；
   - 类型声明重复（`electronProxy.ts` 的 `plugins` 翻过一次）。
3. **locales 不要手工解冲突**：`git checkout --ours -- src/locales` 后重跑插入脚本。
   ⚠️ **插入脚本里的译文必须与分支上已修正的版本一致**——有一轮就是脚本里还是修正前的 `描述`，
   把上一阶段刚过门禁的 zh-TW 措辞悄悄退了回去。
4. 合并后：`node scripts/check-i18n.cjs --base a8d4b7c`（**提交后**）、全量测试、build。

### 5.4 其它环境坑

- locale 文件是 CRLF，改 JSON 用行锚点插入，不要整文件 parse/stringify 回写。
- PowerShell 里 `node -e` 的引号极易炸；批量文件改写写成 `.mjs` 脚本（适配 CRLF），用完删。
- `.NET`/Node 的 CWD 与 PowerShell 当前位置不一致，读文件用绝对路径。
- `git show > file` 不是字节级的，要 `cmd /c "git cat-file blob <sha> > out.bin"`。
- 构建/测试会让 npm 重写 lockfile 行尾，切分支前先 `git checkout -- package-lock.json server/package-lock.json server/package.json`。

## 六、文档地图

| 文档 | 作用 |
|---|---|
| `docs/development-guide.md` | 工程规范：分层、i18n、门禁、分支规矩、测试规范、Windows 坑位 |
| `docs/plans/2026-09-21-staged-implementation-plan.md` | 阶段划分与依赖顺序（23 项推荐 PR 的映射表） |
| `docs/reports/2026-09-21-feature-coverage-audit.md` | 守则 20 节的实现现状审计（判断"要不要重做"看它） |
| `docs/logs/2026-09-21-stage-*.md` | 每阶段开发日志（阶段 0 / 5 / 9b / 9a / 10a / 10a-2 / 1a / 7a / 12b-1） |
| `docs/logs/2026-09-21-session-summary.md` | **本文件**，交接入口 |
| 工作区根目录 `PR-*.md` | 13 份 PR 正文；`回复维护者.md` 是给维护者的沟通稿 |

## 七、用户已决定的事项（2026-09-22）

### 7.1 §12b 安装的解包方案：**先问维护者再定**

下一个会话不要直接开写安装。先在 `pr/community-plugin-registry`（契约）与 `pr/plugin-registry-client`
（只读客户端）的 PR 里问清楚：允许手写最小 unzip，还是允许引入一个只做解压的运行时依赖（如
`yauzl`，需考虑 electron-builder 打包与体积）。得到答复后再动手；在答复之前，安装那一半保持不做。

### 7.2 PR：**先开最独立的 2-3 个**

按无依赖、体积小、易评审排序，先开这三个：

| 顺序 | 分支 | 标题 | 一键创建 |
|---|---|---|---|
| 1 | `pr/installable-asset-detection` | `feat: detect installable release assets` | https://github.com/AmintaCCCP/GithubStarsManager/compare/main...Khk-NL:GithubStarsManager:pr/installable-asset-detection?expand=1 |
| 2 | `pr/batch-repository-url-extraction` | `feat: add batch repository URL extraction` | https://github.com/AmintaCCCP/GithubStarsManager/compare/main...Khk-NL:GithubStarsManager:pr/batch-repository-url-extraction?expand=1 |
| 3 | `pr/recently-viewed` | `feat: add recently viewed repositories` | https://github.com/AmintaCCCP/GithubStarsManager/compare/main...Khk-NL:GithubStarsManager:pr/recently-viewed?expand=1 |

正文直接复制对应 `PR-<slug>.md` 里的内容（标题、正文、验证清单都在里面）。

注意：**本机没有安装 `gh`**，所以只能点上面的链接在浏览器里创建。既有的约定是"只推分支 + 生成
md，不自动创建 PR"——如果希望改成由 agent 直接调 API 创建，需要用户显式解除那条约定（并确认
token 与权限）。

其余分支等这三个合并、上游 main 前进之后再开，避免反复 rebase。

### 7.3 版本策略：**继续每阶段 bump，只在要发版时打 tag**

保持现状：阶段完成时在 fork main 上 `npm run update-version` + `npm run sync-version` 并提交；
只有真要发版时才打 tag。

已知且**无需修复**的一点：`versions/version-info.xml` 里 0.9.6–0.9.9 的下载链接指向还不存在的
release（最后打过的 tag 是 `v0.9.5`）。这不影响用户——`src/constants/project.ts` 的
`PROJECT_REPO_URL` 指向**上游**，应用内更新检查读的是上游的 feed，fork 自己的条目不会被使用。
如果要让 fork 用户也能从应用内更新，才需要给这些版本补 tag 并触发构建。

## 八、上游基线更新（2026-09-22，重要）

用户提示"原仓库最近又有修改"，已核对：上游 main 从 `a8d4b7c` 前进到 **`f60d766`**（+8 提交）：

| 提交 | 内容 | 是否影响我们 |
|---|---|---|
| `a9b8d81` / `6902db4` | `fix(i18n): 向量搜索模型来源选项与 API Key 标签不再露出 raw key`（#384）：新增 `src/constants/embeddingApiTypes.ts`、`src/i18n/vectorSearchApiTypeLabels.test.ts`，改 `VectorSearchSettings.tsx`，并给**全部 10 个 `src/locales/*/app.json` 各加 7 行** | 只影响 `app.json` 的 `vectorSearchSettings` 段；与我们的 key 不重叠 |
| `e500dbc` / `dbf23a7` / `1fe00c5` | `ci: 固定 ubuntu-latest 到 ubuntu-24.04`（#385）+ 注释统一 | 不涉及前端 |
| `265fc8a` / `f60d766` | 上游版本 0.8.1 → 0.8.2 + release info | 与 fork 版本线无关 |
| `a62904d` | CI 修复：fullstack arm64 构建依赖、electron-builder 重试、升级 action-gh-release 到 v3 | 不涉及前端 |

**结论：这 8 个提交没有一项碰到我们正在做的功能，没有重复劳动；12 个待开 PR 的分支对新上游用
`git merge-tree` 逐个探测都是零冲突**（命令：`git merge-tree --write-tree --name-only refs/remotes/aminta/main <branch>`）。

不过仍建议**在开每个 PR 之前先把该分支 rebase 到最新上游**：

```bash
git fetch https://github.com/AmintaCCCP/GithubStarsManager.git main:refs/remotes/aminta/main
git checkout pr/<slug>
git rebase refs/remotes/aminta/main     # 每个分支只有 1 个提交，冲突面就是那 10 个 app.json
npm run check:boundaries && node scripts/check-i18n.cjs --base refs/remotes/aminta/main \
  && npm run lint && npm run typecheck && npm run build
# 推送（分支已被别人看过时用 --force-with-lease）
git push --force-with-lease=refs/heads/pr/<slug>:<旧 sha> origin pr/<slug>
```

rebase 后必须重跑 i18n 门禁（上游新增了 7 个 key/语言，parity 要求是"key 集合一致"，我们的提交
是纯增量，理应仍然干净，但要实测确认），并且**不要**把上游的版本文件改动带进 PR 分支。

另外一件可选事项：把上游这 8 个提交并进 fork main（可拿到 CI 修复与 vector i18n 修复）。预期
`app.json` 与版本文件会冲突，解法照 5.3 的套路——但 fork main 已经叠了 9 个阶段，这个合并值得
单独一轮做，别和其他改动混在一起。


