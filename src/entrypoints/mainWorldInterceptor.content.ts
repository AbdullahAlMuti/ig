/**
 * MAIN-world content script — injected at document_start, before Instagram's
 * app bundle runs, so it can patch the network primitives the app uses.
 *
 * Responsibilities:
 *  - Patch window.fetch + XMLHttpRequest to parse Instagram GraphQL/REST media
 *    responses into the capture store (and grab the x-ig-app-id header).
 *  - Seed from inline JSON preloads on each route.
 *  - Render/refresh the on-post overlays via a MutationObserver (+ 1.5 s safety).
 *  - Run the in-page blob downloader and surface its queue length.
 *  - Bridge with the ISOLATED world: receive overlay-mode / ER-weight changes
 *    (window.postMessage) and single-file download requests (DOM event);
 *    publish the captured snapshot + queue length (DOM events).
 */
import { store } from '../content/mediaStore';
import { maybeCaptureHeader } from '../content/headers';
import {
  stripForLoop,
  parseGraphqlResponse,
  parseTopSerp,
  parseExploreSections,
  parseItems,
  parseSavedCollection,
  parseClipsMusic,
} from '../content/mediaParser';
import { scanInlinePreloads } from '../content/preloadScanner';
import {
  refreshOverlays,
  setOverlayMode,
  repaintAllStats,
  setDownloadFn,
} from '../content/overlayEngine';
import { MediaDownloader } from '../shared/utils/mediaDownloader';
import { areWeightsValid } from '../shared/utils/engagementCalculator';
import {
  DOM_EVENT,
  POST_MSG,
  POST_MSG_SOURCE,
  type BridgePostMessage,
  type DownloadEventDetail,
} from '../shared/types/messages';
import { validateMediaDownloadUrl, sanitizeDownloadFilename } from '../shared/utils/urlValidation';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default defineContentScript({
  matches: ['https://www.instagram.com/*'],
  world: 'MAIN',
  runAt: 'document_start',
  allFrames: true,
  main() {
    // 1) Patch network primitives synchronously before Instagram boots
    installNetworkInterception();

    // 2) In-page downloader with concurrency control (max 3)
    const downloader = new MediaDownloader((count) => {
      document.dispatchEvent(new CustomEvent(DOM_EVENT.downloadQueue, { detail: { count } }));
    });
    setDownloadFn((url, prefix) => void downloader.download(url, prefix));

    // 3) ISOLATED → MAIN: overlay mode + ER weight changes
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      const data = event.data as BridgePostMessage | undefined;
      if (!data || data.source !== POST_MSG_SOURCE) return;
      if (data.type === POST_MSG.overlayMode && data.mode) {
        setOverlayMode(data.mode);
      } else if (data.type === POST_MSG.erWeights && areWeightsValid(data.weights)) {
        store.setWeights(data.weights);
        repaintAllStats();
      }
    });

    // 4) ISOLATED → MAIN: single-file download requests
    document.addEventListener(DOM_EVENT.download, (event) => {
      const detail = (event as CustomEvent<DownloadEventDetail>).detail;
      const src = detail?.video_src;
      if (src?.video_url) {
        const valRes = validateMediaDownloadUrl(src.video_url);
        if (valRes.valid) {
          void downloader.download(src.video_url, sanitizeDownloadFilename(src.prefix));
        }
      }
    });

    // 5) Render loop
    startRenderLoop();
  },
});

/* ------------------------------------------------------------------ *
 * Network interception
 * ------------------------------------------------------------------ */

type TaggedXHR = XMLHttpRequest & { _igUrl?: string };

function shouldParse(url: string): boolean {
  return (
    url.includes('/graphql/query') ||
    url.includes('/api/graphql') ||
    url.includes('/api/v1/')
  );
}

/** Route a successful response body to the appropriate parser. */
function handleResponse(url: string, text: string): void {
  if (!url || !text) return;
  try {
    if (url.includes('/graphql/query') || url.includes('/api/graphql')) {
      parseGraphqlResponse(JSON.parse(text));
    } else if (url.includes('/api/v1/fbsearch/web/top_serp/')) {
      parseTopSerp(JSON.parse(stripForLoop(text)));
    } else if (url.includes('/api/v1/discover/web/explore_grid/')) {
      parseExploreSections(JSON.parse(stripForLoop(text)));
    } else if (
      (url.includes('/api/v1/media/') && url.endsWith('/info/')) ||
      url.includes('/api/v1/feed/user/')
    ) {
      parseItems(JSON.parse(stripForLoop(text)));
    } else if (
      url.includes('/api/v1/feed/saved/posts/') ||
      url.includes('/api/v1/feed/collection/')
    ) {
      parseSavedCollection(JSON.parse(stripForLoop(text)));
    } else if (url.includes('/api/v1/clips/music/')) {
      parseClipsMusic(JSON.parse(stripForLoop(text)));
    }
  } catch {
    /* malformed body — ignore */
  }
}

function captureFetchHeaders(input: RequestInfo | URL, init?: RequestInit): void {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : (input as Request)?.url ?? '';
  const headers =
    init?.headers ?? (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined);
  if (!headers || !url) return;
  let appId: string | null | undefined;
  if (headers instanceof Headers) appId = headers.get('x-ig-app-id');
  else if (Array.isArray(headers)) appId = headers.find((h) => h[0]?.toLowerCase() === 'x-ig-app-id')?.[1];
  else appId = (headers as Record<string, string>)['x-ig-app-id'];
  if (appId) maybeCaptureHeader('x-ig-app-id', String(appId), url);
}

function installNetworkInterception(): void {
  const proto = XMLHttpRequest.prototype;
  const origOpen = proto.open;
  const origSend = proto.send;
  const origSetHeader = proto.setRequestHeader;

  proto.open = function (this: TaggedXHR, _method: string, url: string) {
    this._igUrl = url;
    // eslint-disable-next-line prefer-rest-params
    return origOpen.apply(this, arguments as any);
  } as typeof proto.open;

  proto.setRequestHeader = function (this: TaggedXHR, name: string, value: string) {
    if (typeof this._igUrl === 'string') maybeCaptureHeader(name, value, this._igUrl);
    // eslint-disable-next-line prefer-rest-params
    return origSetHeader.apply(this, arguments as any);
  } as typeof proto.setRequestHeader;

  proto.send = function (this: TaggedXHR) {
    this.addEventListener('load', function (this: XMLHttpRequest) {
      if (this.status >= 200 && this.status < 300) {
        try {
          if (this.responseType === '' || this.responseType === 'text') {
            handleResponse(this.responseURL, this.responseText);
          }
        } catch {
          /* ignore responseText access error if non-text response */
        }
      }
    });
    // eslint-disable-next-line prefer-rest-params
    return origSend.apply(this, arguments as any);
  } as typeof proto.send;

  const origFetch = window.fetch;
  window.fetch = function (this: Window, input: RequestInfo | URL, init?: RequestInit) {
    try {
      captureFetchHeaders(input, init);
    } catch {
      /* ignore */
    }
    const promise = origFetch.apply(this, arguments as any) as Promise<Response>;
    promise
      .then((res) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : (input as Request)?.url ?? res.url ?? '';
        if (res.ok && shouldParse(url)) {
          res
            .clone()
            .text()
            .then((text) => handleResponse(url, text))
            .catch(() => {});
        }
      })
      .catch(() => {});
    return promise;
  } as typeof window.fetch;
}

/* ------------------------------------------------------------------ *
 * Render loop — MutationObserver (debounced) + 1.5 s heartbeat tick
 * ------------------------------------------------------------------ */

function startRenderLoop(): void {
  let scheduled = false;
  const scheduleScan = () => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      scanAndPublish();
    }, 200);
  };

  const startObserver = () => {
    const target = document.body ?? document.documentElement;
    const observer = new MutationObserver(scheduleScan);
    observer.observe(target, { childList: true, subtree: true });
  };

  if (document.body) startObserver();
  else document.addEventListener('DOMContentLoaded', startObserver, { once: true });

  // 1.5-second heartbeat tick (keeps sidepanel watchdog alive & synced)
  setInterval(scanAndPublish, 1500);
  scanAndPublish();
}

function scanAndPublish(): void {
  const url = new URL(window.location.href);

  try {
    scanInlinePreloads(url);
  } catch {
    /* ignore */
  }
  try {
    refreshOverlays(url);
  } catch {
    /* ignore */
  }

  const snapshot = store.snapshot();
  document.dispatchEvent(
    new CustomEvent(DOM_EVENT.info, { detail: { root: snapshot.length > 0 ? snapshot : null } }),
  );
}
