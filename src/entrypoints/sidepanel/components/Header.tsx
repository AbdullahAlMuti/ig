import { useState } from 'react';
import { Settings, RotateCw, Check, AlertCircle, ExternalLink } from 'lucide-react';
import type { MediaStoreApi } from '../store/useMediaStore';

interface HeaderProps {
  store: MediaStoreApi;
  onOpenSettings: () => void;
}

type RefreshState = 'idle' | 'refreshing' | 'success' | 'failure';

export function Header({ store, onOpenSettings }: HeaderProps) {
  const [refreshState, setRefreshState] = useState<RefreshState>('idle');
  const version = chrome.runtime?.getManifest?.().version ?? '2.4.0';

  let logo = '';
  try {
    logo = chrome.runtime?.getURL?.('icons/128.png') ?? '';
  } catch {
    logo = '';
  }

  const handleRefresh = async () => {
    if (refreshState === 'refreshing') return;
    setRefreshState('refreshing');
    try {
      const ok = await store.cleanRefresh();
      if (ok) {
        setRefreshState('success');
        store.flashToast('Media refreshed');
        setTimeout(() => setRefreshState('idle'), 1200);
      } else {
        setRefreshState('failure');
        store.flashToast('Instagram tab unavailable');
        setTimeout(() => setRefreshState('idle'), 1400);
      }
    } catch {
      setRefreshState('failure');
      store.flashToast('Refresh failed');
      setTimeout(() => setRefreshState('idle'), 1400);
    }
  };

  return (
    <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-[#E6E8EC] bg-white px-3.5 py-2">
      {/* Left: Logo & Branding */}
      <div className="flex items-center gap-2.5 min-w-0">
        {logo ? (
          <img src={logo} alt="FeedSort Pro logo" className="h-6 w-6 shrink-0 rounded-md object-contain" />
        ) : (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#6558E8]/10 text-[#6558E8]">
            <span className="font-bold text-xs">FS</span>
          </div>
        )}
        <div className="flex flex-col min-w-0 leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-semibold text-[#171A21] tracking-tight truncate">FeedSort Pro</span>
            <span className="rounded bg-[#6558E8]/10 px-1 py-0.2 text-[9px] font-medium text-[#6558E8]">v{version}</span>
          </div>
          <span className="text-[11px] font-normal text-[#667085] truncate">Feed Sorter &amp; Analytics</span>
        </div>
      </div>

      {/* Right: Actions in EXACT order [Open Instagram if disconnected] -> [Reload] -> [Settings] */}
      <div className="flex items-center gap-1 shrink-0">
        {!store.connected && (
          <button
            onClick={store.gotoInstagram}
            className="flex h-8 items-center gap-1 rounded-md bg-[#F4F5F7] px-2 text-[11px] font-medium text-[#6558E8] hover:bg-[#6558E8]/10 transition-colors"
            title="Open Instagram in a new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open Instagram</span>
          </button>
        )}

        {/* 1. Dynamic Reload Icon (immediately before Settings) */}
        <button
          onClick={handleRefresh}
          disabled={refreshState === 'refreshing'}
          className={`flex h-8 w-8 items-center justify-center rounded-md text-[#667085] transition-colors hover:bg-[#F4F5F7] hover:text-[#171A21] disabled:opacity-60 ${
            refreshState === 'success' ? 'text-emerald-600 bg-emerald-50' : ''
          } ${refreshState === 'failure' ? 'text-rose-600 bg-rose-50' : ''}`}
          title={
            refreshState === 'refreshing'
              ? 'Refreshing media'
              : refreshState === 'success'
              ? 'Refreshed!'
              : refreshState === 'failure'
              ? 'Refresh failed'
              : 'Refresh media'
          }
          aria-label={refreshState === 'refreshing' ? 'Refreshing media' : 'Refresh media'}
        >
          {refreshState === 'refreshing' ? (
            <RotateCw className="h-4 w-4 animate-spin text-[#6558E8]" />
          ) : refreshState === 'success' ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : refreshState === 'failure' ? (
            <AlertCircle className="h-4 w-4 text-rose-600" />
          ) : (
            <RotateCw className="h-4 w-4" />
          )}
        </button>

        {/* 2. Settings Icon */}
        <button
          onClick={onOpenSettings}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[#667085] transition-colors hover:bg-[#F4F5F7] hover:text-[#171A21]"
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
