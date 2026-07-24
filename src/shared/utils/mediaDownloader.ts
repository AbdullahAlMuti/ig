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

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

/** Expand a post into deduped, ordered downloadable files (1-indexed for carousels). */
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
    prefix: unique.length > 1 ? `${item.code}_${index + 1}` : item.code,
  }));
}

/** Map a Content-Type / URL to a clean file extension. */
export function extensionFor(contentType: string, url: string): string {
  const mime = contentType.split(';')[0].trim().toLowerCase();
  if (MIME_EXTENSION_MAP[mime]) {
    return MIME_EXTENSION_MAP[mime];
  }

  // Fall back to sniffing the URL query/filename hint
  const match = /\.(mp4|jpg|jpeg|png|webp|heic|gif|mov|webm)(?:[?#]|$)/i.exec(url);
  if (match) {
    const ext = match[1].toLowerCase();
    return ext === 'jpeg' ? 'jpg' : ext;
  }

  // Safe default for Instagram media
  return 'mp4';
}

function buildFilename(url: string, prefix: string, ext: string): string {
  if (url.startsWith('blob')) {
    const seg = url.split('/').pop() || prefix;
    return `${seg}.${ext}`;
  }
  return `${prefix}.${ext}`;
}

/** Save a Blob to disk via a transient object URL + anchor click with deferred revocation. */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Deferred revocation to ensure browser download starts safely across all engines
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
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
      const contentType = res.headers.get('Content-Type') || 'video/mp4';
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
