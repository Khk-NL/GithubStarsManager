# 会话汇总：2026-09-21 自主开发（阶段 0 / 5 / 9b / 9a / 10a / 1a / 7a + 注册表提案）

按用户要求"依据 development-guide.md 执行开发，每阶段独立分支、写日志、提交"，本次共完成
**8 个阶段**、产出 **9 个分支**（含此前的 `pr/stream-release-downloads`），fork main 从 0.9.0
推进到 **0.9.7**。

## 交付的分支（都基于当前上游 main `a8d4b7c`，1 个提交，可单独开 PR）

| 分支 | 内容 | 规模 | 提交 |
|---|---|---|---|
| `pr/installable-asset-detection` | 可安装资产识别（rebase + 补齐 8 语言） | 19 文件 +1619/−9 | `20a6723` |
| `pr/batch-repository-url-extraction` | 批量导入的提取与归一化（rebase） | 3 文件 +858 | `ac45983` |
| `pr/recently-viewed` | 最近浏览（§9）+ Discovery 隐藏已浏览 | 52 文件 +759/−31 | 阶段 5 |
| `pr/clipboard-github-links` | 剪贴板 GitHub 链接识别（§11） | 37 文件 +682/−14 | `9ddc584` |
| `pr/deep-links` | Deep Link（§12） | 11 文件 +566/−2 | `5852c6e` |
| `pr/theme-tokens` | Theme Token：强调色/圆角/字号/动效（§14） | 25 文件 +616/−13 | `72e59c8` |
| `pr/my-apps-linking` | My Apps 手动关联（§3） | 35 文件 +3066/−8 | `6119358` |
| `pr/trending-snapshots` | Trending 快照与榜单历史（§7） | 26 文件 +987/−2 | `5cd18c3` |
| `pr/community-plugin-registry` | 社区插件注册表提案 + 骨架（§17/§18） | 6 文件 +267 | `a583d78` |

另有更早的 `pr/stream-release-downloads`（桌面端 release 资产流式落盘 + 进度 + 取消）。

每个分支的 PR 正文都在工作区根目录的 `PR-<slug>.md`，含标题、一键创建链接与验证清单。
**没有自动创建任何 PR**（按用户要求只推送分支 + 生成 md）。

## 每个阶段的固定动作都做了

- 写 `docs/logs/2026-09-21-stage-*.md`（阶段 0、5、9b、9a、10a、1a、7a 各一份）。
- 在 fork main 上 bump 版本（0.9.1 → 0.9.7）并同步 lockfile 与 `versions/version-info.xml`。
- 八项本地门禁（boundaries / i18n / pr-release-files / lint / typecheck / test:run / build /
  diff --check）在每个分支和每次合并后都跑过。
- 合并进 main 时手工解决 store 管线冲突（并集 + 拆开 migrate 块 + 版本号只提一次）。


## 全量验证（main @ 0.9.5）

- vitest **1327 通过**；唯一失败是 `RepositoryCard.lazyReadme` 并行满载下的既有超时 flake，
  单独跑 2/2 通过。
- electron 核心 32、插件 91、CI 门禁 21 全通过。
- `build` 通过，主包 1064.30 KiB（预算 3000 KiB）。
- `v0.9.5` 已打 tag 并推送，触发 fork 的桌面构建发布（本次工作副本停在 0.9.7）。

## 顺带解决的问题

- 上游 `src/components/RepositoryReleaseSheet.test.tsx` 不是合法 UTF-8（`19e63e9`，也就是我们
  自己那个 health PR 引入的），修复随 `pr/stream-release-downloads` 一起提。
- `pr/installable-asset-detection` 与 `pr/batch-repository-url-extraction` 原先挂在 `217c134`，
  已 rebase 到 `a8d4b7c`；前者补齐了缺的 8 种语言。
- 两处 zh-TW 与简体同形被 i18n 门禁拦下（`小/中/大`、`上升/下降`），改成台湾用词
  （`小號/中號/大號`、`爬升/下滑`），修正同步回了对应分支。
- **流程坑**：`check-i18n.cjs` 读的是 HEAD 的提交内容而不是工作区，未提交时跑门禁会假通过。
  已写进 `docs/development-guide.md` 第 5.3 节。

## 下一步（按规划顺序）

1. **阶段 2 更新检测**（§4）：直接建在 `pr/my-apps-linking` 上，installedVersion 与
   `includePrereleases` 已就位；需要新增可关闭的后台检查、频率配置与通知。
2. **阶段 3 Release 版本选择器**（§5）：按平台过滤旧版资产依赖 `pr/installable-asset-detection`，
   标记 installed version 依赖 My Apps。
3. **阶段 6 Omni Search**（§10）：等 `pr/recently-viewed` 合并（空态要用它）。
4. **阶段 4 批量导入工作台**（§6 收尾）：依赖资产识别 + My Apps。
5. **阶段 8 平台感知 Discovery**（§8）：依赖资产识别分支先合并。
6. **阶段 7b Trending 筛选**（§7 下半）：依赖资产识别 + 最近浏览。
7. **阶段 10a 剩余**：UI Density、Card spacing、仓库卡片可见字段——这三项要改大量组件内部的
   间距与字段渲染，不适合塞进已有 PR，建议单独一刀。
8. **阶段 12b 插件注册表客户端**：按固定版本安装 + SHA-256 校验 + 撤销处理，接在
   `pr/community-plugin-registry` 的契约之后。
9. **阶段 11 数据包加载器**：**前置阻塞未解**——现行 `check-i18n.cjs` 要求 10 语言齐全，
   与"把非内置语言做成下载包"方向相反，需要先与维护者达成一致。

## 合并进 main 时的固定套路（下次照做，能省时间）

多阶段并行推进时，`src/store/**` 的类型、schema、initialState、持久化选项、normalization 与
modularization 测试几乎必然冲突，且 `src/types/index.ts`、`DiscoveryView.tsx` 这类"两边都往
同一处加东西"的文件也会冲突。可靠做法：

1. 冲突文件先用"两边都保留"的并集脚本过一遍（脚本模板见会话记录，逻辑就是把 `<<<<<<<`/`=======`/
   `>>>>>>>` 之间的两段按 ours→theirs 顺序拼起来）；
2. 然后人工检查并集必然出错的四类地方：**持久化 version 只留一行并 +1**、**migrate 块的 `if`
   收尾是否被吞**、**modularization 的 version 断言是否重复**、**JSX 子节点是否被塞进错误的
   表达式**；
3. 合并后用 `--base a8d4b7c` 重跑 i18n 门禁（读提交内容），全量测试与 build。


## 待与维护者对齐

见 `docs/development-guide.md` 第 11 节（i18n key 归属、Language Pack 取舍、新事实模型是否
进 MCP/AI 暴露面、fork 版本策略、Web 侧下载的公开/私有判据）。
