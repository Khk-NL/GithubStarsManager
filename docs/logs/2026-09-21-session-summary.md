# 会话汇总：2026-09-21 自主开发（阶段 0 / 5 / 9b / 9a / 10a）

按用户要求"依据 development-guide.md 执行开发，每阶段独立分支、写日志、提交"，本次共完成
5 个阶段、产出 6 个 PR 分支（含此前的 `pr/stream-release-downloads`），fork main 从 0.9.0
推进到 **0.9.5**。

## 交付的分支（都基于当前上游 main `a8d4b7c`，1 个提交，可单独开 PR）

| 分支 | 内容 | 规模 | 提交 |
|---|---|---|---|
| `pr/installable-asset-detection` | 可安装资产识别（rebase + 补齐 8 语言） | 19 文件 +1619/−9 | `20a6723` |
| `pr/batch-repository-url-extraction` | 批量导入的提取与归一化（rebase） | 3 文件 +858 | `ac45983` |
| `pr/recently-viewed` | 最近浏览（§9）+ Discovery 隐藏已浏览 | 52 文件 +759/−31 | 阶段 5 |
| `pr/clipboard-github-links` | 剪贴板 GitHub 链接识别（§11） | 37 文件 +682/−14 | `9ddc584` |
| `pr/deep-links` | Deep Link（§12） | 11 文件 +566/−2 | `5852c6e` |
| `pr/theme-tokens` | Theme Token：强调色/圆角/字号/动效（§14） | 25 文件 +616/−13 | `1cf2791` |

另有更早的 `pr/stream-release-downloads`（桌面端 release 资产流式落盘 + 进度 + 取消）。

每个分支的 PR 正文都在工作区根目录的 `PR-<slug>.md`，含标题、一键创建链接与验证清单。
**没有自动创建任何 PR**（按用户要求只推送分支 + 生成 md）。

## 每个阶段的固定动作都做了

- 写 `docs/logs/2026-09-21-stage-*.md`（阶段 0、5、9b、9a、10a 各一份）。
- 在 fork main 上 bump 版本（0.9.1 → 0.9.5）并同步 lockfile 与 `versions/version-info.xml`。
- 八项本地门禁（boundaries / i18n / pr-release-files / lint / typecheck / test:run / build /
  diff --check）在每个分支和每次合并后都跑过。
- 合并进 main 时手工解决 store 管线冲突（并集 + 拆开 migrate 块 + 版本号只提一次）。

## 全量验证（main @ 0.9.5）

- vitest 1256 通过；唯一失败是 `RepositoryCard.lazyReadme` 并行满载下的既有超时 flake，
  单独跑 2/2 通过。
- electron 核心 35、插件 91、CI 门禁 21、update-version 10 全通过。
- `build` 通过，主包 1053.65 KiB（预算 3000 KiB）。
- `v0.9.5` 已打 tag 并推送，触发 fork 的桌面构建发布。

## 顺带解决的问题

- 上游 `src/components/RepositoryReleaseSheet.test.tsx` 不是合法 UTF-8（`19e63e9`，也就是我们
  自己那个 health PR 引入的），修复随 `pr/stream-release-downloads` 一起提。
- `pr/installable-asset-detection` 与 `pr/batch-repository-url-extraction` 原先挂在 `217c134`，
  已 rebase 到 `a8d4b7c`；前者补齐了缺的 8 种语言。

## 下一步（按规划顺序）

1. **阶段 1 My Apps**（关键路径起点，§3）：§4 更新检测、§5 版本选择器、§6 预览里的
   "已在 My Apps"、§15 的 Updates widget 都挂在它上面。
2. 阶段 6 Omni Search（§10）：建议等 `pr/recently-viewed` 合并后再做，因为空态要用它。
3. 阶段 8 平台感知 Discovery（§8）：依赖资产识别分支先合并。
4. 阶段 10a 的剩余部分：UI Density、Card spacing、仓库卡片可见字段（本次刻意留出）。
5. 阶段 11 数据包加载器：**前置阻塞未解**——现行 `check-i18n.cjs` 要求 10 语言齐全，
   与"把非内置语言做成下载包"方向相反，需要先与维护者达成一致。

## 待与维护者对齐

见 `docs/development-guide.md` 第 11 节（i18n key 归属、Language Pack 取舍、新事实模型是否
进 MCP/AI 暴露面、fork 版本策略、Web 侧下载的公开/私有判据）。
