/**
 * Captures the request headers Instagram attaches to its own API calls
 * (notably `x-ig-app-id`) so the interceptor can self-issue authenticated
 * `/api/v1/media/{pk}/info/` requests to backfill missing metrics.
 */
const HEADER_KEYS = ['x-ig-app-id'] as const;

const captured: Record<string, string> = { 'x-ig-app-id': '' };

/** Record a header value if it's one we track and the request targets an IG API. */
export function maybeCaptureHeader(name: string, value: string, url: string): void {
  const key = typeof name === 'string' ? name.toLowerCase() : '';
  const isApi =
    url.includes('/graphql/query') ||
    url.includes('/api/v1/') ||
    url.includes('/api/graphql');
  if (isApi && key in captured && value) captured[key] = value;
}

export function hasAllHeaders(): boolean {
  return HEADER_KEYS.every((k) => !!captured[k]);
}

export function applyCapturedHeaders(xhr: XMLHttpRequest): void {
  for (const key of HEADER_KEYS) {
    const value = captured[key];
    if (value) xhr.setRequestHeader(key, value);
  }
}
