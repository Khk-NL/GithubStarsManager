# 阶段 12b-1：插件注册表客户端（只读对照）

日期：2026-09-21
对应规划：`docs/plans/2026-09-21-staged-implementation-plan.md` 阶段 12
分支：`pr/plugin-registry-client`（base `a8d4b7c`，1 个提交，22 文件 +1149/−11）

## 做了什么

把 `pr/community-plugin-registry` 定下的契约接到客户端，先做**只读对照**那一半：每个已安装插件相对社区注册表是"有新版本 / 已是最新 / 已被撤销 / 已被拉黑 / 不在注册表中"，以及新版本会多要哪些权限。

### 校验（`electron/plugins/pluginRegistrySchema.js`）

逐条校验注册表记录：`id` 形状、语义化版本、`apiVersion` 是否受支持、`source`/`releaseUrl` 必须是 github.com 的 https 地址、`sha256` 必须是小写十六进制、权限必须落在已知枚举里、`networkTargets` 是主机名、`dataUsage` 至少一句话、`review` 必须是 approved 且带日期与提交。

**一条坏记录不拖垮整个列表**：坏的进 `rejected` 并带原因码，好的照常返回——注册表是网络来的数据，一条脏记录不该让整个功能不可用。

### 读取（`electron/plugins/pluginRegistryFeed.js`）

取 `community-plugins.json` 与 `removed-plugins.json` 两个固定路径，逐条校验、按 id 分组、组内按语义化版本降序。带 4 MiB 体积上限；两个文件只取到一个时返回**部分结果**并把失败原因带上（"没有撤销表"不该让更新检查也失效）。主进程通过 `net.fetch` 取，绕开渲染进程 CORS；preload 只暴露只读的 `registry.load()`。

### 判断（`src/utils/pluginRegistryStatus.ts`）

- **撤销/拉黑优先于更新判断**，而且只影响被点名的版本：`versions: []` 表示该插件的所有版本，列了具体版本就只判那些（装的是 1.3.0、撤销表只写 1.0.0，就不该被牵连）。
- 更新取**客户端支持的最高版本**，不是注册表里的最新版本——注册表可能出现要求新 API 的条目。
- 权限差异算的是目标版本相对"当前已授予"**多出来的**那部分：那正是需要重新征求用户同意的部分。
- 注册表缺失或插件不在表里时回落 `not-in-registry`，不猜。

### 界面（`src/components/settings/PluginRegistrySection.tsx`）

设置面板的插件页顶部一块只读对照：状态、新版本号、新增权限、撤销原因。**不下载、不安装、不自动停用**；撤销/拉黑只给一个由用户点的「立即停用」。独立成组件是必要的：宿主面板在插件系统不可用时有一次早返回，hooks 放在宿主里会被规则检查判为条件调用。

10 个新 key，十种语言一次补齐。

## 验证

- 八项门禁全过（i18n 提交后复验）。全量 vitest 1085 通过，唯一失败是 `RepositoryCard.lazyReadme` 的既有超时 flake（单独跑 2/2 通过）；electron 插件测试 **100 通过**（新增 9）、mcp 32、boundaries 通过；`build` 通过，主包 1042.19 KiB。
- 新增 22 例：注册表校验与读取 9（好记录接受、十类坏记录各自的原因码、只丢坏的、版本排序含预发布、分组、半可用、整体失败、超限）、状态判断 9（更新+权限新增、最新、撤销/拉黑优先且不牵连其它版本、空版本数组=全量、不在表里、无注册表回落）、区块组件 4（无桌面桥不渲染、更新提示与权限、撤销提示与手动停用、加载失败可见）。
- 合并进 main 后复跑相关测试全通过。

## 没做：安装那一半

`feat: install a fixed plugin version from the registry` 需要：

1. 下载固定 `releaseUrl` → 校验 `sha256`（`sha256File` 流式实现）；
2. **解包**（zip）——仓库现有依赖里没有解压库，要么自己写一个严格的最小实现（必须连带 zip slip 与 symlink 防护），要么加一个运行时依赖（要考虑 electron-builder 的打包与体积）；
3. 复用现有 `pluginManager.installFromDirectory`（临时目录装完即删），以及"权限增加时重新确认"的既有机制。

我把它单独留出来，是因为这三步里 2 有真实的攻击面，值得一个能专心评审的 PR。

## 合并时踩到的坑（值得记住）

用"取 main 的 locales + 重跑插入脚本"来解 locale 冲突时，**插入脚本里的译文必须与分支上已经修正过的版本一致**。这一轮就因为脚本里还是修正前的 `描述`，把上一阶段过门禁时改好的 zh-TW 措辞悄悄退回去了。同类问题还有三处（`有新版本`、`已是最新`、`立即停用` 与简体同形），已在 main 与分支两侧一并修正，并对**全部 11 个分支**的提交后状态做了一遍 i18n 门禁复核，确认都干净。
