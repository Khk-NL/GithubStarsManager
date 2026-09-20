# GithubStarsManager 开发说明

面向在本仓库继续开发的人（以及接手的新会话）。三份配套文档，各管一件事：

| 文档 | 作用 | 效力 |
|---|---|---|
| `docs/adr/0001-frontend-layering.md` | 前端分层与依赖方向 | **强制**，由 ESLint 与 `check-boundaries.cjs` 双双落地 |
| `docs/reports/2026-09-21-feature-coverage-audit.md` | 开发守则 20 节的实现现状 | 事实基线，判断"要不要重做"看它 |
| `docs/plans/2026-09-21-staged-implementation-plan.md` | 阶段划分与依赖顺序 | 排期依据 |
| 本文 | 怎么在本仓库写代码、过门禁、交付 | 操作规程 |

冲突时的优先级：**ADR 与门禁脚本 > 本文 > 个人习惯**。门禁脚本说不行就是不行，不要用 `eslint-disable` 绕过——ADR 的结尾专门写了这一条。

---

## 1. 环境与运行

### 1.1 依赖

- Node + npm。本机验证用的是 Node v24；`package.json` 没有 `engines` 约束。
- `electron` 与 `electron-builder` **不在 `package.json` 的依赖里**。桌面构建工作流会在 CI 里临时安装它们，本地想跑桌面端需要自己装：`npm install --save-dev electron`。
- 后端子项目在 `server/`，有独立的 `package.json` 与 lockfile。它依赖原生模块（`better-sqlite3`），本地编译不通时 server 侧测试无法验证，这点心里有数即可。

### 1.2 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | Vite 开发服务器（Web 形态） |
| `npm run electron:dev` | 桌面形态，`NODE_ENV=development` 起 Electron |
| `npm run build` | 生产构建 + `check:bundle-size` 预算检查 |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | `eslint .` |
| `npm run test` / `npm run test:run` | vitest（watch / 一次性）；`test:run` 还会串起 electron、CI 门禁、版本脚本的测试 |
| `npm run check:boundaries` | 分层边界独立扫描器（与 ESLint 镜像） |
| `npm run check:i18n -- --base <ref>` | i18n 完整性与硬编码门禁 |
| `node scripts/check-pr-release-files.cjs --base <ref>` | 阻止贡献者 PR 改版本文件 |
| `npm run build:desktop` | 构建桌面产物 |
| `npm run dist` | electron-builder 打包 |
| `npm run update-version -- <changelog...> [--url=...]` | 改版本并同步 lockfile 与 `versions/version-info.xml`；另有 `--sync-lock` / `--list` / `--current` |

`test:run` 的组成值得记一下，它决定了新测试该挂在哪：

```
vitest run
&& npm run test:electron:mcp        # node --test electron/*.test.js（含 core 模块与桌面偏好）
&& npm run test:electron:plugins    # node --test electron/plugins/*.test.js
&& npm run test:update-version
&& npm run test:ci-gates            # 门禁脚本自身的单测
```

**新加的 `electron/*.test.js` 必须挂进 `test:electron:mcp` 的文件列表，否则 CI 不会跑它**——那个脚本名字里带 `mcp` 是历史遗留，它实际是"electron 核心测试"桶。

### 1.3 三种运行形态

同一份前端代码要跑在三种环境里，改动时必须三种都想到：

| 形态 | 数据来源 | 说明 |
|---|---|---|
| Web（纯 SPA） | 浏览器直连 GitHub API | 受 CORS 与浏览器能力限制 |
| Web（带 `server/` 后端） | 经 `backendAdapter` 走服务端代理 | 有后端时 GitHub 调用与下载都可由服务端代劳 |
| Electron 桌面 | 直连或经后端，IPC 提供特权能力 | 代理、本地 MCP、桌面下载、托盘、深链等只有这里有 |

`src/services/routeMode.ts` 的 `shouldBypassBackend()` 决定某个功能走不走后端；`routeMode` 取值为 `auto` / `backend` / `browser`。新写数据获取时要显式判断，不要把"有后端"当成前提。

---

## 2. 代码结构与分层

### 2.1 目录职责

| 路径 | 放什么 |
|---|---|
| `src/components/**` | 共享 View 组件；`src/components/ui/**` 是 shadcn 原语 |
| `src/features/<feature>/components/**` | 该 feature 自己的 View 组件（同样受 View 层约束） |
| `src/features/<feature>/hooks/**` | 该 feature 的 ViewModel / 编排 hook |
| `src/features/<feature>/application/**` | 纯状态迁移命令，`(state, input) => state` |
| `src/hooks/**` | 跨 feature 共享的 hook |
| `src/services/**` | GitHub API、AI、向量、后端适配、RPC 下载等业务服务；`*Storage.ts` 是领域持久化 |
| `src/store/**` | 唯一持久化入口、slice、selector、normalizer |
| `src/utils/**` | 纯工具（检索、健康事实、资产识别、格式化等） |
| `src/types/**` | 类型定义 |
| `src/i18n/**`、`src/locales/**` | i18n 运行时与 10 语言 × 14 namespace 的词条 |
| `src/plugins/**` | 渲染端的插件客户端、类型、快照桥 |
| `electron/**` | 主进程、preload、MCP 本地服务、插件宿主；`electron/plugins/**` 是插件运行时 |
| `server/**` | 可选服务端（代理、MCP） |
| `scripts/**` | 门禁、构建、版本、codemod |
| `versions/version-info.xml` | 应用内更新检查读取的版本源 |

### 2.2 五层依赖方向（ADR 0001）

```
View         src/components/**、src/features/*/components/**    只渲染、格式化、转发意图
Hook         src/features/*/hooks/**、src/hooks/**              编排：可调服务与 Store
Application  src/features/*/application/**                      纯状态迁移，无 React/DOM/服务
Service      src/services/**                                    远端调用、后端适配
Store        src/store/**                                       唯一持久化入口
```

只允许向下依赖，不允许横向钻进别的 feature 内部（跨 feature 走 Store 或 `src/hooks/**`）。

**View 层禁止导入的业务服务**（ESLint 与 `check-boundaries.cjs` 各有一份，要保持同步）：

```
githubApi  aiService  aiAnalysisHelper  aiAnalysisOptimizer  vectorSearchService
autoSync  webdavService  backendAdapter  rpcDownloadService  githubApiFactory
updateService  translateService
```

可以例外的是**基础设施**而不是控制器：`logger`、`electronProxy`（含 `isElectron`）、`indexedDbStorage`、`mcpElectronBridge`、`aiRequestLimiter`、`discoveryAnalysisStorage`。

> 判断口径：**会发起远端调用或改 Store 的，是业务服务，必须藏在 hook 后面；同步工具（logger、isElectron、indexedDBStorage）是基础设施，哪儿都能引。**

### 2.3 文件放置规则（有脚本强制）

- hook 放 `src/features/<feature>/hooks/**`；直接躺在 feature 根目录的 `use*.ts(x)` 会**直接判违规**。
- 跨 feature 共享的 hook 放 `src/hooks/**`。
- feature 下的目录只有 `hooks/`、`components/`、`application/`、`__tests__/` 四类，想自造第五类得先改 ADR。
- 一个 feature 自己的本地持久化包装放 `src/services/*Storage.ts`（它算基础设施）。
- 页面级 view-model selector（`src/store/selectors.ts` 里的 `selectXxxState`）的唯一响应式消费者是该页面的编排 hook；组件要子集就新加单值 selector，别整包订阅。

### 2.4 镜像实现

部分逻辑同时存在于三处，这是既有架构决定的：

| 位置 | 形态 | 例子 |
|---|---|---|
| `src/utils/*.ts` | ESM / TS | `repositoryHealth.ts`、`installableAssets.ts`、`repositoryImport.ts` |
| `electron/*.js` | CJS | `repoHealth.js`、`releaseAssetTransfer.js` |
| `server/src/mcp/*.ts` | ESM / TS | `repoHealth.ts` |

`server/tests/mcp/parity.test.ts` 会锁住它们的一致性。**新增"事实模型"类逻辑（健康、资产、导入等）之前先决定要不要镜像到 MCP 与 AI 的暴露面**——这决定三处要改几处，也决定测试怎么写。

---

## 3. 状态与持久化

### 3.1 只有一个持久化 Store

`src/store/useAppStore.ts` 里只有一个 `create()(persist(...))` 外壳，slice 只贡献 state + action，**持久化集中在一处**（`src/store/persistence/options.ts`）。不要引入第二个持久化 store：`migrate` 链与原子 hydration 都建立在这个前提上。不需要持久化的 slice 不出现在 `partialize` 里就行。

### 3.2 改持久化字段的规则

`appPersistenceOptions.migrate` 是唯一能改写历史快照的地方：

1. `version` **只加一**，加一次。
2. `migrate` 必须**幂等且完备**：对已经迁移过的快照再跑一遍是 no-op；任何字段缺失都要落到默认值，不能抛。
3. 没有 migrate 步骤就不要删改持久化 key。
4. 不要把曾经排除在 `partialize` 之外的 key 重新塞回去（除非配套的 migrate 会从旧快照里剔除它）。
5. `src/store/useAppStore.modularization.test.ts` 冻结了 `version`/`partialize`/`migrate`/`merge` 的形状，改了它就要在同一个 PR 里更新这个测试。

三个不能动的历史契约：

- `discoveryRepos` **永不持久化**（体量太大，重新拉比反序列化划算）。
- `backendApiSecret` **故意存三处**（sessionStorage 实时读、localStorage 镜像、IndexedDB 兜底），各自覆盖一种失败模式，别合并。
- 代理走 IPC、RPC 下载走 HTTP，**这个不对称是刻意的**，别为了"统一"把代理塞进 fetch 或把 RPC 塞进 IPC。

---

## 4. 服务、凭据与下载

### 4.1 GitHub 访问与 Token

- Token 从 Store 读取，只在渲染进程持有；**传给主进程时按请求显式传参，主进程不落盘、不缓存**（`downloads:saveReleaseAsset` 就是这么做的）。
- 不要打日志、不要进备份（`includeKeysInBackup` 默认 false 是安全优先的默认值）。
- 插件拿不到 Token，也拿不到 AI Key——这是插件的硬边界。

### 4.2 后端代理与直连

`backendAdapter` 提供代理调用；`shouldBypassBackend()` 与 `routeMode` 决定绕过与否。新增 GitHub 调用时按现有模式判断，别硬编码"有后端就用后端"。

### 4.3 下载的四条链路

| 链路 | 场景 | 特点 |
|---|---|---|
| 浏览器 blob | Web 且需要鉴权头（私有资产） | 整包进内存，浏览器无法流式落盘，没有进度 |
| 后端代理 | 带 `server/` 的部署 | 由服务端代取，返回 Blob |
| RPC 下载器 | 用户配置了外部下载器 | 交给 aria2 之类，带 `sent` 状态 |
| 桌面流式落盘 | Electron | 主进程流式写盘，有进度与取消，`electron/releaseAssetTransfer.js` |

挑链路时按这个顺序思考：**能否流式落盘 → 是否需要鉴权头 → 是否能交给浏览器原生下载**。新增大文件下载时不要走 blob 那条。

### 4.4 主进程能力的惯例

- 地址白名单、大小上限、文件名规范化这类安全校验**只有一处实现**，别的路径引用它（`electron/plugins/releaseDownload.js` 现在引用 `electron/releaseAssetTransfer.js`）。
- 主进程下载一律"先写 `.part-*` 再 rename"，失败或取消要清理临时文件。
- 需要主进程回报异步状态时，用 `ipcMain.handle` 收命令 + `event.sender.send` 推事件；preload 里把 `ipcRenderer.on` 包成返回清理函数的订阅。

---

## 5. i18n 规范

### 5.1 结构

- 10 种语言：`zh` `en` `ja` `es` `pt-BR` `ru` `zh-TW` `fr` `de` `ko`（与 `src/i18n/languages.ts` 保持同步）。
- 14 个 namespace：`common` `app` `login` `repositories` `gists` `releases` `discovery` `chat` `search` `plugins` `settings` `ai` `services` `errors`（与 `src/i18n/index.ts` 保持同步）。
- 文件是嵌套 JSON，key 用 kebab-case，长句子按原逻辑截断到 ~50 字符，所以会看到 `...-and` 这种结尾。
- 组件里 `const t = useT('releases')`，然后 `t('repositoryReleaseSheet.download')`；非组件处用 `TranslateFn`。
- 数字、日期、locale 一律走 `src/i18n/format.ts`（`formatNumber`、`formatDate`、`getDateFnsLocale`、`getIntlLocale`），不要自己 `toLocaleString()` 或手拼日期。

### 5.2 门禁规则（`scripts/check-i18n.cjs`）

全量检查：

1. 每种语言都要有全部 namespace 文件。
2. 所有语言的 key 集合必须**完全一致**。
3. 源码里字面量 `t('key')` 必须能在 zh 里找到（按最近的 `useT`/`makeT` namespace 解析）。

PR diff 检查：

4. 新增或修改的 ja/es/pt-BR/ru/fr/de/ko 文案**不得照抄英文**；zh-TW **不得照抄简体**。
5. 新增 `useTPair` / `makeTPair` / `tPair(` 一律禁止。
6. 新增的 JSX 文本或 UI 属性字面量，含 CJK 或含 3 个以上英文单词的，必须有 `// i18n-allow-literal` 才放行。

### 5.3 新增文案的标准流程

1. 先在 `en` 与 `zh` 写好（英文是源语言，中文是 `t()` key 的校验来源）。
2. **一次性补齐另外 8 种**。短 UI 词条手写（"取消下载"这种），长句子可以走 `scripts/codemods/generate-translations.mjs` 机翻后再改。
3. 跑 `npm run check:i18n -- --base <PR 基线>`，必须干净。
4. 用行锚点插入改 locale 文件，**不要 `JSON.parse` 之后 `JSON.stringify` 整文件回写**：locale 文件是 CRLF，整体重写会产生上千行 diff，而且容易改坏编码。
5. 如果动了 AI prompt 相关的文案，`src/services/aiPromptFixtures.test.ts` 可能要重新生成：`UPDATE_I18N_FIXTURES=1 npx vitest run src/services/aiPromptFixtures.test.ts`，然后**确认 diff 只有你这次加的那块**。

### 5.4 i18n 上踩过的坑

- 只补 zh/en 就推送，会在 10 语言 parity 门禁上挂掉（资产识别分支就是这样欠了 8 种语言）。
- 从 `git diff` 的 `+` 行判断某个 key 是谁的，会被"移动的行也显示为新增"骗到，删掉上游的 key。要确认归属用 `git grep <key> <上游 sha> -- src/locales/en/<ns>.json`。
- 按行删除 key/section 会留下尾逗号，让 JSON 全体解析失败，vitest 连收集都过不去。改完随手 `JSON.parse` 验一遍。

---

## 6. 插件与 Core 的边界

### 6.1 判定规则

按优先级从高到低问：

1. 涉及凭据或特权资源（Token、AI Key、原始 IPC、Shell、任意文件系统/网络）→ **只能 Core**。
2. 是其他功能或插件的地基 → Core。
3. 需要本地持久化与跨功能一致性 → Core。
4. 是安全边界（校验、沙箱、扫描）→ Core。
5. 主观、可替换、领域特定（评分、推荐、排序偏好）→ **Plugin**。
6. 缺了它应用显得残废 → Core。
7. 需要为它新增敏感的插件能力 → 一般归 Core，或者先不做。

结论应用：健康分与权重、"值得装吗"、替代品推荐、AI 分类、生态特定资产匹配、自定义导出与报告 → 插件；健康事实、资产识别、批量导入、快照、最近浏览、Omni Search、My Apps、版本选择器、平台兼容性事实、深链、剪贴板、主题 token、首页布局、数据包加载器、插件注册表 → Core。

### 6.2 插件的硬边界

- 权限以 manifest 声明并按需授权，现有能力包括 `repositories:read|write`、`privateRepositories:read`、`releases:read`、`gists:read`、`storage`、`clipboard:write`、`external:open`、`ai:invoke`、`web:search`、`downloads:create`、`network:*`。
- 插件不得直接访问 Token、AI Key、Zustand、原始 IPC、Shell、任意文件系统或任意网络。
- 新增插件能力或权限**必须单独成 PR**，因为它会改变安全边界与用户授权提示。
- 下载资产由宿主代做（`plugins:downloadReleaseAsset` 走 `electron/plugins/releaseDownload.js`），并做地址白名单、大小上限、重定向后再校验。

### 6.3 Language Pack / Theme Pack 不是插件

严格区分三种东西：**Language Pack 只含文本，Theme Pack 只含外观（CSS 变量、theme token、静态图），Plugin 才改变行为**。前两者由 Core 的加载器消费，不执行 JS、不访问 Node/网络/仓库/插件能力，带 SHA-256 校验与卸载，缺失 key 自动回退。

---

## 7. 开发流程

### 7.1 分支

- 从**上游 main**（`AmintaCCCP/GithubStarsManager` 的 main）切分支，命名 `pr/<slug>`。基线越新，rebase 越省事。
- 一个分支**一个提交**。发现要顺手改别的，另开分支，不要往同一个 PR 里塞。

```
git fetch https://github.com/AmintaCCCP/GithubStarsManager.git main:refs/remotes/aminta/main
git checkout -b pr/<slug> refs/remotes/aminta/main
```

> 本地 remote 命名有个坑：`origin` 与 `upstream` 都指向我们自己的 fork（`Khk-NL/GithubStarsManager`），真正要 PR 过去的原仓库没有配 remote，用上面这条一次性 fetch 到 `refs/remotes/aminta/main` 再对齐。

### 7.2 PR 分支的禁区

分支里**不能出现**：

- `package.json` / `server/package.json` 的 `version` 字段
- `package-lock.json` / `server/package-lock.json` 的版本字段
- `versions/version-info.xml`
- `docs/`（日志与报告留在 fork main）
- codemod 类一次性脚本（放工作区外，用完删）

前三条由 `check-pr-release-files.cjs` 强制；后两条是约定。提交前自查：

```
node scripts/check-pr-release-files.cjs --base refs/remotes/aminta/main
```

### 7.3 提交信息

Conventional Commits（`feat:` / `fix:` / `docs:` / `ci:` / `refactor:`），正文用中文写清"为什么"和"改了什么边界"，正文里解释取舍比列文件清单有用。

### 7.4 门禁清单（PR 模板要求，本地必须全绿）

```
npm run check:boundaries
npm run check:i18n -- --base refs/remotes/aminta/main
node scripts/check-pr-release-files.cjs --base refs/remotes/aminta/main
npm run lint
npm run typecheck
npm run test:run
npm run build
git diff --check
```

### 7.5 交付方式

推送分支到 fork + 在工作区根目录生成 `PR-<slug>.md`（标题、一键创建链接、正文、验证清单）。**不自动创建 PR。**

### 7.6 日志与版本

- 每个阶段完成后写 `docs/logs/<日期>-stage-N-<slug>.md`。
- 版本在 fork main 上 bump：`npm run update-version -- "<changelog>" --url=<release 链接>`，它会同步 lockfile 与 `versions/version-info.xml`。
- 打 tag 时 tag 必须等于 `package.json` 的版本（`scripts/check-release-version.cjs` 会拦）。
- 注意 `src/constants/project.ts` 里的 `PROJECT_REPO_URL` 指向**上游**，所以应用内更新检查读的是上游的 version-info.xml，fork 自己的 release 不会喂给这个检查器。

### 7.7 发现功能已经实现了怎么办

守则第 1105 行给了明确指引，照做：

1. 标记为已存在（写进审计文档）。
2. 评估是不是只需要增强。
3. 优先提交小型增量改动。

本仓库已经发生过好几次"以为要新写、其实只差一个信号"的情况（平台筛选、搜索历史、主题预设、内容检索）。**动手前先搜一遍**：`src` + `electron` + `server` 三处都搜，按行为搜而不是按功能名搜。

---

## 8. 测试规范

### 8.1 三个测试域

| 域 | 运行方式 | 文件位置 |
|---|---|---|
| 前端 | `vitest`（jsdom，`@testing-library/react`） | 与被测文件同目录的 `*.test.ts(x)` |
| Electron 主进程 | `node --test` | `electron/*.test.js`、`electron/plugins/*.test.js`（CJS，`node:test` + `node:assert/strict`） |
| 脚本 / 门禁 | `node --test` | `scripts/*.test.cjs` |

### 8.2 新测试要挂进 npm script

`electron/*.test.js` 不会自动被发现，必须加进 `test:electron:mcp` 的文件列表；`scripts/` 下的测试同理要挂进 `test:ci-gates` 或 `test:update-version`。

### 8.3 主进程代码怎么测

不要试图在测试里起 Electron。把主进程逻辑写成**依赖注入的纯模块**：`fetchImpl`、`showSaveDialog`、`ownerWindow` 都从参数进来，测试传假实现。`electron/releaseAssetTransfer.js` 与 `electron/plugins/releaseDownload.js` 都是这个形状，14 例测试全程不碰网络与真实文件对话框，只用 `fs.mkdtempSync` 建临时目录。

### 8.4 断言口径

- 断言 mock 被调用只是最低要求，**再补一条行为断言**（文件真的写出来了、按钮真的禁用了、状态真的被清了）。
- 回归用例要断言"不再发生的事"：例如桌面下载路径要断言 `fetch` **没有**被调用。
- 异步状态（进度、节流）用可控的 Promise 手动 resolve，别靠 sleep。

### 8.5 已知 flake

并行满载时 `src/components/RepositoryCard.lazyReadme.test.tsx` 与 `src/store/useAppStore.test.ts` 会因超时串台而失败（前者超时后没来得及清理 DOM，连带第二个用例报"找到多个元素"）。**单独跑一遍核实**：

```
npx vitest run src/store/useAppStore.test.ts
npx vitest run src/components/RepositoryCard.lazyReadme.test.tsx
```

单跑绿就不是回归，别去改被测代码。

---

## 9. 分阶段开发说明

阶段依赖与排期见 `docs/plans/2026-09-21-staged-implementation-plan.md`。这里只写每个阶段"动手时要注意什么"。

### 阶段 0：还欠账

- **0a** 资产识别 rebase 到当前上游 main，按 5.3 的流程补齐 8 种语言（14 个 key）。rebase 时注意 locales 与 `RepositoryReleaseSheet.tsx` 都可能和上游的 i18n 迁移冲突，取上游的 key 归属以 5.4 的 `git grep <sha>` 方式确认。
- **0b** 批量提取分支 rebase 校验，纯逻辑，无 i18n 欠账。
- **0d** fork main 合并上游：health 相关取上游，`package.json` 版本行取 fork，locales 取上游。

### 阶段 1：My Apps 基础

- **复用**：`buildReleaseDownloadLinks`（拿资产）、`useRepositoryReleaseSheet` 的下载分支（落盘与 SHA-256 可以在主进程一并算出来）、`RepositoryHealthPanel` 的展示风格。
- **新增**：`src/types/linkedApplication.ts`、`src/features/apps/hooks/**`、`src/features/apps/components/**`、`src/services/linkedApplicationStorage.ts`（或进 Store——**先定这个**：跨功能一致性倾向 Store，单功能本地数据倾向 `*Storage.ts`）。
- **Store**：若进 Store，按 3.2 的四条规则加 migration，并同 PR 更新 modularization 测试。
- **i18n**：新 namespace 还是复用 `repositories`？**先与维护者对齐**，然后 10 语言一次补齐。
- **验收**：不解关联不删用户文件；不新增 Electron 权限；Web 形态下这个页面要给出合理降级（不能崩）。
- **待定**：installed version 与 Release tag 的版本号比较规则（`v` 前缀、后缀）要写成纯函数并单测，别散在组件里。

### 阶段 2：更新检测

- **必须独立成 PR**：引入后台任务与隐私面。
- 默认关闭或用户显式开启；频率可配；**API 失败不得显示成"停止维护"**，要区分"未知"与"无更新"。
- 版本无法可靠解析时显示 `Unknown`，不要猜。
- 最新版没有当前平台兼容资产时（复用阶段 0a 的 `installableAssets`）只提示有新版本，不推荐具体下载。

### 阶段 3：Release 版本选择器

- 历史版本浏览已经由 `ReleaseTimeline` 提供，**不要重做**；本次补的是按当前平台过滤旧版资产、标记 installed version、兼容性提示。
- 文案统一为 `Download this version`，**不要写 `Downgrade`**（没有真的执行安装）。
- 下载旧版不自动改写版本记录。

### 阶段 4：批量导入预览

- 提取与归一已完成，本次是工作台。预览表的每一列都要指出数据来源：Health 来自 `src/utils/repositoryHealth.ts`，installable asset 来自 `installableAssets.ts`，already in My Apps 来自阶段 1。
- 失败项分类与"转移后 old → new"展示都要**显式呈现**，不静默改写用户输入。
- 批量动作全部复用既有 action（Star、分类、Tag、Subscribe、导出、插件动作），不要另写一套。

### 阶段 5：Recently Viewed

体积小、无依赖，适合穿插。要点：本地记录、可清空、可关闭、有上限、不上传、**不默认暴露给插件**；Discovery 的 Hide Seen 与它联动，清空历史要同步解除隐藏；已 Star/已关联/固定的仓库不被永久隐藏。

### 阶段 6：Omni Search

- 明确不做大型全文索引，**复用现有搜索源**：`performBasicTextSearch`、`vectorSearchService`、`grepAppService`、release/gist/developer 的既有查询。
- 关键词结果必须立刻显示，语义检索延迟执行且允许降级。
- 空查询展示最近访问（阶段 5）与常用动作。
- 顺带把 `SearchBar` 里那 10 条组件内历史提升为全局（守则推荐项 10）。

### 阶段 7：Trending 快照

- 快照存储要能回答：当前 rank、上次 rank、rank 变化、首次出现、连续上榜、周期新增 stars。采集时机与去重规则先定，别让同一周期写入多条。
- Trending 不建独立详情模型，统一走 Repository → Metadata → Health → Release → Installable Asset → Star/Local State → My Apps。
- 筛选里的 Installable only / Not seen / Active only 分别依赖阶段 0a、阶段 5、`repositoryHealth.ts` 的信号。

### 阶段 8：平台感知 Discovery

- 现有 `buildPlatformQuery` 就是"按关键词推测"那一半，**不用改它**，要加的是"已确认存在兼容资产"的事实来源（复用 `installableAssets.ts`），再在 UI 上把两者区分开。
- 平台与架构是**推荐信号**，不是不可取消的硬过滤。
- 逐仓库判断兼容性会产生额外 API 调用，要先想好缓存与配额策略。

### 阶段 9：系统入口

- **9a Deep Link**：所有参数重新校验；不允许直接安装插件、下载文件或执行高风险动作；有副作用需确认；Electron 侧注册协议 + 单实例转发，Web 侧由 URL 路由承接。两侧行为要一致。
- **9b 剪贴板**：默认关闭或首次说明；只在前台/主动触发时读；本地解析，非 GitHub 内容立即丢弃；不保存完整剪贴板、不后台常驻。

### 阶段 10：个性化

- **10a Theme Token**：全部落在 CSS 变量与声明式偏好上；不要引入依赖 DOM selector 的写法。加 token 时同步 `src/index.css`、`tailwind.config.js` 与主题预设生成脚本。
- **10b 首页布局**：只保存声明式布局数据，**不允许注入 HTML/JS/React 组件**；插件 widget 只做声明式注册。Updates/My Apps widget 依赖阶段 2/1，可以先接现有 widget 后续补注册。

### 阶段 11：数据包加载器

- **开工前必须先解决前置冲突**：现行 `check-i18n.cjs` 要求 10 语言 key 完全对齐，而语言包的目的正是把非内置语言移出包体；当前 10 语言已全部打进包。内置保留几套、其余是否转包、门禁怎么改，都要先与维护者定。
- 加载器只认 manifest v1 + SHA-256；包内不允许任何可执行内容；下载失败不能影响当前语言/主题；缺失 key 回退链是 `requested locale → en-US → internal fallback`。
- Theme Pack 只允许 CSS 变量、theme token 与静态图片。

### 阶段 12：插件生态

- 注册表与客户端校验分两个 PR。
- 客户端按**固定版本**安装并校验 SHA-256，复用现成的下载与校验链路，不要新写下载器。
- 第一阶段只做更新提醒（changelog + 权限 diff），**不做自动更新**。
- CI 扫描清单照着守则第 17 节逐条落，别漏 zip slip / symlink / eval / 动态代码 / 未声明网络 / 自更新逻辑这些。

### 阶段 13：本机软件检测

- 阶段 1 稳定后再做，**每个平台单独一个 PR**。
- 检测结果只能是候选，必须由用户确认仓库匹配；**禁止仅凭软件名相似自动关联**。
- 这类实现天然涉及特权读取，注意不要扩大 Electron 权限边界，也不要为它新增插件能力。

---

## 10. Windows 上会咬人的几件事

- **locale 文件是 CRLF**。改 JSON 用行锚点插入（按行 splice），不要整文件 parse/stringify 回写。
- **编码可能已经被改坏**。历史上有一笔提交把 `。` 的末字节写成了 `0x3f`，让整个文件不是合法 UTF-8，严格解码器与部分工具链直接拒读。新增非 ASCII 文案后，提交前可以顺手做一次严格 UTF-8 校验：

  ```powershell
  $strict = New-Object System.Text.UTF8Encoding($false, $true)
  $strict.GetString([System.IO.File]::ReadAllBytes($path))   # 抛异常就是有问题
  ```

- **取 git 里的原始字节能用 PowerShell 重定向吗？不能**，`>` 会按文本重编码。要原字节用 `cmd /c "git cat-file blob <sha> > out.bin"`。
- **worktree + node_modules**：如果 worktree 里的 `node_modules` 是指向主目录的 junction，删 worktree 前先用 `cmd /c rmdir <path>\node_modules` 摘掉链接，**不要递归删**，否则会连带删掉真实目录。纯文档 worktree 没这个问题。
- **Vite 文件监视会在 EBUSY 上崩**：编辑器或工具在源码目录留下的临时目录被 watcher 抓到、Windows 又锁着文件时，dev server 会直接退出。重启即可，不是代码问题。
- **PowerShell 的几个坑**：`ConvertFrom-Json` 打印整个 UTF-8 locale 文件会乱码（别用它看词条）；`Select-String -Path a, b` 不接受多路径；`git grep -c "\"key\""` 的引号会炸，pattern 不要加引号。

---

## 11. 待决策清单

会卡住后续阶段的几件事，动手前先确认：

1. **新 i18n key 的 namespace**（`repositories` 还是 `app`），以及是否每次都补齐 10 种语言（现行门禁要求补齐）。
2. **Language Pack 与内置语言的取舍**——阶段 11 的前置，未决之前阶段 11 无法开工。
3. **新事实模型要不要进 MCP 与 AI 的暴露面**（My Apps、Trending 快照、Recently Viewed）——`server/tests/mcp/parity.test.ts` 会约束镜像实现，决定要改几处。
4. **fork 是否继续自行 bump 版本**（现状：PR 分支不带版本文件，fork main 自己发版）。
5. **Web 侧下载的公开/私有判据**——要不要给 `Repository` 加 `private` 字段，好让公开资产在浏览器里直开而不经过 blob。
