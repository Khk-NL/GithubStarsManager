/**
 * Deep Link 解析与校验（开发守则 §12）。
 *
 * 支持：
 *   githubstarsmanager://repo/owner/name
 *   githubstarsmanager://release/owner/name/tag
 *   githubstarsmanager://developer/login
 *   githubstarsmanager://plugins/plugin-id
 *
 * 所有参数在这里重新校验，不信任来源：仓库名/用户名只允许 GitHub 实际会用到的字符，
 * 开发者主页里被保留的一级路径（settings、marketplace…）一律拒绝，插件 id 只允许
 * 反向域名风格。解析只产出"目标"，任何有副作用的动作都不在这里发生。
 */

export type DeepLinkTarget =
  | { kind: 'repository'; owner: string; name: string; url: string }
  | { kind: 'release'; owner: string; name: string; tag: string; url: string }
  | { kind: 'developer'; login: string; url: string }
  | { kind: 'plugin'; pluginId: string };

export const DEEP_LINK_PROTOCOL = 'githubstarsmanager:';
const DEEP_LINK_PREFIX = 'githubstarsmanager://';

const SEGMENT_RE = /^[A-Za-z0-9._-]+$/;
const PLUGIN_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{1,126}[A-Za-z0-9]$/;
const TAG_RE = /^[^\\\s]+$/;

/** github.com 上被保留的一级路径，不可能是用户名。 */
const RESERVED_ROOTS = new Set([
  'about', 'account', 'apps', 'collections', 'contact', 'customer-stories', 'dashboard',
  'events', 'explore', 'features', 'issues', 'join', 'login', 'logout', 'marketplace',
  'new', 'notifications', 'orgs', 'pricing', 'pulls', 'search', 'security', 'settings',
  'signup', 'site', 'sponsors', 'topics', 'trending', 'watching',
]);

const isRepositorySegment = (value: string): boolean => (
  SEGMENT_RE.test(value) && !value.startsWith('.') && !value.endsWith('.')
);

export const parseDeepLink = (value: unknown): DeepLinkTarget | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.slice(0, DEEP_LINK_PREFIX.length).toLowerCase() !== DEEP_LINK_PREFIX) return null;

  const rest = trimmed.slice(DEEP_LINK_PREFIX.length);
  if (!rest.replace(/^\/+/, '').trim()) return null;

  // `githubstarsmanager://repo/owner/name` 会被解析成 host=repo、path=/owner/name，
  // `githubstarsmanager:///repo/...` 则是 host 为空，两种写法都要能吃下。
  // 先解码再校验，避免用 %20 / %2e%2e 绕过下面的字符规则
  const decode = (segment: string): string => {
    try {
      return decodeURIComponent(segment).trim();
    } catch {
      return segment.trim();
    }
  };
  const segments = rest
    .split(/[/?#]/)
    .map(decode)
    .filter(Boolean);
  if (segments.length === 0) return null;

  const [kind, ...args] = segments;

  switch (kind.toLowerCase()) {
    case 'repo': {
      const [owner, name, ...extra] = args;
      if (extra.length > 0 || !owner || !name) return null;
      if (!isRepositorySegment(owner) || !isRepositorySegment(name)) return null;
      return { kind: 'repository', owner, name, url: `https://github.com/${owner}/${name}` };
    }
    case 'release': {
      const [owner, name, ...tagParts] = args;
      if (!owner || !name || tagParts.length === 0) return null;
      if (!isRepositorySegment(owner) || !isRepositorySegment(name)) return null;
      // tag 里可能有斜杠（如 release/1.0），只校验整体不含反斜杠与空白
      const tag = tagParts.join('/');
      if (!TAG_RE.test(tag)) return null;
      return {
        kind: 'release',
        owner,
        name,
        tag,
        url: `https://github.com/${owner}/${name}/releases/tag/${encodeURIComponent(tag)}`,
      };
    }    case 'developer': {
      const [login, ...extra] = args;
      if (extra.length > 0 || !login) return null;
      if (!isRepositorySegment(login) || RESERVED_ROOTS.has(login.toLowerCase())) return null;
      return { kind: 'developer', login, url: `https://github.com/${login}` };
    }
    case 'plugins': {
      const [pluginId, ...extra] = args;
      if (extra.length > 0 || !pluginId) return null;
      if (!PLUGIN_ID_RE.test(pluginId)) return null;
      return { kind: 'plugin', pluginId };
    }
    default:
      return null;
  }
};
