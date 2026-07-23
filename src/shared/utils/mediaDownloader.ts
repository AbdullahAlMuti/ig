/**
 * Binary media downloader + per-post download planning.
 *
 * The actual byte transfer runs in the MAIN world (same origin as Instagram,
 * so `fetch` carries the page's credentials and CDN cookies): the URL is
 * fetched to a Blob, the MIME type is sniffed from the response, and a
 * programmatic `<a download>` click saves the file. An active-task counter is
 * surfaced so the side panel can pace bulk downloads.
 *
 * `buildDownloadEntries` is a pure planner (used by the panel) that expands one
 * post into its concrete downloadable files (carousel slides, or image+video).
 */
import type { InstagramMediaItem } from '../types/instagram';

export interface DownloadEntry {
  url: string;
  /** Base filename (no extension): `{code}` or `{code}_{n}` for carousels. */
  prefix: string;
}

/** Expand a post into deduped, ordered downloadable files. */
export function buildDownloadEntries(item: InstagramMediaItem): DownloadEntry[] {
  if (!item || !item.code) return [];
  const urls: string[] = [];

  if (Array.isArray(item.carouselMedia) && item.carouselMedia.length > 0) {
    for (const raw of item.carouselMedia) {
      const url = (raw ?? '').trim();
      if (url) urls.push(url);
    }
  } else {
    if (item.imgOrigin) urls.push(item.imgOrigin);
    if (item.videoUrl) urls.push(item.videoUrl);
  }

  const unique = Array.from(new Set(urls));
  return unique.map((url, index) => ({
    url,
    prefix: unique.length > 1 ? `${item.code}_${index}` : item.code,
  }));
}

/** Map a Content-Type / URL to a file extension. */
export function extensionFor(contentType: string, url: string): string {
  const subtype = contentType.includes('/') ? contentType.split('/')[1] : '';
  const clean = subtype.split('+')[0].trim().toLowerCase();
  if (clean) return clean === 'jpg' ? 'jpeg' : clean;
  // Fall back to the URL hint, else assume mp4 (matches original default).
  const match = /\.(mp4|jpg|jpeg|png|webp|heic|gif|mov|webm)(?:[?#]|$)/i.exec(url);
  return match ? match[1].toLowerCase() : 'mp4';
}

function buildFilename(url: string, prefix: string, ext: string): string {
  // blob: URLs have no meaningful name — use the last path segment.
  if (url.startsWith('blob')) {
    const seg = url.split('/').pop() || prefix;
    return `${seg}.${ext}`;
  }
  return `${prefix}.${ext}`;
}

/** Save a Blob to disk via a transient object URL + anchor click. */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

/**
 * MAIN-world download queue. Emits the active-task count on every change so the
 * ISOLATED bridge can relay it (via the `ndy_dq` event) to the side panel.
 */
export class MediaDownloader {
  private active = 0;

  constructor(private readonly onQueueChange?: (count: number) => void) {}

  get activeCount(): number {
    return this.active;
  }

  private emit(): void {
    this.onQueueChange?.(this.active);
  }

  /** Fetch a single URL and save it. Resolves true on success. */
  async download(url: string, prefix: string): Promise<boolean> {
    this.active += 1;
    this.emit();
    try {
      const res = await fetch(url);
      if (![200, 206].includes(res.status)) {
        throw new Error(`Non 200/206 response: ${res.status}`);
      }
      const contentType = (res.headers.get('Content-Type') || 'video/mp4').split(';')[0];
      const ext = extensionFor(contentType, url);
      const blob = await res.blob();
      const typed =
        blob.type && blob.type === contentType ? blob : new Blob([blob], { type: contentType });
      triggerBlobDownload(typed, buildFilename(url, prefix, ext));
      return true;
    } catch {
      return false;
    } finally {
      this.active = Math.max(0, this.active - 1);
      this.emit();
    }
  }
}
