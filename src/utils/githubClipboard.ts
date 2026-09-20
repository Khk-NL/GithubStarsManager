/**
 * 剪贴板里的 GitHub 链接识别（开发守则 §11）。
 *
 * 只做本地解析：非 GitHub 内容立即返回 null，调用方不得保存原始剪贴板文本。
 * 解析结果里带 `fullName` / `tag` / `login` 与规范化后的 `url`，供界面展示与打开。
 */

export type GitHubClipboardTargetKind = 'repository' | 'release' | 'developer';

export interface GitHubClipboardTarget {
  kind: GitHubClipboardTargetKind;
  /** 仓库类目标（kind 为 repository / release 时存在）。 */
  owner?: string;
  name?: string;
  /** kind 为 release 时存在。 */
  tag?: string;
  /** kind 为 developer 时存在。 */
  login?: string;
  /** 规范化后的 github.com 链接。 */
  url: string;
  /** 展示用标识：`owner/repo`、`owner/repo@tag` 或 `@login`。 */
  label: string;
}

const ALLOWED_HOSTS = new Set(['github.com', 'www.github.com']);

/** github.com 上被保留的一级路径，不可能是用户名。 */
const RESERVED_ROOTS = new Set([
  'about', 'account', 'apps', 'collections', 'contact', 'customer-stories', 'dashboard',
  'events', 'explore', 'features', 'issues', 'join', 'login', 'logout', 'marketplace',
  'new', 'notifications', 'orgs', 'pricing', 'pulls', 'search', 'security', 'settings',
  'signup', 'site', 'sponsors', 'topics', 'trending', 'watching',
]);

/** 仓库名与用户名允许的字符：GitHub 的实际规则比这更严，这里只做保守放行。 */
const SEGMENT_RE = /^[A-Za-z0-9._-]+$/;

/** 去掉结尾的 `.git`、多余斜杠与查询串/锚点带来的噪声。 */
const normalizeSegments = (pathname: string): string[] => pathname
  .split('/')
  .map((segment) => segment.trim())
  .filter(Boolean);

export const parseGitHubClipboardTarget = (text: string | null | undefined): GitHubClipboardTarget | null => {
  if (typeof text !== 'string') return null;
  // 剪贴板里常常是一整段话，取其中第一个 URL 即可；非 URL 文本直接放弃。
  const match = text.match(/https?:\/\/[^\s<>"'`]+/i);
  if (!match) return null;

  let parsed: URL;
  try {
    parsed = new URL(match[0]);
  } catch {
    return null;
  }
  // 非 GitHub 内容立即丢弃，不做任何留存。
  if (!ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) return null;

  const segments = normalizeSegments(parsed.pathname);
  if (segments.length === 0) return null;

  const [owner, name] = segments;
  if (!SEGMENT_RE.test(owner) || owner.startsWith('.') || owner.endsWith('.')) return null;

  if (segments.length === 1) {
    if (RESERVED_ROOTS.has(owner.toLowerCase())) return null;
    return { kind: 'developer', login: owner, url: `https://github.com/${owner}`, label: `@${owner}` };
  }

  if (!SEGMENT_RE.test(name) || name === '.git' || name === '..') return null;
  const repository = `${owner}/${name}`;
  const repositoryUrl = `https://github.com/${repository}`;

  if (segments[2] === 'releases' && segments[3] === 'tag' && segments[4]) {
    const tag = decodeURIComponent(segments[4]);
    if (!tag) return null;
    return {
      kind: 'release',
      owner,
      name,
      tag,
      url: `${repositoryUrl}/releases/tag/${encodeURIComponent(tag)}`,
      label: `${repository}@${tag}`,
    };
  }

  // 仓库内的其它路径（issues / tree / blob / pull…）一律归到所属仓库，与批量导入的口径一致。
  return { kind: 'repository', owner, name, url: repositoryUrl, label: repository };
};
