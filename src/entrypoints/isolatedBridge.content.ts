/**
 * ISOLATED-world content script — the chrome.runtime broker between the MAIN
 * world (which can't use extension APIs) and the background/side panel, plus
 * the cancellable auto-scroll controller.
 *
 *  MAIN → here (DOM events): captured snapshot (`ndy_ig_info`), download-queue
 *  length (`ndy_dq`) → relayed to background / side panel via chrome.runtime.
 *
 *  panel/tab → here (chrome.runtime): swipe / top / stop-scroll / refresh /
 *  single-download / overlay-mode / ER-weights → actioned or forwarded to MAIN
 *  (DOM event or window.postMessage).
 *
 *  storage.local changes → forwarded to MAIN as window.postMessage.
 */
import { ScrollController } from '../shared/utils/scrollController';
import {
  type EngagementWeights,
  type OverlayMode,
  STORAGE_KEYS,
  DEFAULT_OVERLAY_MODE,
  DEFAULT_ER_WEIGHTS,
  OVERLAY_MODES,
} from '../shared/types/instagram';
import { normalizeWeights, areWeightsValid } from '../shared/utils/engagementCalculator';
import {
  RUNTIME_MSG,
  DOM_EVENT,
  POST_MSG,
  POST_MSG_SOURCE,
  type RuntimeMessage,
} from '../shared/types/messages';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default defineContentScript({
  matches: ['https://www.instagram.com/*'],
  runAt: 'document_start',
  main() {
    const scroller = new ScrollController();

    /* ---- MAIN → background / panel ---- */
    document.addEventListener(DOM_EVENT.info, (event) => {
      if (document.visibilityState !== 'visible') return;
      const root = (event as CustomEvent).detail?.root ?? null;
      safeSend({ type: RUNTIME_MSG.bgIg, info: root });
    });

    document.addEventListener(DOM_EVENT.downloadQueue, (event) => {
      const count = Number((event as CustomEvent).detail?.count);
      safeSend({ type: RUNTIME_MSG.downloadQueue, count: Number.isFinite(count) ? count : 0 });
    });

    /* ---- panel / tab → here ---- */
    chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
      switch (message.type) {
        case RUNTIME_MSG.swipe:
          void scroller.swipe(message.count);
          sendResponse('ok');
          break;
        case RUNTIME_MSG.top:
          scroller.scrollToTop();
          sendResponse('ok');
          break;
        case RUNTIME_MSG.stopScroll:
          scroller.cancel();
          sendResponse('ok');
          break;
        case RUNTIME_MSG.refresh:
          window.location.reload();
          sendResponse('ok');
          break;
        case RUNTIME_MSG.contentDown:
          document.dispatchEvent(
            new CustomEvent(DOM_EVENT.download, {
              detail: { video_src: { video_url: message.url, prefix: message.prefix } },
            }),
          );
          sendResponse('ok');
          break;
        case RUNTIME_MSG.overlayModeChanged:
          if (OVERLAY_MODES.includes(message.value)) postOverlayMode(message.value);
          sendResponse('ok');
          break;
        case RUNTIME_MSG.erWeightsChanged:
          if (areWeightsValid(message.value)) postWeights(message.value);
          sendResponse('ok');
          break;
        default:
          break;
      }
      return true;
    });

    /* ---- storage.local → MAIN ---- */
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      const modeChange = changes[STORAGE_KEYS.overlayMode];
      if (modeChange) {
        const value = modeChange.newValue as OverlayMode;
        postOverlayMode(OVERLAY_MODES.includes(value) ? value : DEFAULT_OVERLAY_MODE);
      }
      const weightChange = changes[STORAGE_KEYS.erWeights];
      if (weightChange) {
        postWeights(
          areWeightsValid(weightChange.newValue)
            ? (weightChange.newValue as EngagementWeights)
            : { ...DEFAULT_ER_WEIGHTS },
        );
      }
    });

    /* ---- initial sync from storage → MAIN ---- */
    void initialSync();
  },
});

function safeSend(message: RuntimeMessage): void {
  try {
    chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
  } catch {
    /* extension context invalidated — ignore */
  }
}

function postOverlayMode(mode: OverlayMode): void {
  window.postMessage({ source: POST_MSG_SOURCE, type: POST_MSG.overlayMode, mode }, '*');
}

function postWeights(weights: EngagementWeights): void {
  window.postMessage(
    { source: POST_MSG_SOURCE, type: POST_MSG.erWeights, weights: normalizeWeights(weights) },
    '*',
  );
}

async function initialSync(): Promise<void> {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.overlayMode, STORAGE_KEYS.erWeights]);

  const rawMode = stored[STORAGE_KEYS.overlayMode] as OverlayMode | undefined;
  const mode = OVERLAY_MODES.includes(rawMode as OverlayMode)
    ? (rawMode as OverlayMode)
    : DEFAULT_OVERLAY_MODE;
  if (!OVERLAY_MODES.includes(rawMode as OverlayMode)) {
    await chrome.storage.local.set({ [STORAGE_KEYS.overlayMode]: mode });
  }
  postOverlayMode(mode);

  const rawWeights = stored[STORAGE_KEYS.erWeights];
  const weights = areWeightsValid(rawWeights)
    ? normalizeWeights(rawWeights)
    : { ...DEFAULT_ER_WEIGHTS };
  if (!areWeightsValid(rawWeights)) {
    await chrome.storage.local.set({ [STORAGE_KEYS.erWeights]: weights });
  }
  postWeights(weights);
}
