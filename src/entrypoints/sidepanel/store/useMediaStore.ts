/**
 * Side-panel state hook — the single source of truth for the UI.
 *
 * Subscribes to the captured-post stream (`ndy_side_shop`) and the in-page
 * download-queue length (`ndy_dq`), derives the filtered/sorted view, and
 * exposes actions (goto, clean&refresh, swipes, stop-scroll, bulk downloads,
 * Excel export). A 2 s watchdog mirrors the original: if snapshots stop
 * arriving, the store is considered disconnected and controls disable.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type InstagramMediaItem,
  DATE_RANGE_OPTIONS,
  SORT_OPTIONS,
  DEFAULT_SORT_INDEX,
} from '../../../shared/types/instagram';
import { RUNTIME_MSG, type RuntimeMessage } from '../../../shared/types/messages';
import { filterAndSort } from '../../../shared/utils/sortFilter';
import { buildDownloadEntries } from '../../../shared/utils/mediaDownloader';
import { exportPostsToExcel } from '../../../shared/utils/excelExporter';

const WATCHDOG_MS = 2000;

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

async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function sendToActiveTab(message: RuntimeMessage): Promise<boolean> {
  const tabId = await getActiveTabId();
  if (tabId == null) return false;
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, message, () => resolve(!chrome.runtime.lastError));
    } catch {
      resolve(false);
    }
  });
}

export function useMediaStore() {
  const [posts, setPosts] = useState<InstagramMediaItem[]>([]);
  const [connected, setConnected] = useState(false);
  const [dayIndex, setDayIndex] = useState(0);
  const [sortIndex, setSortIndex] = useState(DEFAULT_SORT_INDEX);
  const [queue, setQueue] = useState(0);
  const [busy, setBusy] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const [progress, setProgress] = useState<BulkProgress | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const queueRef = useRef(0);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2500);
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

  /* ---- derived filtered/sorted view ---- */
  const days = DATE_RANGE_OPTIONS[dayIndex]?.days ?? 0;
  const sortKey = SORT_OPTIONS[sortIndex]?.key ?? '';
  const view = useMemo(
    () => filterAndSort(posts, { days, sortKey }),
    [posts, days, sortKey],
  );
  const filtered = view.items;

  const counts = { all: posts.length, filtered: filtered.length };

  /* ---- actions ---- */
  const gotoInstagram = useCallback(() => {
    window.open('https://www.instagram.com/explore/', '_blank');
  }, []);

  const cleanRefresh = useCallback(async () => {
    await sendToActiveTab({ type: RUNTIME_MSG.refresh });
    setPosts([]);
    setProgress(null);
    queueRef.current = 0;
    setQueue(0);
  }, []);

  const scrollTop = useCallback(() => void sendToActiveTab({ type: RUNTIME_MSG.top }), []);

  const swipe = useCallback(
    async (count: number) => {
      setScrolling(true);
      const ok = await sendToActiveTab({ type: RUNTIME_MSG.swipe, count });
      if (!ok) {
        setScrolling(false);
        return;
      }
      // Auto-clear the scrolling lock after the expected run window; the user
      // can also cancel early via Stop Scrolling.
      const window = 8500 * Math.max(1, count);
      setTimeout(() => setScrolling(false), window);
    },
    [],
  );

  const stopScrolling = useCallback(async () => {
    await sendToActiveTab({ type: RUNTIME_MSG.stopScroll });
    setScrolling(false);
  }, []);

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
    async (scope: 'all' | 'filtered', list: InstagramMediaItem[]) => {
      if (!Array.isArray(list) || list.length === 0) {
        flashToast('Empty list.');
        return;
      }
      const plans = list.map((item) => ({ code: item.code, entries: buildDownloadEntries(item) }));
      const totalFiles = plans.reduce((sum, p) => sum + p.entries.length, 0);

      const p: BulkProgress = {
        scopeLabel: scope === 'all' ? 'All medias' : 'Filtered medias',
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
        setProgress({ ...p, statusLabel: 'No downloadable medias' });
        flashToast('No downloadable medias found.');
        setTimeout(() => setProgress(null), 400);
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
            const ok = await sendToActiveTab({
              type: RUNTIME_MSG.contentDown,
              url: entry.url,
              prefix: entry.prefix,
            });
            if (ok) {
              await waitForQueueRise();
              await waitForQueueDrain();
              p.completedFiles += 1;
            }
            setProgress({ ...p });
          }
          p.processedPosts += 1;
          setProgress({ ...p });
        }
        p.statusLabel = 'Completed';
        p.currentFileLabel = '';
        setProgress({ ...p });
      } finally {
        setBusy(false);
        await delay(600);
        setProgress(null);
      }
    },
    [flashToast, waitForQueueRise, waitForQueueDrain],
  );

  const downloadAll = useCallback(() => runBulk('all', posts), [runBulk, posts]);
  const downloadFiltered = useCallback(() => runBulk('filtered', filtered), [runBulk, filtered]);

  const exportExcel = useCallback(async () => {
    if (filtered.length === 0) {
      flashToast('Nothing to export.');
      return;
    }
    try {
      const name = await exportPostsToExcel(filtered);
      flashToast(`Exported ${name}`);
    } catch {
      flashToast('Export failed.');
    }
  }, [filtered, flashToast]);

  return {
    // state
    posts,
    filtered,
    counts,
    connected,
    dayIndex,
    sortIndex,
    queue,
    busy,
    scrolling,
    progress,
    toast,
    warnings: { missingDate: view.hadMissingDate, missingMetric: view.hadMissingMetric },
    // setters
    setDayIndex,
    setSortIndex,
    flashToast,
    // actions
    gotoInstagram,
    cleanRefresh,
    scrollTop,
    swipe,
    stopScrolling,
    downloadAll,
    downloadFiltered,
    exportExcel,
  };
}

export type MediaStoreApi = ReturnType<typeof useMediaStore>;
