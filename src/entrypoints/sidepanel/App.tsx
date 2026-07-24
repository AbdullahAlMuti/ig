import { useState } from 'react';
import { Header } from './components/Header';
import { SortAndScrollToolbar } from './components/SortAndScrollToolbar';
import { BulkDownloadToolbar } from './components/BulkDownloadToolbar';
import { MediaToolbar } from './components/MediaToolbar';
import { FilterChipsBar } from './components/FilterChipsBar';
import { MediaGrid } from './components/MediaGrid';
import { SettingsDialog } from './components/SettingsDialog';
import { useMediaStore } from './store/useMediaStore';

export default function App() {
  const store = useMediaStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#F8F9FC] text-[#171A21] font-sans">
      {/* 1. Header (56-62px height, logo, title, dynamic reload immediately before settings) */}
      <Header store={store} onOpenSettings={() => setSettingsOpen(true)} />

      {/* 2. Combined Sort, Filter & Auto-Scroll Toolbar (Sorter next to Auto-Scroll) */}
      <SortAndScrollToolbar store={store} />

      {/* 3. Removable Performance Filter Chips Bar (appears when filters are active) */}
      <FilterChipsBar
        filters={store.performanceFilters}
        onChangeFilters={store.setPerformanceFilters}
        onClearAll={store.clearPerformanceFilters}
      />

      {/* 4. Bulk Download & Export Toolbar */}
      <BulkDownloadToolbar store={store} />

      {/* 5. Sticky Media Selection & View Toolbar */}
      <MediaToolbar store={store} viewMode={viewMode} onToggleViewMode={setViewMode} />

      {/* 6. Main Media Viewport (takes maximum vertical space!) */}
      <MediaGrid store={store} viewMode={viewMode} />

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsDialog
          store={store}
          onClose={() => setSettingsOpen(false)}
          onSaved={store.flashToast}
          onGotoInstagram={store.gotoInstagram}
        />
      )}

      {/* Temporary Toast Notifications */}
      {store.toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[3000] flex justify-center px-4">
          <div className="rounded-md bg-[#171A21] px-3.5 py-2 text-[12px] font-medium text-white shadow-lg backdrop-blur-md">
            {store.toast}
          </div>
        </div>
      )}
    </div>
  );
}
