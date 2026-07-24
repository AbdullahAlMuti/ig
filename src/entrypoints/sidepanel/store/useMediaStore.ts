/**
 * Side-panel state hook — single source of truth for FeedSort Pro.
 *
 * Subscribes to captured-post stream (`ndy_side_shop`), manages base date/sort options,
 * performance badge multi-select filters, item selections, and exposes actions.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type InstagramMediaItem,
  type BadgeDisplayMode,
  DATE_RANGE_OPTIONS,
  SORT_OPTIONS,
  DEFAULT_SORT_INDEX,
  DEFAULT_BADGE_DISPLAY_MODE,
  BADGE_DISPLAY_MODES,
  STORAGE_KEYS,
} from '../../../shared/types/instagram';
import { RUNTIME_MSG, type RuntimeMessage } from '../../../shared/types/messages';
import {
  filterAndSort,
  type PerformanceFilterState,
  DEFAULT_PERFORMANCE_FILTERS,
} from '../../../shared/utils/sortFilter';
import { buildDownloadEntries } from '../../../shared/utils/mediaDownloader';
import { exportPostsToExcel } from '../../../shared/utils/excelExporter';
import type { RankingResult } from '../../../shared/utils/performanceRanker';
import { sendToInstagramTab } from '../../../shared/utils/tabMessaging';

const WATCHDOG_MS = 2500;

export interface BulkProgress {
  scopeLabel: string;
  statusLabel: string;
  totalPosts: number;
  processedPosts: number;
  totalFiles: number;
  completedFiles: number;
  skippedPosts: number;
  currentFileLabel: string;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function useMediaStore() {
  const [posts, setPosts] = useState<InstagramMediaItem[]>([]);
  const [connected, setConnected] = useState(false);
  const [dayIndex, setDayIndex] = useState(0);
  const [sortIndex, setSortIndex] = useState(DEFAULT_SORT_INDEX);
  const [performanceFilters, setPerformanceFilters] = useState<PerformanceFilterState>(
    { ...DEFAULT_PERFORMANCE_FILTERS },
  );
  const [queue, setQueue] = useState(0);
  const [busy, setBusy] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const [progress, setProgress] = useState<BulkProgress | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [badgeDisplayMode, setBadgeDisplayModeState] = useState<BadgeDisplayMode>(DEFAULT_BADGE_DISPLAY_MODE);

  const queueRef = useRef(0);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2500);
  }, []);

  /* ---- storage sync for badgeDisplayMode ---- */
  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEYS.badgeDisplayMode]).then((stored) => {
      const mode = stored[STORAGE_KEYS.badgeDisplayMode] as BadgeDisplayMode | undefined;
      if (mode && BADGE_DISPLAY_MODES.includes(mode)) {
        setBadgeDisplayModeState(mode);
      }
    }).catch(() => {});
  }, []);

  const setBadgeDisplayMode = useCallback((mode: BadgeDisplayMode) => {
    if (!BADGE_DISPLAY_MODES.includes(mode)) return;
    setBadgeDisplayModeState(mode);
    chrome.storage.local.set({ [STORAGE_KEYS.badgeDisplayMode]: mode }).catch(() => {});
  }, []);

  /* ---- inbound message wiring ---- */
  useEffect(() => {
    const onMessage = (message: RuntimeMessage) => {
      if (message?.type === RUNTIME_MSG.sideShop) {
        setConnected(true);
        setPosts(Array.isArray(message.info) ? message.info : []);
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
        watchdogRef.current = setTimeout(() => {
          setConnected(false);
          setPosts([]);
          setProgress(null);
          queueRef.current = 0;
          setQueue(0);
          setScrolling(false);
        }, WATCHDOG_MS);
      } else if (message?.type === RUNTIME_MSG.downloadQueue) {
        queueRef.current = Number(message.count) || 0;
        setQueue(queueRef.current);
      }
    };
    chrome.runtime.onMessage.addListener(onMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(onMessage);
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, []);

  /* ---- derived filtered/sorted view & rankings ---- */
  const days = DATE_RANGE_OPTIONS[dayIndex]?.days ?? 0;
  const sortKey = SORT_OPTIONS[sortIndex]?.key ?? '';

  const view = useMemo(
    () => filterAndSort(posts, { days, sortKey, performanceFilters }),
    [posts, days, sortKey, performanceFilters],
  );

  const filtered = view.items;
  const baseItems = view.baseItems;
  const rankings: RankingResult = view.rankings;
  const categoryCounts = view.categoryCounts;
  const isPerformanceFiltered = view.isPerformanceFiltered;

  const counts = {
    all: posts.length,
    base: baseItems.length,
    filtered: filtered.length,
    selected: selectedCodes.size,
  };

  const clearPerformanceFilters = useCallback(() => {
    setPerformanceFilters({ ...DEFAULT_PERFORMANCE_FILTERS });
  }, []);

  /* ---- item selection actions ---- */
  const toggleSelect = useCallback((code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedCodes((prev) => {
      if (prev.size === filtered.length && filtered.length > 0) {
        return new Set();
      }
      return new Set(filtered.map((item) => item.code));
    });
  }, [filtered]);

  const clearSelection = useCallback(() => {
    setSelectedCodes(new Set());
  }, []);

  /* ---- navigation & tab actions ---- */
  const gotoInstagram = useCallback(() => {
    window.open('https://www.instagram.com/explore/', '_blank');
  }, []);

  const cleanRefresh = useCallback(async (): Promise<boolean> => {
    const res = await sendToInstagramTab({ type: RUNTIME_MSG.refresh });
    setPosts([]);
    setProgress(null);
    setSelectedCodes(new Set());
    queueRef.current = 0;
    setQueue(0);
    setScrolling(false);
    return res.ok;
  }, []);

  const scrollTop = useCallback(async () => {
    const res = await sendToInstagramTab({ type: RUNTIME_MSG.top });
    if (res.ok) {
      flashToast('Scrolled to top');
    } else {
      flashToast(res.error || 'Failed to scroll to top');
    }
  }, [flashToast]);

  const startAutoScroll = useCallback(async () => {
    if (scrolling) return;
    setScrolling(true);
    const res = await sendToInstagramTab({ type: RUNTIME_MSG.swipe, count: 500 });
    if (!res.ok) {
      setScrolling(false);
      flashToast(res.error || 'Instagram tab is unavailable.');
    } else {
      flashToast('Auto-scroll started');
    }
  }, [scrolling, flashToast]);

  const stopScrolling = useCallback(async () => {
    await sendToInstagramTab({ type: RUNTIME_MSG.stopScroll });
    setScrolling(false);
    flashToast('Auto-scroll stopped');
  }, [flashToast]);

  /* ---- download engine ---- */
  const waitForQueueRise = useCallback(async () => {
    for (let i = 0; i < 20; i++) {
      if (queueRef.current > 0) return true;
      await delay(100);
    }
    return false;
  }, []);

  const waitForQueueDrain = useCallback(async () => {
    while (queueRef.current > 0) await delay(100);
  }, []);

  const runBulk = useCallback(
    async (scopeLabel: string, list: InstagramMediaItem[]) => {
      if (!Array.isArray(list) || list.length === 0) {
        flashToast('No items to download.');
        return;
      }
      const plans = list.map((item) => ({ code: item.code, entries: buildDownloadEntries(item) }));
      const totalFiles = plans.reduce((sum, p) => sum + p.entries.length, 0);

      const p: BulkProgress = {
        scopeLabel,
        statusLabel: 'Preparing...',
        totalPosts: plans.length,
        processedPosts: 0,
        totalFiles,
        completedFiles: 0,
        skippedPosts: 0,
        currentFileLabel: '',
      };
      setProgress({ ...p });

      if (totalFiles <= 0) {
        flashToast('No downloadable media found.');
        setTimeout(() => setProgress(null), 300);
        return;
      }

      setBusy(true);
      try {
        for (const plan of plans) {
          if (plan.entries.length === 0) {
            p.skippedPosts += 1;
            p.processedPosts += 1;
            setProgress({ ...p });
            continue;
          }
          for (const entry of plan.entries) {
            p.statusLabel = 'Downloading...';
            p.currentFileLabel = entry.prefix;
            setProgress({ ...p });

            const res = await sendToInstagramTab({
              type: RUNTIME_MSG.contentDown,
              url: entry.url,
              prefix: entry.prefix,
            });

            if (res.ok) {
              await waitForQueueRise();
              await waitForQueueDrain();
              p.completedFiles += 1;
            } else {
              flashToast(`Download failed for ${entry.prefix}: ${res.error || 'Unknown error'}`);
            }
            setProgress({ ...p });
          }
          p.processedPosts += 1;
          setProgress({ ...p });
        }
        p.statusLabel = 'Completed';
        setProgress({ ...p });
        flashToast(`Downloaded ${p.completedFiles} files.`);
      } catch {
        flashToast('Download encountered an error.');
      } finally {
        setBusy(false);
        await delay(500);
        setProgress(null);
      }
    },
    [flashToast, waitForQueueRise, waitForQueueDrain],
  );

  const downloadAll = useCallback(() => runBulk('All posts', posts), [runBulk, posts]);
  const downloadFiltered = useCallback(() => runBulk('Filtered posts', filtered), [runBulk, filtered]);
  const downloadSelected = useCallback(() => {
    const selectedList = filtered.filter((item) => selectedCodes.has(item.code));
    return runBulk('Selected posts', selectedList);
  }, [runBulk, filtered, selectedCodes]);

  const exportExcel = useCallback(async (customList?: InstagramMediaItem[]) => {
    const listToExport = customList ?? filtered;
    if (listToExport.length === 0) {
      flashToast('Nothing to export.');
      return;
    }
    try {
      const name = await exportPostsToExcel(listToExport, undefined, rankings);
      flashToast(`Exported ${name}`);
    } catch {
      flashToast('Export failed.');
    }
  }, [filtered, rankings, flashToast]);

  const exportSelected = useCallback(() => {
    const selectedList = filtered.filter((item) => selectedCodes.has(item.code));
    return exportExcel(selectedList);
  }, [filtered, selectedCodes, exportExcel]);

  return {
    // state
    posts,
    filtered,
    baseItems,
    counts,
    connected,
    dayIndex,
    sortIndex,
    performanceFilters,
    isPerformanceFiltered,
    categoryCounts,
    queue,
    busy,
    scrolling,
    progress,
    toast,
    selectedCodes,
    badgeDisplayMode,
    rankings,
    warnings: { missingDate: view.hadMissingDate, missingMetric: view.hadMissingMetric },
    // setters
    setDayIndex,
    setSortIndex,
    setPerformanceFilters,
    clearPerformanceFilters,
    setBadgeDisplayMode,
    flashToast,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    // actions
    gotoInstagram,
    cleanRefresh,
    scrollTop,
    startAutoScroll,
    stopScrolling,
    downloadAll,
    downloadFiltered,
    downloadSelected,
    exportExcel,
    exportSelected,
  };
}

export type MediaStoreApi = ReturnType<typeof useMediaStore>;
