#!/usr/bin/env node
/**
 * 一次性脚本：为新迁移的组件补齐 i18n 字典条目。
 *
 * 为什么不用 JSON.parse + JSON.stringify 整体重写：这些字典文件的序列化风格
 * 与 JSON.stringify(obj, null, 2) 并不一致，整体重写会把整个文件重排成 diff 噪音。
 * 因此这里做定点文本插入：找到 section 起始行，紧跟着插入新键。
 *
 * 用法：node scripts/codemods/add-health-keys.mjs [--write]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WRITE = process.argv.includes('--write');
const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** [key, en, zh] */
const HEALTH_KEYS = [
  ['activity', 'Activity', '活跃度'],
  ['maintenance', 'Maintenance', '维护'],
  ['community', 'Community', '社区'],
  ['maturity', 'Maturity', '成熟度'],
  ['archived', 'Archived', '已归档'],
  ['disabled', 'Disabled', '已停用'],
  ['no-releases', 'No releases', '无 Release'],
  ['no-pushes-in-12-months', 'No pushes in 12 months', '近 12 个月无推送'],
  ['last-push', 'Last push', '最近推送'],
  ['latest-commit', 'Latest commit', '默认分支最近提交'],
  ['recent-commits', 'Recent commits', '近期提交数'],
  ['has-releases', 'Has releases', '是否存在 Release'],
  ['latest-release', 'Latest release', '最近 Release'],
  ['fork', 'Fork', 'Fork 仓库'],
  ['template', 'Template', '模板仓库'],
  ['license', 'License', 'License'],
  ['security-policy', 'Security policy', 'Security Policy'],
  ['ci-github-actions', 'CI / GitHub Actions', 'CI / GitHub Actions'],
  ['readme', 'README', 'README'],
  ['docs', 'Docs', '文档目录'],
  ['stars', 'Stars', 'Stars'],
  ['forks', 'Forks', 'Forks'],
  ['open-issues', 'Open issues', 'Open Issues'],
  ['closed-issues', 'Closed issues', 'Closed Issues'],
  ['contributors', 'Contributors', '贡献者'],
  ['created', 'Created', '创建时间'],
  ['repository-age', 'Repository age', '仓库年龄'],
  ['releases', 'Releases', 'Release 数量'],
  ['release-frequency', 'Release frequency', '发布频率'],
  ['latest-stable-version', 'Latest stable version', '最新稳定版本'],
];

const ASSET_KEYS = [
  ['confidence-high', 'High confidence', '高置信'],
  ['confidence-medium', 'Medium confidence', '中等置信'],
  ['confidence-low', 'Low confidence', '低置信'],
  ['installable-candidates', 'Installable candidates', '可安装候选'],
  ['platform-not-detected', 'Platform not detected', '未识别出平台'],
  ['detecting-architecture', 'Detecting architecture…', '正在识别架构…'],
];

/** 新增排序方式 created 的下拉文案（key 规则与既有 searchBar.sort-* 一致）。 */
const SEARCH_SORT_KEYS = [['sort-created', 'Sort by Created', '按创建时间排序']];

/** 在每个 section 起始行后插入 [key, value] 列表（保持文件的 4 空格缩进）。 */
function insertAfterSection(source, section, entries, indent = '    ') {
  const anchor = `"${section}": {`;
  const lines = source.split('\n');
  const index = lines.findIndex((line) => line.trim() === anchor);
  if (index === -1) throw new Error(`section not found: ${section}`);
  // 已存在则不重复插入
  const existing = new Set(
    lines.slice(index + 1).map((line) => (line.match(/^\s*"([^"]+)":/) ?? [])[1]).filter(Boolean),
  );
  const toAdd = entries.filter(([key]) => !existing.has(key));
  if (toAdd.length === 0) return { source, added: 0 };
  const inserted = toAdd.map(([key, value]) => `${indent}${JSON.stringify(key)}: ${JSON.stringify(value)},`);
  lines.splice(index + 1, 0, ...inserted);
  return { source: lines.join('\n'), added: inserted.length };
}

for (const language of ['en', 'zh']) {
  const valueIndex = language === 'en' ? 1 : 2;

  const repositoriesPath = path.join(rootDir, 'src', 'locales', language, 'repositories.json');
  const repositories = readFileSync(repositoriesPath, 'utf8');
  const health = insertAfterSection(
    repositories,
    'repositoryHealthPanel',
    HEALTH_KEYS.map((entry) => [entry[0], entry[valueIndex]]),
  );

  const appPath = path.join(rootDir, 'src', 'locales', language, 'app.json');
  const app = readFileSync(appPath, 'utf8');
  const assets = insertAfterSection(
    app,
    'installableAssetRecommendation',
    ASSET_KEYS.map((entry) => [entry[0], entry[valueIndex]]),
  );
  const sortKeys = insertAfterSection(
    assets.source,
    'searchBar',
    SEARCH_SORT_KEYS.map((entry) => [entry[0], entry[valueIndex]]),
  );

  console.log(
    `${language}: repositories.json +${health.added}, app.json +${assets.added} (+${sortKeys.added} sort)${WRITE ? ' (written)' : ' (dry-run)'}`,
  );
  if (WRITE) {
    writeFileSync(repositoriesPath, health.source);
    writeFileSync(appPath, sortKeys.source);
  }
}
