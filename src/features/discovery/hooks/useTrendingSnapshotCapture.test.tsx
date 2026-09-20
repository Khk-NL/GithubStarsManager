import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTrendingSnapshotCapture } from './useTrendingSnapshotCapture';
import type { DiscoveryRepo } from '../../../types';

const mocks = vi.hoisted(() => ({
  recordTrendingSnapshot: vi.fn(),
}));

vi.mock('../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: unknown) => unknown) => selector({
    recordTrendingSnapshot: mocks.recordTrendingSnapshot,
  }),
}));

const repo = (overrides: Partial<DiscoveryRepo> = {}): DiscoveryRepo => ({
  id: 1,
  name: 'repo',
  full_name: 'owner/repo',
  description: null,
  html_url: 'https://github.com/owner/repo',
  stargazers_count: 100,
  forks_count: 0,
  forks: 0,
  language: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  pushed_at: '2026-01-01T00:00:00.000Z',
  owner: { login: 'owner', avatar_url: '' },
  topics: [],
  rank: 1,
  channel: 'trending',
  platform: 'All',
  ...overrides,
});

describe('useTrendingSnapshotCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records the visible trending list with ranks and stars', () => {
    renderHook(() => useTrendingSnapshotCapture(
      [repo({ id: 1, full_name: 'owner/first', rank: 1 }), repo({ id: 2, full_name: 'owner/second', rank: 2, stargazers_count: 250 })],
      true,
      'daily',
      'All',
    ));

    expect(mocks.recordTrendingSnapshot).toHaveBeenCalledOnce();
    expect(mocks.recordTrendingSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      period: 'daily',
      language: 'All',
      entries: [
        { repositoryFullName: 'owner/first', rank: 1, stars: 100 },
        { repositoryFullName: 'owner/second', rank: 2, stars: 250 },
      ],
    }));
  });

  it('falls back to the visible order when the API omits a rank', () => {
    renderHook(() => useTrendingSnapshotCapture(
      [repo({ full_name: 'owner/no-rank', rank: 0 })],
      true,
      'weekly',
      'All',
    ));

    expect(mocks.recordTrendingSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      entries: [{ repositoryFullName: 'owner/no-rank', rank: 1, stars: 100 }],
    }));
  });

  it('does nothing outside the trending channel or without data', () => {
    renderHook(() => useTrendingSnapshotCapture([repo()], false, 'daily', 'All'));
    expect(mocks.recordTrendingSnapshot).not.toHaveBeenCalled();

    renderHook(() => useTrendingSnapshotCapture([], true, 'daily', 'All'));
    expect(mocks.recordTrendingSnapshot).not.toHaveBeenCalled();
  });
});
