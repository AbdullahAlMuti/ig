/**
 * Consolidated active Instagram tab messaging utility.
 *
 * Responsibilities:
 *  - Finding the active connected Instagram tab
 *  - Verifying the tab URL starts with https://www.instagram.com/
 *  - Sending typed runtime messages
 *  - Handling chrome.runtime.lastError
 *  - Returning structured responses: { ok: boolean; data?: T; error?: string }
 */
import type { RuntimeMessage } from '../types/messages';

export interface TabMessageResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Send a message to the current active Instagram tab with strict URL validation.
 */
export async function sendToInstagramTab<T = unknown>(
  message: RuntimeMessage,
): Promise<TabMessageResult<T>> {
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    return { ok: false, error: 'Chrome Extension APIs unavailable.' };
  }

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    if (!tab || tab.id == null) {
      return { ok: false, error: 'No active tab found.' };
    }

    if (!tab.url || !tab.url.startsWith('https://www.instagram.com/')) {
      return { ok: false, error: 'Active tab is not an Instagram page.' };
    }

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id!, message, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          resolve({ ok: false, error: lastError.message || 'Messaging failed.' });
          return;
        }

        if (response && typeof response === 'object' && 'ok' in response) {
          resolve(response as TabMessageResult<T>);
        } else if (response === 'ok' || response === true) {
          resolve({ ok: true });
        } else {
          resolve({ ok: true, data: response });
        }
      });
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Tab messaging exception.',
    };
  }
}
