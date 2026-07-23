import { Settings, Instagram } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
}

export function Header({ onOpenSettings }: HeaderProps) {
  const version = chrome.runtime?.getManifest?.().version ?? '2.4.0';
  let logo = '';
  try {
    logo = chrome.runtime?.getURL?.('icons/128.png') ?? '';
  } catch {
    logo = '';
  }

  return (
    <header className="flex items-center gap-3 px-1 py-1">
      {logo ? (
        <img src={logo} alt="IG Sorter logo" className="h-7 w-7 rounded-md object-contain" />
      ) : (
        <Instagram className="h-7 w-7 text-brand" />
      )}
      <div className="flex-1 leading-tight">
        <div className="text-sm font-bold text-slate-800">IG Sorter &amp; Analytics</div>
        <div className="text-[11px] text-slate-500">v{version} Free Edition</div>
      </div>
      <button
        onClick={onOpenSettings}
        className="rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-200"
        title="Settings"
        aria-label="Settings"
      >
        <Settings className="h-4 w-4" />
      </button>
    </header>
  );
}
