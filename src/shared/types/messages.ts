/**
 * Cross-context messaging contract.
 *
 * The extension coordinates four execution contexts:
 *   MAIN world content script  — patches fetch/XHR, renders overlays, downloads.
 *   ISOLATED world content script — chrome.runtime broker + scroll controller.
 *   background service worker    — relays MAIN → side panel, sets side-panel behaviour.
 *   React side panel             — UI + bulk orchestration + Excel export.
 *
 * MAIN ⇄ ISOLATED communicate in-page (they share the DOM but not the JS
 * context): MAIN → ISOLATED via DOM CustomEvents, ISOLATED → MAIN via
 * window.postMessage. ISOLATED ⇄ background ⇄ panel use chrome.runtime.
 *
 * Message/event/storage names are preserved verbatim from the original
 * extension so the wire protocol is unchanged.
 */

import type { InstagramMediaItem, OverlayMode, EngagementWeights } from './instagram';

/* ------------------------------------------------------------------ *
 * chrome.runtime.sendMessage / tabs.sendMessage type tags
 * ------------------------------------------------------------------ */
export const RUNTIME_MSG = {
  /** content(ISOLATED) → background: a fresh snapshot of captured posts. */
  bgIg: 'ndy_bg_ig',
  /** background → side panel: relayed snapshot of captured posts. */
  sideShop: 'ndy_side_shop',
  /** content(ISOLATED) → side panel: current in-page download-queue length. */
  downloadQueue: 'ndy_dq',
  /** panel → tab(ISOLATED): perform N automated swipes. */
  swipe: 'ndy_swipe',
  /** panel → tab(ISOLATED): scroll to top. */
  top: 'ndy_top',
  /** panel → tab(ISOLATED): cancel any in-flight auto-scroll (NEW). */
  stopScroll: 'ndy_stop_scroll',
  /** panel → tab(ISOLATED): clean store + reload the page. */
  refresh: 'ndy_refresh',
  /** panel → tab(ISOLATED): trigger a single MAIN-world media download. */
  contentDown: 'ndy_content_down',
  /** panel → tab(ISOLATED): overlay display mode changed. */
  overlayModeChanged: 'ndy_ig_overlay_mode_changed',
  /** panel → tab(ISOLATED): ER weights changed. */
  erWeightsChanged: 'ndy_ig_er_weights_changed',
} as const;

/* ------------------------------------------------------------------ *
 * In-page DOM CustomEvent names
 * ------------------------------------------------------------------ */
export const DOM_EVENT = {
  /** MAIN → ISOLATED: `detail.root` is the full captured post array (or null). */
  info: 'ndy_ig_info',
  /** MAIN → ISOLATED: `detail.count` is the live download-queue length. */
  downloadQueue: 'ndy_dq',
  /** ISOLATED → MAIN: request a single-file download. */
  download: 'ndy_ig_down',
} as const;

/* ------------------------------------------------------------------ *
 * window.postMessage bridge (ISOLATED → MAIN)
 * ------------------------------------------------------------------ */
export const POST_MSG_SOURCE = 'ndy_ig_sorter';
export const POST_MSG = {
  overlayMode: 'ndy_ig_overlay_mode',
  erWeights: 'ndy_ig_er_weights',
} as const;

/* ------------------------------------------------------------------ *
 * Typed payloads
 * ------------------------------------------------------------------ */

export interface BgIgMessage {
  type: typeof RUNTIME_MSG.bgIg;
  info: InstagramMediaItem[] | null;
}
export interface SideShopMessage {
  type: typeof RUNTIME_MSG.sideShop;
  info: InstagramMediaItem[] | null;
}
export interface DownloadQueueMessage {
  type: typeof RUNTIME_MSG.downloadQueue;
  count: number;
}
export interface SwipeMessage {
  type: typeof RUNTIME_MSG.swipe;
  count: number;
}
export interface SimpleTabMessage {
  type:
    | typeof RUNTIME_MSG.top
    | typeof RUNTIME_MSG.stopScroll
    | typeof RUNTIME_MSG.refresh;
}
export interface ContentDownMessage {
  type: typeof RUNTIME_MSG.contentDown;
  url: string;
  prefix: string;
}
export interface OverlayModeChangedMessage {
  type: typeof RUNTIME_MSG.overlayModeChanged;
  value: OverlayMode;
}
export interface ErWeightsChangedMessage {
  type: typeof RUNTIME_MSG.erWeightsChanged;
  value: EngagementWeights;
}

export type RuntimeMessage =
  | BgIgMessage
  | SideShopMessage
  | DownloadQueueMessage
  | SwipeMessage
  | SimpleTabMessage
  | ContentDownMessage
  | OverlayModeChangedMessage
  | ErWeightsChangedMessage;

/** Payload posted from ISOLATED → MAIN via window.postMessage. */
export interface BridgePostMessage {
  source: typeof POST_MSG_SOURCE;
  type: typeof POST_MSG.overlayMode | typeof POST_MSG.erWeights;
  mode?: OverlayMode;
  weights?: EngagementWeights;
}

/** detail payload for the ISOLATED → MAIN download CustomEvent. */
export interface DownloadEventDetail {
  video_src: {
    video_url: string;
    prefix: string;
  };
}
