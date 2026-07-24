/**
 * Binary media downloader + per-post download planning with strict validation.
 *
 * Runs download transfers with concurrency control, duplicate removal,
 * strict URL validation, and filename sanitization.
 */
import type { InstagramMediaItem } from '../types/instagram';
import { validateMediaDownloadUrl, sanitizeDownloadFilename } from './urlValidation';

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

/** Expand a post into deduped, ordered, validated downloadable files (1-indexed for carousels). */
export function buildDownloadEntries(item: InstagramMediaItem): DownloadEntry[] {
  if (!item || !item.code) return [];
  const safeCode = sanitizeDownloadFilename(item.code);
  const rawUrls: string[] = [];

  if (Array.isArray(item.carouselMedia) && item.carouselMedia.length > 0) {
    for (const raw of item.carouselMedia) {
      const url = (raw ?? '').trim();
      if (url && validateMediaDownloadUrl(url).valid) {
        rawUrls.push(url);
      }
    }
  } else {
    if (item.imgOrigin && validateMediaDownloadUrl(item.imgOrigin).valid) {
      rawUrls.push(item.imgOrigin);
    }
    if (item.videoUrl && validateMediaDownloadUrl(item.videoUrl).valid) {
      rawUrls.push(item.videoUrl);
    }
  }

  // Deduplicate URLs
  const uniqueUrls = Array.from(new Set(rawUrls));

  // Limit max files per item to 100
  const cappedUrls = uniqueUrls.slice(0, 100);

  return cappedUrls.map((url, index) => ({
    url,
    prefix: cappedUrls.length > 1 ? `${safeCode}_${index + 1}` : safeCode,
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
  const safePrefix = sanitizeDownloadFilename(prefix);
  if (url.startsWith('blob')) {
    const seg = sanitizeDownloadFilename(url.split('/').pop() || safePrefix);
    return `${seg}.${ext}`;
  }
  return `${safePrefix}.${ext}`;
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

  // Deferred revocation for reliable cross-engine downloading
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}

/**
 * MAIN-world download queue with concurrency limit (max 3) and batch safety.
 */
export class MediaDownloader {
  private active = 0;
  private cancelled = false;

  constructor(
    private readonly onQueueChange?: (count: number) => void,
    private readonly maxConcurrency: number = 3,
  ) {}

  get activeCount(): number {
    return this.active;
  }

  cancel(): void {
    this.cancelled = true;
  }

  resetCancel(): void {
    this.cancelled = false;
  }

  private emit(): void {
    this.onQueueChange?.(this.active);
  }

  /** Fetch a single URL and save it. Resolves true on success. */
  async download(url: string, rawPrefix: string): Promise<boolean> {
    if (this.cancelled) return false;

    // Validate URL security before fetching
    const valResult = validateMediaDownloadUrl(url);
    if (!valResult.valid) {
      console.warn(`[MediaDownloader] Rejected invalid URL: ${valResult.reason}`);
      return false;
    }

    const prefix = sanitizeDownloadFilename(rawPrefix);

    // Concurrency control wait
    while (this.active >= this.maxConcurrency) {
      if (this.cancelled) return false;
      await new Promise((r) => setTimeout(r, 50));
    }

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
    } catch (err) {
      console.error('[MediaDownloader] Fetch failed:', err);
      return false;
    } finally {
      this.active = Math.max(0, this.active - 1);
      this.emit();
    }
  }
}
