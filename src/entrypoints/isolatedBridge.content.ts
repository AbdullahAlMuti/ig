/**
 * ISOLATED-world content script — the chrome.runtime broker between the MAIN
 * world and the background/side panel, plus the cancellable auto-scroll controller.
 *
 * Security Hardening:
 *  - Per-session unpredictable capability token generated via crypto.randomUUID()
 *  - Strict payload validation before relaying or acting on messages
 *  - Correct return false/true listener behavior
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
import { validateMediaDownloadUrl, sanitizeDownloadFilename } from '../shared/utils/urlValidation';
import {
  validateDownloadPayload,
  validateOverlayModeValue,
  validateEngagementWeightsPayload,
  validateSnapshotRootPayload,
} from '../shared/utils/messageValidation';

/* eslint-disable @typescript-eslint/no-explicit-any */

const SESSION_TOKEN = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

export default defineContentScript({
  matches: ['https://www.instagram.com/*'],
  runAt: 'document_start',
  main() {
    const scroller = new ScrollController();

    /* ---- MAIN → background / panel ---- */
    document.addEventListener(DOM_EVENT.info, (event) => {
      if (document.visibilityState !== 'visible') return;
      const root = (event as CustomEvent).detail?.root ?? null;
      const valRes = validateSnapshotRootPayload(root);
      if (!valRes.valid) {
        console.warn(`[isolatedBridge] Rejected invalid snapshot: ${valRes.error}`);
        return;
      }
      safeSend({ type: RUNTIME_MSG.bgIg, info: root });
    });

    document.addEventListener(DOM_EVENT.downloadQueue, (event) => {
      const count = Number((event as CustomEvent).detail?.count);
      safeSend({ type: RUNTIME_MSG.downloadQueue, count: Number.isFinite(count) ? Math.max(0, count) : 0 });
    });

    /* ---- panel / tab → here ---- */
    chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
      if (!message || typeof message !== 'object') {
        sendResponse({ ok: false, error: 'Invalid message structure' });
        return false;
      }

      switch (message.type) {
        case RUNTIME_MSG.swipe: {
          const count = typeof message.count === 'number' && Number.isFinite(message.count) ? message.count : 500;
          void scroller.swipe(count);
          sendResponse({ ok: true });
          return false;
        }
        case RUNTIME_MSG.top: {
          scroller.scrollToTop();
          sendResponse({ ok: true });
          return false;
        }
        case RUNTIME_MSG.stopScroll: {
          scroller.cancel();
          sendResponse({ ok: true });
          return false;
        }
        case RUNTIME_MSG.refresh: {
          window.location.reload();
          sendResponse({ ok: true });
          return false;
        }
        case RUNTIME_MSG.contentDown: {
          const valRes = validateDownloadPayload(message);
          if (!valRes.valid) {
            sendResponse({ ok: false, error: valRes.error });
            return false;
          }

          const urlVal = validateMediaDownloadUrl(message.url);
          if (!urlVal.valid) {
            sendResponse({ ok: false, error: urlVal.reason });
            return false;
          }

          document.dispatchEvent(
            new CustomEvent(DOM_EVENT.download, {
              detail: {
                token: SESSION_TOKEN,
                video_src: {
                  video_url: message.url,
                  prefix: sanitizeDownloadFilename(message.prefix),
                },
              },
            }),
          );
          sendResponse({ ok: true });
          return false;
        }
        case RUNTIME_MSG.overlayModeChanged: {
          if (validateOverlayModeValue(message.value)) {
            postOverlayMode(message.value);
            sendResponse({ ok: true });
          } else {
            sendResponse({ ok: false, error: 'Invalid overlay mode' });
          }
          return false;
        }
        case RUNTIME_MSG.erWeightsChanged: {
          if (validateEngagementWeightsPayload(message.value)) {
            postWeights(message.value);
            sendResponse({ ok: true });
          } else {
            sendResponse({ ok: false, error: 'Invalid engagement weights' });
          }
          return false;
        }
        default: {
          sendResponse({ ok: false, error: 'Unhandled message type' });
          return false;
        }
      }
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
  window.postMessage({ source: POST_MSG_SOURCE, token: SESSION_TOKEN, type: POST_MSG.overlayMode, mode }, '*');
}

function postWeights(weights: EngagementWeights): void {
  window.postMessage(
    { source: POST_MSG_SOURCE, token: SESSION_TOKEN, type: POST_MSG.erWeights, weights: normalizeWeights(weights) },
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
