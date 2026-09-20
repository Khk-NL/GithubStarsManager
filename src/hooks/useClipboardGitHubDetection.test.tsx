import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useClipboardGitHubDetection } from './useClipboardGitHubDetection';

const mocks = vi.hoisted(() => ({
  state: { clipboardDetectionEnabled: false } as { clipboardDetectionEnabled: boolean },
  readText: vi.fn(),
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector: (state: unknown) => unknown) => selector(mocks.state),
}));

const focusWindow = async () => {
  await act(async () => {
    window.dispatchEvent(new Event('focus'));
  });
};

describe('useClipboardGitHubDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.clipboardDetectionEnabled = false;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText: mocks.readText },
    });
  });

  it('never touches the clipboard while the preference is off', async () => {
    const { result } = renderHook(() => useClipboardGitHubDetection());

    await focusWindow();

    expect(mocks.readText).not.toHaveBeenCalled();
    expect(result.current.target).toBeNull();
  });

  it('reads once on focus when enabled and recognizes a GitHub repository link', async () => {
    mocks.state.clipboardDetectionEnabled = true;
    mocks.readText.mockResolvedValue('https://github.com/facebook/react');
    const { result } = renderHook(() => useClipboardGitHubDetection());

    await focusWindow();

    expect(mocks.readText).toHaveBeenCalledOnce();
    await waitFor(() => expect(result.current.target?.label).toBe('facebook/react'));
  });

  it('discards non-GitHub clipboard content without keeping it', async () => {
    mocks.state.clipboardDetectionEnabled = true;
    mocks.readText.mockResolvedValue('https://example.com/some/private/page');
    const { result } = renderHook(() => useClipboardGitHubDetection());

    await focusWindow();

    expect(result.current.target).toBeNull();
  });

  it('stays quiet after the user dismisses the same link', async () => {
    mocks.state.clipboardDetectionEnabled = true;
    mocks.readText.mockResolvedValue('https://github.com/owner/repo');
    const { result } = renderHook(() => useClipboardGitHubDetection());

    await focusWindow();
    await waitFor(() => expect(result.current.target).not.toBeNull());

    await act(async () => { result.current.dismiss(); });
    expect(result.current.target).toBeNull();

    await focusWindow();
    expect(result.current.target).toBeNull();
  });

  it('ignores clipboard read failures', async () => {
    mocks.state.clipboardDetectionEnabled = true;
    mocks.readText.mockRejectedValue(new Error('NotAllowedError'));
    const { result } = renderHook(() => useClipboardGitHubDetection());

    await focusWindow();

    expect(result.current.target).toBeNull();
  });

  it('clears a pending prompt when the preference is turned off', async () => {
    mocks.state.clipboardDetectionEnabled = true;
    mocks.readText.mockResolvedValue('https://github.com/owner/repo');
    const { result, rerender } = renderHook(() => useClipboardGitHubDetection());

    await focusWindow();
    await waitFor(() => expect(result.current.target).not.toBeNull());

    mocks.state.clipboardDetectionEnabled = false;
    rerender();

    await waitFor(() => expect(result.current.target).toBeNull());
  });
});
