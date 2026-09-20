# 阶段 1a：My Apps 手动关联（开发守则 §3）

日期：2026-09-21
对应规划：`docs/plans/2026-09-21-staged-implementation-plan.md` 阶段 1
分支：`pr/my-apps-linking`（base `a8d4b7c`，1 个提交，35 文件 +3066/−8）

## 做了什么

用户主动把"已安装的软件"和本地已收藏的仓库关联起来，记录当前装的是哪个版本。**这一版只做手动关联**：不扫描本机、不安装、不更新、不卸载任何东西。

### 模型与纯函数

`src/types/linkedApplication.ts` + `src/utils/linkedApplications.ts`：

- 逐条规范化：非法枚举回落到 `unknown`/`manual`、时间戳解析不出来就置空、`installedVersion` 只接受非空字符串（否则 null）。
- 按 `repositoryFullName` 小写去重，避免同一个仓库出现两条记录。
- **版本比较与更新状态**：解析 `v1.2.3`、`1.2.3`、带预发布后缀的标签；算不出来的返回 `unknown` 而不是抛错；`includePrereleases` 关闭时预发布不参与比较（没有可比版本 → `unknown`）。
- **默认只跟踪稳定版**。把 beta 当"有新版本"会让更新提示整体失去可信度，所以新建记录与旧快照迁移都回落到 `includePrereleases: false`，想跟预发布的用户单独打开开关。

### 商店

`linkedApplications` 进唯一的持久化 Store，版本 16 → 17。normalizer 与 migrate 走同一份 `normalizeLinkedApplications`：旧快照回落空数组，脏记录（非法枚举、时间戳、非字符串版本）在迁移时就被丢弃，不会带进内存。

### 界面与边界

- **入口是 header 里可独立访问的 `apps` 视图**，不是藏在设置里；菜单管理面板同步登记（默认可见、允许隐藏，与其它功能视图一致）。
- 视图 = 列表 + 详情 + 手动关联对话框。View 层只渲染与转发意图，Store 读写与 Release 查询都在 `src/features/apps/hooks/**`。
- 详情展示：Repository 来源、已安装版本（可编辑，**留空表示"未记录"而不是空字符串**）、平台/架构、关联时间、最近查询、最新稳定 Release 与 changelog、该版本的资产名。
- 查询最新 Release 复用既有能力：按 `routeMode` 走 `backendAdapter` 或 `githubApi`，失败显示"加载失败"而不是静默留空。
- **解除关联有二次确认**，确认文案写明"只会删除这条本地记录。已安装的软件和文件都留在你的电脑上。"
- 界面顶部固定一句说明：这份列表只保存在本机，关联不会安装、更新或卸载任何东西。
- 56 个新 key，十种语言一次补齐。

### 明确没做

自动安装/静默更新/通用卸载/降级、本机软件扫描（§19）、后台更新检测（阶段 2）、任何新的 Electron 权限或插件能力。

## 验证

- 八项门禁：`check:boundaries`、`check:i18n`、`check:pr-release-files`、`lint`、`typecheck`、`test:run`、`build`、`git diff --check` 全过。
- 全量 vitest 1124 通过，唯一失败是 `RepositoryCard.lazyReadme` 的既有超时 flake（单独跑 2/2 通过）。electron 核心 32、插件 91、CI 门禁 21 全通过。`build` 通过，主包 1048 KiB。
- 新增用例 59 例：纯函数 28（URL/枚举/时间戳规范化、去重、版本比较含预发布与不可解析）、store 切片 7（含迁移幂等）、feature hook 6、My Apps 视图 4、详情组件 6、modularization 迁移 5（含旧快照回填与幂等）。
- 组件测试断言的是行为：状态徽章文案、留空版本保存为 null、预发布开关、解除关联必须确认（拒绝确认时记录保留）。

## 过程中修掉的两个真问题

1. **`includePrereleases` 默认值反了**：实现里写成 `!== false`（即缺字段默认**开启**），与"默认只跟稳定版"的预期相反，也与对话框的默认值不一致。改成 `=== true`，并把两处断言（纯函数与迁移测试）一并校正。
2. **`check-i18n.cjs` 读的是提交内容，不是工作区**。分支上"未提交时"跑门禁会假通过——上一阶段（theme token）的 zh-TW 圆角文案写成「小 / 中 / 大」，与简体同形，被判为照抄简体，直到这一次合并后重跑才暴露。已把 `pr/theme-tokens` 改成「小號 / 中號 / 大號」并强制推送，同时把"提交后再跑门禁"写进开发说明。
   另外顺手用提交后状态复验了全部六个已推分支的 i18n 门禁，都干净。

## 下一步

- 阶段 2（更新检测）直接建在这一版上：installedVersion 与 `includePrereleases` 已经就位，需要新增的是可关闭的后台检查与频率配置。
- 阶段 5（Release 版本选择器）要的"标记当前 installed version"也有了数据源。
