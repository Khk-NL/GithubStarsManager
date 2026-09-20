# 阶段 10a-2：仓库卡片可见字段（开发守则 §14）

日期：2026-09-21
对应规划：`docs/plans/2026-09-21-staged-implementation-plan.md` 阶段 10a（第二刀）
分支：`pr/repository-card-fields`（base `a8d4b7c`，1 个提交，24 文件 +301/−16）

## 做了什么

让用户决定仓库列表里每张卡片显示哪些字段：描述、标签、语言、star 数、许可证、最近推送时间，六项独立开关。

### 数据与收敛

`src/types/repositoryCardFields.ts` + `src/utils/repositoryCardFields.ts`：

- **默认全开**——升级上来的用户看到的卡片不该变。
- `normalizeRepositoryCardFields` 只认布尔值：缺失、非布尔、未知字段一律忽略并回落默认。这条规则同时覆盖旧快照、手改的 localStorage 和**以后新增的字段**，所以再加字段不需要写新的迁移。
- `isRepositoryCardFieldVisible` 对"没有开关表"的情况返回默认（显示），这样 RepositoryCard 的其它调用方（以及大量既有测试）完全不受影响。

### 商店

`repositoryCardFields` 进唯一持久化 Store，版本 16 → 17。action 是局部更新 `setRepositoryCardField(id, visible)`，内部合并当前值再收敛。normalizer 与 migrate 共用同一份逻辑。

### 渲染

`RepositoryCard` 的六处字段各自按开关决定是否输出。**只包字段本身**：卡片的骨架、交互与无障碍属性不动，所以布局不会因为隐藏某个字段而塌掉（每处都是可选字段，原本就有"没有就不渲染"的分支）。

### 设置面板

「外观」卡片新增「仓库卡片显示字段」一节，六个开关，附一句"只影响列表里每张卡片显示什么，不改动数据本身"。

8 个新 key，十种语言一次补齐。

## 验证

- 八项门禁全过（i18n 提交后复验）。全量 vitest 1078 通过，唯一失败是 `RepositoryCard.lazyReadme` 的既有超时 flake（单独跑 2/2 通过）；electron 32 全过；`build` 通过，主包 1042.94 KiB。
- 新增用例 6 例：纯函数 5（脏输入回落、逐字段只认布尔、未知字段被丢弃、幂等、缺表按默认）+ 卡片行为 1（关掉描述/语言/许可证后这几项不渲染，仍开着的 star 照常显示）。
- 合并进 main 后全量 1333 通过，build 通过（主包 1065 KiB）。

## 说明

守则 §14 里还剩两项没做：**UI Density** 与 **Card spacing**。这两项要改的是组件内部的间距刻度，而现有组件用的是 Tailwind 固定间距类，做"到位"意味着逐个组件换成语义间距变量——那是一次跨几十个文件的改造，塞进这个 PR 会让评审无法聚焦。建议作为独立一刀，并且先定一个语义间距刻度（例如 `--ui-space-1..4` 与密度三档的映射），再批量替换。

## 合并维护记录

合并进 main 时并集策略在四处失效，均手工修正：持久化版本号与迁移注释、设置面板两节的 JSX 嵌套、重复的 `Switch` import、modularization 冻结 key 的顺序。**结论：`src/store/**` 与设置面板这类"多阶段都在同一处追加"的文件，并集脚本只能当第一遍，必须逐处人工确认。**
