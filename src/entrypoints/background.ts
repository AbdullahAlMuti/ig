/**
 * Background service worker.
 *
 * Minimal by design (all licensing/ExtPay logic removed):
 *  - Open the side panel when the toolbar icon is clicked.
 *  - Relay captured snapshots from the content script (`ndy_bg_ig`) to the
 *    side panel (`ndy_side_shop`).
 *  - Open Instagram Explore on first install.
 *
 * (The download-queue `ndy_dq` message is broadcast by the content script and
 * consumed directly by the side panel, so it needs no relay here.)
 */
import { RUNTIME_MSG, type RuntimeMessage } from '../shared/types/messages';

export default defineBackground(() => {
  chrome.sidePanel
    ?.setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {
      /* not supported / already set — ignore */
    });

  chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
    if (message?.type === RUNTIME_MSG.bgIg) {
      try {
        chrome.runtime.sendMessage(
          { type: RUNTIME_MSG.sideShop, info: message.info },
          () => void chrome.runtime.lastError,
        );
      } catch {
        /* no receiver (panel closed) — ignore */
      }
      sendResponse({ status: 0 });
    }
    return true;
  });

  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      chrome.tabs.create({ url: 'https://www.instagram.com/explore/' });
    }
  });
});
