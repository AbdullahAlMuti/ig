/**
 * In-page statistical overlay engine (MAIN world).
 *
 * Draws a `.ndy_ins_info` card onto every visible post/reel/grid tile showing
 * likes, comments, reposts, date, views and ER, plus a corner with one-click
 * image / carousel / video download actions. Rendering is driven by a
 * MutationObserver on <body> (throttled) with a 1 s safety tick, replacing the
 * original's pure 1 s polling. Post→element association uses href shortcodes
 * and the React Fiber resolver.
 *
 * DOM traversal thresholds and the card markup are reproduced from the original
 * so appearance and placement are unchanged.
 */
import { store } from './mediaStore';
import {
  type InstagramMediaItem,
  type OverlayMode,
  OVERLAY_MODES,
  DEFAULT_OVERLAY_MODE,
} from '../shared/types/instagram';
import { formatCount, formatDate } from '../shared/utils/format';
import { formatEngagementRate } from '../shared/utils/engagementCalculator';
import { resolveViaFiber, closestLink, closest, shortcodeFromHref } from './fiber';

/* eslint-disable @typescript-eslint/no-explicit-any */

const MODE_CLASS: Record<OverlayMode, string> = {
  detail: 'overlay-mode-detail',
  download: 'overlay-mode-download',
  none: 'overlay-mode-none',
};

let currentMode: OverlayMode = DEFAULT_OVERLAY_MODE;
let stylesInjected = false;
let downloadFn: (url: string, prefix: string) => void = () => {};

export function setDownloadFn(fn: (url: string, prefix: string) => void): void {
  downloadFn = fn;
}

const CARD_HTML = `
<div class="overlay">
  <div class="stat"><span>FeedSort Pro</span></div>
  <div class="stat">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><title>Likes</title><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
    <span></span>
  </div>
  <div class="stat">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><title>Comments</title><path d="M3 11.5a8.38 8.38 0 0 0 .9 3.8 8.5 8.5 0 0 0 7.6 4.7 8.38 8.38 0 0 0 3.8-.9L21 21l-1.9-5.7a8.38 8.38 0 0 0 .9-3.8 8.5 8.5 0 0 0-4.7-7.6 8.38 8.38 0 0 0-3.8-.9h-.5a8.48 8.48 0 0 0-8 8v.5z"></path></svg>
    <span></span>
  </div>
  <div class="stat">
    <svg width="16" height="16" viewBox="0 0 24 24"><title>Reposts</title><path d="M4.51617 6.9986C6.13179 4.58593 8.88099 2.99979 11.9995 2.99979C15.7267 2.99979 18.9259 5.26459 20.2927 8.49676C20.5079 9.00543 21.0946 9.24341 21.6033 9.0283C22.1119 8.81318 22.3499 8.22644 22.1348 7.71777C20.466 3.7716 16.5582 0.999786 11.9995 0.999786C8.27776 0.999786 4.9897 2.84823 2.99988 5.67416V2.9986C2.99988 2.44631 2.55216 1.9986 1.99988 1.9986C1.44759 1.9986 0.999878 2.44631 0.999878 2.9986V7.9986C0.999878 8.55088 1.44759 8.9986 1.99988 8.9986H6.99988C7.55216 8.9986 7.99988 8.55088 7.99988 7.9986C7.99988 7.44631 7.55216 6.9986 6.99988 6.9986H4.51617Z" fill="currentColor"></path><path d="M2.39572 14.9713C2.90439 14.7562 3.49113 14.9942 3.70625 15.5029C5.07309 18.735 8.27228 20.9998 11.9995 20.9998C15.118 20.9998 17.8672 19.4137 19.4828 17.001H16.9991C16.4468 17.001 15.9991 16.5533 15.9991 16.001C15.9991 15.4487 16.4468 15.001 16.9991 15.001H21.9991C22.5514 15.001 22.9991 15.4487 22.9991 16.001V21.001C22.9991 21.5533 22.5514 22.001 21.9991 22.001C21.4468 22.001 20.9991 21.5533 20.9991 21.001V18.3255C19.0093 21.1514 15.7212 22.9998 11.9995 22.9998C7.44077 22.9998 3.53298 20.228 1.86419 16.2818C1.64908 15.7732 1.88705 15.1864 2.39572 14.9713Z" fill="currentColor"></path></svg>
    <span></span>
  </div>
  <div class="stat">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><title>Date</title><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
    <span></span>
  </div>
  <div class="stat">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><title>Views</title><path d="M23.441 11.819C23.413 11.74 20.542 4 12 4S.587 11.74.559 11.819a1 1 0 0 0 1.881.677 10.282 10.282 0 0 1 19.12 0 1 1 0 0 0 1.881-.677Zm-7.124 2.368a3.359 3.359 0 0 1-1.54-.1 3.56 3.56 0 0 1-2.365-2.362 3.35 3.35 0 0 1-.103-1.542.99.99 0 0 0-1.134-1.107 5.427 5.427 0 0 0-3.733 2.34 5.5 5.5 0 0 0 8.446 6.97 5.402 5.402 0 0 0 1.536-3.09.983.983 0 0 0-1.107-1.109Z" fill-rule="evenodd"></path></svg>
    <span></span>
  </div>
  <div class="stat"><span></span></div>
</div>
<div class="overlay_download">
  <div class="action stat icon" data-action="image">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>Download Image</title><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="2.5"></circle><path d="M21 15l-5-5L3 21"></path></svg>
  </div>
  <div class="action stat icon" data-action="carousel">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>Download Carousel</title><path fill="white" transform="scale(0.5)" d="M34.8 29.7V11c0-2.9-2.3-5.2-5.2-5.2H11c-2.9 0-5.2 2.3-5.2 5.2v18.7c0 2.9 2.3 5.2 5.2 5.2h18.7c2.8-.1 5.1-2.4 5.1-5.2zM39.2 15v16.1c0 4.5-3.7 8.2-8.2 8.2H14.9c-.6 0-.9.7-.5 1.1 1 1.1 2.4 1.8 4.1 1.8h13.4c5.7 0 10.3-4.6 10.3-10.3V18.5c0-1.6-.7-3.1-1.8-4.1-.5-.4-1.2 0-1.2.6z"></path></svg>
  </div>
  <div class="action stat icon" data-action="video">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>Download Video</title><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><polygon points="9 8 15 12 9 16"></polygon></svg>
  </div>
</div>
`;

const STYLE_TEXT = `
.ndy_ins_info { position: absolute; z-index: 10; pointer-events: none; width: 100%; }
.overlay { position: absolute; bottom: 8px; right: 8px; background: rgba(0, 0, 0, 0.65); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.15); width: fit-content; gap: 3px; padding: 6px 10px; display: flex; flex-direction: column; justify-content: space-around; align-items: flex-start; pointer-events: none; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25); font-family: SF Pro Text, -apple-system, BlinkMacSystemFont, system-ui, sans-serif; }
.overlay_download { position: absolute; top: 8px; right: 8px; background: rgba(0, 0, 0, 0.65); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 9999px; border: 1px solid rgba(255, 255, 255, 0.15); width: fit-content; gap: 6px; padding: 4px 6px; display: none; flex-direction: column; align-items: center; pointer-events: auto; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25); }
.ndy_ins_info.overlay-mode-download .overlay { display: none; }
.ndy_ins_info.overlay-mode-download .overlay_download { display: flex; }
.ndy_ins_info.overlay-mode-detail .overlay_download { display: flex; }
.ndy_ins_info.overlay-mode-none { display: none; }
.ndy_ins_info .stat { display: flex; align-items: center; color: rgba(255, 255, 255, 0.95); gap: 6px; font-weight: 500; }
.ndy_ins_info .stat svg { flex-shrink: 0; }
.ndy_ins_info .stat span { font-size: 11px; letter-spacing: -0.01em; }
.ndy_ins_info .icon { cursor: pointer; padding: 3px; border-radius: 9999px; transition: transform 0.15s ease, background-color 0.15s ease; }
.ndy_ins_info .icon:hover { background-color: rgba(255, 255, 255, 0.15); transform: scale(1.08); }
.ndy_ins_info .icon:hover svg { stroke: #2997ff; }
`;

function injectStyles(): void {
  if (stylesInjected) return;
  const style = document.createElement('style');
  style.textContent = STYLE_TEXT;
  document.head.appendChild(style);
  stylesInjected = true;
}

function applyMode(card: HTMLElement, mode: OverlayMode): void {
  const resolved = OVERLAY_MODES.includes(mode) ? mode : DEFAULT_OVERLAY_MODE;
  for (const cls of Object.values(MODE_CLASS)) card.classList.remove(cls);
  card.classList.add(MODE_CLASS[resolved]);
  card.dataset.overlayMode = resolved;
}

/** Change overlay mode globally and repaint existing cards. */
export function setOverlayMode(mode: OverlayMode): void {
  currentMode = OVERLAY_MODES.includes(mode) ? mode : DEFAULT_OVERLAY_MODE;
  document
    .querySelectorAll<HTMLElement>('.ndy_ins_info')
    .forEach((card) => applyMode(card, currentMode));
}

/** Re-render stats on all existing cards (used after ER-weight changes). */
export function repaintAllStats(): void {
  document.querySelectorAll<HTMLElement>('.ndy_ins_info').forEach((card) => {
    const code = card.getAttribute('data-code');
    const item = code ? store.getByCode(code) : undefined;
    if (!item) return;
    const stats = card.querySelectorAll<HTMLElement>('.stat');
    if (stats.length > 0) applyStats(stats, item);
  });
}

function createCard(node: Element, ref: Element): HTMLElement {
  const card = document.createElement('div');
  card.className = 'ndy_ins_info';
  card.innerHTML = CARD_HTML;
  applyMode(card, currentMode);

  if (node.nodeName === 'DIV') ref.insertAdjacentElement('beforebegin', card);
  else (node.parentNode as Element | null)?.insertAdjacentElement('beforeend', card);

  const actions = card.querySelectorAll<HTMLElement>('div.action');
  const guard = (e: Event) => {
    e.stopImmediatePropagation();
    e.preventDefault();
  };
  actions[0]?.addEventListener('click', (e) => {
    guard(e);
    const item = store.getByCode(card.getAttribute('data-code'));
    if (item?.imgOrigin) downloadFn(item.imgOrigin, item.code);
    else toast('Image not found.');
  });
  actions[1]?.addEventListener('click', (e) => {
    guard(e);
    const item = store.getByCode(card.getAttribute('data-code'));
    if (item?.carouselMedia?.length) {
      item.carouselMedia.forEach((url, i) => downloadFn(url, `${item.code}_${i}`));
    } else toast('Carousel not found.');
  });
  actions[2]?.addEventListener('click', (e) => {
    guard(e);
    const item = store.getByCode(card.getAttribute('data-code'));
    if (item?.videoUrl) downloadFn(item.videoUrl, item.code);
    else toast('Video not found.');
  });
  return card;
}

/** Show/hide + fill the seven stat rows (mirrors the original `O`). */
function applyStats(stats: NodeListOf<HTMLElement>, item: InstagramMediaItem): void {
  const show = (el: HTMLElement | undefined, on: boolean) => {
    if (el) el.style.display = on ? 'flex' : 'none';
  };
  show(stats[1], item.likeCount != null);
  show(stats[2], item.commentCount != null);
  show(stats[3], item.mediaRepostCount != null);
  show(stats[4], item.createdAt != null);
  show(stats[5], item.playCount != null);
  show(stats[6], item.engagementRate != null);

  const setText = (el: HTMLElement | undefined, text: string) => {
    const span = el?.querySelector('span');
    if (span && span.textContent !== text) span.textContent = text;
  };
  setText(stats[1], formatCount(item.likeCount));
  setText(stats[2], formatCount(item.commentCount));
  setText(stats[3], formatCount(item.mediaRepostCount));
  setText(stats[4], formatDate(item.createdAt));
  setText(stats[5], formatCount(item.playCount));
  setText(stats[6], item.playCount != null ? formatEngagementRate(item) : '');
}

/** Position card over the media + toggle download buttons (mirrors `N`). */
function positionCard(item: InstagramMediaItem, card: HTMLElement, refEl: Element): void {
  const refParent = refEl.parentElement as HTMLElement | null;
  if (refParent) card.style.height = `${refParent.offsetHeight}px`;
  card.setAttribute('data-code', item.code);

  const actions = card.querySelectorAll<HTMLElement>('div.action');
  if (actions.length >= 3) {
    if (item.carouselMedia?.length) {
      actions[0].style.display = 'none';
      actions[1].style.display = 'flex';
    } else if (item.imgOrigin) {
      actions[0].style.display = 'flex';
      actions[1].style.display = 'none';
    } else {
      actions[0].style.display = 'none';
      actions[1].style.display = 'none';
    }
    actions[2].style.display = item.videoUrl != null ? 'flex' : 'none';
  }

  const stats = card.querySelectorAll<HTMLElement>('.stat');
  applyStats(stats, item);
}

/* ------------------------------------------------------------------ *
 * Surface-specific attachment helpers (mirror H / D / B / I / U)
 * ------------------------------------------------------------------ */

function attachToImage(imgEl: Element): void {
  const link = closestLink(imgEl);
  if (!link) return;
  const item = shortcodeFromHref((link as HTMLAnchorElement).href);
  if (!item) return;
  let card = link.parentElement?.querySelector<HTMLElement>('div.ndy_ins_info') ?? null;
  if (!card) card = createCard(imgEl, link);
  positionCard(item, card, imgEl);
}

function attachToGridVideo(videoEl: Element): void {
  const link = closestLink(videoEl);
  if (!link) return;
  const item = shortcodeFromHref((link as HTMLAnchorElement).href);
  if (!item) return;
  let card = link.parentElement?.querySelector<HTMLElement>('div.ndy_ins_info') ?? null;
  if (!card) {
    const first = (link.firstChild as Element) ?? link;
    card = createCard(first, first);
  }
  const ref = videoEl.parentElement?.parentElement?.parentElement ?? videoEl;
  positionCard(item, card, ref);
}

function attachDirect(refEl: Element, item: InstagramMediaItem): void {
  let card = refEl.parentElement?.querySelector<HTMLElement>('div.ndy_ins_info') ?? null;
  if (!card) card = createCard(refEl, refEl);
  positionCard(item, card, refEl);
}

/** Visible, adequately-sized video player element within a container. */
function findVideoElement(container: Element | null): Element | null {
  const nodes =
    container?.querySelectorAll<HTMLElement>(
      'div[aria-label="Video player"] div[role="presentation"]',
    ) ?? [];
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.left < 63 || (node as HTMLElement).offsetHeight < 63) continue;
    return node;
  }
  return null;
}

/** Visible, adequately-sized image element within a container. */
function findImageElement(container: Element | null): Element | null {
  const nodes = container?.querySelectorAll<HTMLElement>('img[crossorigin]') ?? [];
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.left < 63 || (node as HTMLElement).offsetHeight < 63) continue;
    return node;
  }
  return null;
}

/** Prefer the left-most of video/image when both are present. */
function pickPrimary(video: Element | null, image: Element | null): Element | null {
  if (video && !image) return video;
  if (video && image) {
    return video.getBoundingClientRect().left <= image.getBoundingClientRect().left ? video : image;
  }
  return image;
}

/** Main render pass across the current surface (mirrors `P`). */
export function refreshOverlays(url: URL): void {
  injectStyles();

  // Grid thumbnails (images).
  document
    .querySelectorAll('a[role="link"] img[crossorigin]')
    .forEach((el) => attachToImage(el));

  // Grid background-image tiles.
  document
    .querySelectorAll<HTMLElement>('a[role="link"]>div[style*="background-image: url("]')
    .forEach((el) => {
      if (!el.checkVisibility?.() || el.clientHeight < 152) return;
      attachToImage(el);
    });

  // Grid videos.
  document.querySelectorAll<HTMLElement>('a[role="link"] video').forEach((el) => {
    if (!el.checkVisibility?.() || el.clientHeight < 152) return;
    attachToGridVideo(el);
  });

  const path = url.pathname || '';

  if (path.includes('/p/') || path.includes('/reel/')) {
    const item = shortcodeFromHref(path);
    if (!item) return;
    const dialog = document.querySelector('div[role="dialog"]');
    let primary: Element | null;
    if (dialog) {
      primary = pickPrimary(findVideoElement(dialog), findImageElement(dialog));
    } else {
      const mainMedia = document.querySelector('main')?.firstElementChild?.firstElementChild ?? null;
      primary = pickPrimary(findVideoElement(mainMedia), findImageElement(mainMedia));
    }
    if (primary) attachDirect(primary, item);
    return;
  }

  if (path.startsWith('/reels/')) {
    document
      .querySelectorAll('div[aria-label="Video player"]>div>div[role="presentation"]')
      .forEach((node) => {
        const item = resolveViaFiber(node, 15);
        if (item) {
          const ref = closest(node, 'div[role="presentation"]') ?? node.parentElement ?? node;
          attachDirect(ref, item);
        }
      });
    return;
  }

  // Home feed / profile — <article> based.
  document.querySelectorAll('main article').forEach((article) => {
    const primary = pickPrimary(findVideoElement(article), findImageElement(article));
    if (!primary) return;
    const item = resolveViaFiber(primary, 20);
    if (item) {
      const ref = closest(primary, 'div[role="presentation"]') ?? primary;
      attachDirect(ref, item);
    }
  });
}

/* ------------------------------------------------------------------ *
 * Toast
 * ------------------------------------------------------------------ */
export function toast(message: string): void {
  const el = document.createElement('div');
  el.textContent = message;
  Object.assign(el.style, {
    visibility: 'hidden',
    minWidth: '250px',
    marginLeft: '-125px',
    backgroundColor: '#333',
    color: '#fff',
    textAlign: 'center',
    borderRadius: '4px',
    padding: '16px',
    position: 'fixed',
    zIndex: '2147483647',
    left: '50%',
    bottom: '30px',
    fontSize: '15px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
    transition: 'all 0.4s ease',
  } as CSSStyleDeclaration);
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.visibility = 'visible';
    el.style.opacity = '1';
    el.style.bottom = '50px';
  }, 60);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.visibility = 'hidden';
    setTimeout(() => el.remove(), 500);
  }, 1400);
}
