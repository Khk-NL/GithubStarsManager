import type { Repository } from '../types';
import type { RecentlyViewedEntry } from '../types/recentlyViewed';

/** 最多保留多少条最近浏览。 */
export const MAX_RECENTLY_VIEWED = 30;

/** 超过这个天数的记录在写入时顺手清掉，避免历史无限增长。 */
export const RECENTLY_VIEWED_MAX_AGE_DAYS = 90;

const MAX_AGE_MS = RECENTLY_VIEWED_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

/** 时间戳解析不出来的记录也清掉，避免脏数据永久占位。 */
const isFresh = (entry: RecentlyViewedEntry, now: number): boolean => {
  const viewedAt = Date.parse(entry?.viewedAt ?? '');
  if (!Number.isFinite(viewedAt)) return false;
  return now - viewedAt <= MAX_AGE_MS;
};

/** 去掉超期与时间戳非法的记录。 */
export const pruneRecentlyViewed = (
  entries: RecentlyViewedEntry[],
  now: number = Date.now(),
): RecentlyViewedEntry[] => entries.filter((entry) => isFresh(entry, now));

/**
 * 把一次浏览放到列表最前。
 *
 * 同一仓库重复浏览只保留最新一条（按 id 去重，重命名后 id 不变）；
 * 结果先裁剪再截断，保证列表长度不超过上限。
 */
export const recordRecentlyViewed = (
  entries: RecentlyViewedEntry[],
  repository: Repository,
  now: number = Date.now(),
): RecentlyViewedEntry[] => {
  const rest = pruneRecentlyViewed(entries, now)
    .filter((entry) => entry.repository?.id !== repository.id);
  return [{ repository, viewedAt: new Date(now).toISOString() }, ...rest].slice(0, MAX_RECENTLY_VIEWED);
};

/** 浏览过的仓库 id 集合，供 Discovery 的 Hide Seen 过滤使用。 */
export const recentlyViewedIds = (entries: RecentlyViewedEntry[]): Set<number> => (
  new Set(entries.map((entry) => entry.repository.id))
);
