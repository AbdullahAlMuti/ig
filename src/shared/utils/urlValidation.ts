/**
 * Media Download URL Validation & Filename Sanitization Utility.
 *
 * Strict security checks for download URLs and filename inputs:
 *  - HTTPS / extension blob validation
 *  - Host allowlisting (Instagram & Meta CDN domains)
 *  - Rejection of private/loopback/localhost IP ranges & credentials
 *  - Rejection of hazardous schemes (javascript:, data:, file:, http:)
 *  - Sanitization of download filenames against path traversal & control characters
 */

const ALLOWED_CDN_SUFFIXES = [
  '.cdninstagram.com',
  '.fbcdn.net',
  '.instagram.com',
  'cdninstagram.com',
  'fbcdn.net',
  'instagram.com',
  'www.instagram.com',
];

const PRIVATE_IP_REGEX =
  /^(?:10\.|127\.|169\.254\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|192\.168\.|0\.|::1|fc00:|fe80:)/i;

export interface UrlValidationResult {
  valid: boolean;
  reason?: string;
}

/** Check if a hostname belongs to an allowed Instagram / Meta CDN domain. */
export function isAllowedMediaHost(hostname: string): boolean {
  if (!hostname) return false;
  const lowerHost = hostname.toLowerCase().trim();

  // Reject IP addresses & localhost
  if (lowerHost === 'localhost' || PRIVATE_IP_REGEX.test(lowerHost)) {
    return false;
  }

  return ALLOWED_CDN_SUFFIXES.some(
    (suffix) => lowerHost === suffix || lowerHost.endsWith(suffix),
  );
}

/** Validate a media download URL against scheme, length, credentials, host, and IP rules. */
export function validateMediaDownloadUrl(url: string): UrlValidationResult {
  if (!url || typeof url !== 'string') {
    return { valid: false, reason: 'URL must be a non-empty string.' };
  }

  if (url.length > 4096) {
    return { valid: false, reason: 'URL exceeds maximum allowed length (4096 characters).' };
  }

  const trimmed = url.trim();

  // Explicitly reject hazardous protocols before URL parsing
  const lowerUrl = trimmed.toLowerCase();
  if (
    lowerUrl.startsWith('javascript:') ||
    lowerUrl.startsWith('data:') ||
    lowerUrl.startsWith('file:') ||
    lowerUrl.startsWith('ftp:') ||
    lowerUrl.startsWith('chrome:') ||
    lowerUrl.startsWith('chrome-extension:') ||
    lowerUrl.startsWith('http:')
  ) {
    return { valid: false, reason: 'Protocol not allowed for media download.' };
  }

  // Handle extension blob URLs
  if (trimmed.startsWith('blob:')) {
    return { valid: true };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'Malformed URL format.' };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Only HTTPS URLs are allowed.' };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, reason: 'URL containing user credentials is not allowed.' };
  }

  const host = parsed.hostname;
  if (!isAllowedMediaHost(host)) {
    return { valid: false, reason: `Host '${host}' is not in the allowed Meta CDN list.` };
  }

  return { valid: true };
}

/** Sanitize download filename prefixes against path traversal, control characters, and dangerous extensions. */
export function sanitizeDownloadFilename(prefix: string): string {
  if (!prefix || typeof prefix !== 'string') {
    return 'media_item';
  }

  let clean = prefix
    // Replace null bytes, control characters, slash/backslash, colons, quotes
    .replace(/[\x00-\x1F\x7F\/\\:\*\?"<>\|]/g, '_')
    // Remove directory traversal sequences
    .replace(/\.\./g, '_')
    .trim();

  // Remove trailing dots or spaces
  clean = clean.replace(/[\.\s]+$/, '');

  // Strip dangerous executable extensions if appended to prefix
  clean = clean.replace(/\.(exe|cmd|bat|vbs|sh|php|js|jsx|ts|tsx|html|htm|asp|aspx)$/i, '_$1');

  if (!clean || clean.length === 0) {
    return 'media_item';
  }

  // Enforce max length of 120 chars
  return clean.slice(0, 120);
}
