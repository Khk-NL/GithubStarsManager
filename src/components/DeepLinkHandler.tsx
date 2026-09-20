import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Repository } from '../types';
import { useAppStore } from '../store/useAppStore';
import { parseDeepLink } from '../utils/deepLink';

/** 两个重组件都按需加载，别把 README 与 Release 的渲染链拉进主包。 */
const LazyReadmeModal = React.lazy(() => (
  import('./ReadmeModal').then((module) => ({ default: module.ReadmeModal }))
));
const LazyReleaseSheet = React.lazy(() => (
  import('./RepositoryReleaseSheet').then((module) => ({ default: module.RepositoryReleaseSheet }))
));

const openExternal = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Deep Link 处理器（开发守则 §12）。
 *
 * 只做"导航"这一类动作：仓库链接在本地收藏里就开 README，Release 链接就开该仓库的
 * Release 面板，开发者链接交给浏览器，插件链接只切到设置页。
 *
 * 所有参数由 `parseDeepLink` 重新校验；这里**不执行任何有副作用的动作**——不安装插件、
 * 不下载文件、不自动 Star，所以也不需要额外的二次确认。
 */
export const DeepLinkHandler: React.FC = () => {
  const { repositories, setCurrentView } = useAppStore(useShallow((state) => ({
    repositories: state.repositories,
    setCurrentView: state.setCurrentView,
  })));
  const [readmeRepository, setReadmeRepository] = useState<Repository | null>(null);
  const [releaseRepository, setReleaseRepository] = useState<Repository | null>(null);

  const handleDeepLink = useCallback((raw: string) => {
    const target = parseDeepLink(raw);
    if (!target) return;

    if (target.kind === 'plugin') {
      // 精确到插件 tab 需要把 SettingsPanel 的 activeTab 提到 store，属后续增量
      setCurrentView('settings');
      return;
    }

    if (target.kind === 'developer') {
      openExternal(target.url);
      return;
    }

    const match = repositories.find(
      (repo) => repo.full_name.toLowerCase() === `${target.owner}/${target.name}`.toLowerCase(),
    );
    if (!match) {
      // 没收藏过的仓库应用内没有详情可开，交给浏览器
      openExternal(target.url);
      return;
    }

    if (target.kind === 'release') setReleaseRepository(match);
    else setReadmeRepository(match);
  }, [repositories, setCurrentView]);

  useEffect(() => {
    const bridge = window.electronAPI?.deepLink;
    if (!bridge) return undefined;

    let disposed = false;
    void bridge.consumePending().then((pending) => {
      // 冷启动的链接要等渲染进程就绪，取一次就够
      if (!disposed && pending) handleDeepLink(pending);
    });
    const unsubscribe = bridge.onOpen((url) => handleDeepLink(url));

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [handleDeepLink]);

  return (
    <>
      {readmeRepository && (
        <Suspense fallback={null}>
          <LazyReadmeModal
            isOpen
            onClose={() => setReadmeRepository(null)}
            repository={readmeRepository}
          />
        </Suspense>
      )}
      {releaseRepository && (
        <Suspense fallback={null}>
          <LazyReleaseSheet
            isOpen
            onClose={() => setReleaseRepository(null)}
            repository={releaseRepository}
          />
        </Suspense>
      )}
    </>
  );
};

export default DeepLinkHandler;
