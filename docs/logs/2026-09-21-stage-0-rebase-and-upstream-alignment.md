# 阶段 0：还清在途分支欠账

日期：2026-09-21
对应规划：`docs/plans/2026-09-21-staged-implementation-plan.md` 阶段 0
前序：`docs/reports/2026-09-21-feature-coverage-audit.md`

## 这一阶段做了什么

不写新功能，先把三笔欠账清掉，让后面每个阶段都能从干净、最新的上游基线切分支。

### 0a 资产识别分支 rebase + 补齐 8 语言

`pr/installable-asset-detection` 原来挂在 `217c134`，落后上游 16 个提交，而且 13 个 i18n key 只补了 zh/en，直接撞 10 语言 parity 门禁。

- rebase 到 `a8d4b7c`：唯一冲突在 `src/components/RepositoryReleaseSheet.tsx`。冲突原因是两条线各自改了这个文件——上游加了 health 面板与 `formatFileSize` 本地实现，分支把 `formatFileSize` 抽到了 `src/utils/formatBytes.ts` 并把资产面板挂进来。解法是两边都要：保留两个 import 与两处挂载，删掉上游那份本地 `formatFileSize`（分支已改为从 `formatBytes.ts` 引入）。
- 8 种语言补齐 13 个 key（ja/es/pt-BR/ru/zh-TW/fr/de/ko），全部落在 `app.json` 的 `installableAssetRecommendation` 段。该段在 en 里是文件末尾段，插入时要注意两处 JSON 逗号：段内最后一个 key 不能带尾逗号，插到末尾时段尾的 `}` 也不能带逗号——这两处各踩了一次，脚本里已改成按段渲染、按位置决定逗号。
- 结果：`ec3cf11` → amend 后 `20a6723`，19 个文件 +1619/−9，已强制推送到 fork（远程原值 `c9bed8e`，用 `--force-with-lease` 显式锁）。

### 0b 批量提取分支 rebase

`pr/batch-repository-url-extraction` 同样从 `217c134` 切出，纯逻辑无 i18n，rebase 到 `a8d4b7c` 零冲突，变成 `ac45983`，已强制推送。自带的 71 例测试、typecheck、lint、三个门禁脚本全绿。

### 0d fork main 对齐上游

fork main 落后上游 16 个提交，本地跑不到上游最新代码。合并后冲突只有 8 个文件，全在 health/asset 重叠区：这些文件的 fork 版本是我们自己的 health 实现，上游那版是同一份实现被复审、修过之后合并进 #382 的，所以**一律取上游**。

其余 fork 专属内容保留：

- 在途功能的代码（asset 检测与批量提取的 utils/types）与它们的新文案
- 8 种语言的 asset 文案从 0a 的分支取过来，保证 fork main 自己也能过 parity 门禁
- `RepositoryReleaseSheet` 里把 `InstallableAssetRecommendation` 挂回去（上游版没有它，否则 fork 构建看不到这个面板）
- `versions/version-info.xml` 里 fork 的 0.9.0 条目与上游条目并存
- 版本保持 fork 的 0.9.0，并用 `npm run sync-version` 把 lockfile 同步齐

合并提交：`6356cce`。

## 验证

- 0a：`check:boundaries`、`check:i18n`、`check:pr-release-files`、`typecheck`、`lint`、`git diff --check` 全过；全量 vitest 1125 通过，只有 `RepositoryCard.lazyReadme` 在并行满载下超时（单独跑 2/2 通过，属既有 flake）；electron 32、插件 91、CI 门禁 21、版本脚本 10 全通过；`build` 通过且 bundle 预算内。
- 0b：自带 71 例 + typecheck + lint + 三个门禁脚本通过。
- 0d：`check:boundaries`、`check:i18n`、`typecheck`、`lint` 通过；资产与导入相关 5 个测试文件 128 例通过。

## 顺带发现

- `b80ab11`（CodeRabbit 修复）里对 asset/import 的修正已经在两个 PR 分支里了（blob 哈希与 fork main 一致），不需要再补。
- 两个 PR 分支的 i18n 与门禁欠账至此清零，可以对着当前上游 main 直接开 PR。

## 下一步

按规划进入阶段 1（My Apps 基础）。规划里标为可与阶段 1 并行的小阶段（Recently Viewed、Omni Search）没有依赖，先做掉它们更划算。
