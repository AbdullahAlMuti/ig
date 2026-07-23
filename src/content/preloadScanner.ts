/**
 * Scans Instagram's inline `<script type="application/json">` preload payloads
 * for the current route. On first paint (and SPA navigations) Instagram embeds
 * the initial data server-side before any XHR fires; parsing it seeds the store
 * immediately so overlays appear without waiting for network traffic.
 *
 * Route → embedded key mapping is reproduced from the original extension.
 */
import {
  ingestMedia,
  collectBboxData,
  parseExploreSections,
  stripForLoop,
} from './mediaParser';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = any;

/** Find the first inline JSON script whose text contains `needle`, parsed. */
function findJsonScriptContaining(needle: string): Raw | null {
  const scripts = document.querySelectorAll('script[type="application/json"]');
  for (const script of scripts) {
    const text = script.textContent ?? '';
    if (text.includes(needle)) {
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Explore grid is embedded inside PolarisQueryPreloaderCache as a raw string. */
function collectExploreGridResponses(root: Raw): Raw[] {
  const out: Raw[] = [];
  (function walk(node: Raw) {
    if (node && typeof node === 'object') {
      const bbox = node.__bbox;
      if (
        bbox &&
        typeof bbox === 'object' &&
        bbox.request?.url === '/api/v1/discover/web/explore_grid/' &&
        bbox.result?.response
      ) {
        try {
          out.push(JSON.parse(stripForLoop(bbox.result.response)));
        } catch {
          /* skip */
        }
      }
      for (const k in node) if (Object.prototype.hasOwnProperty.call(node, k)) walk(node[k]);
    }
  })(root);
  return out;
}

/** Read whatever preloads exist for the current path into the store. */
export function scanInlinePreloads(url: URL): void {
  const path = url.pathname || '';

  // Home feed.
  if (path === '/') {
    const root = findJsonScriptContaining('xdt_api__v1__feed__timeline__connection');
    if (root) {
      for (const conn of collectBboxData(root, 'xdt_api__v1__feed__timeline__connection')) {
        for (const edge of conn?.edges ?? []) {
          const node = edge?.node;
          if (node?.media) ingestMedia(node.media);
          else if (node?.explore_story?.media) ingestMedia(node.explore_story.media);
        }
      }
    }
    return;
  }

  // Single post / reel permalink (optionally under a username segment).
  if (/^\/(?:[^/]+\/)?(?:reel|p)\/[^/]+/.test(path)) {
    const webInfo = findJsonScriptContaining('xdt_api__v1__media__shortcode__web_info');
    if (webInfo) {
      const nodes = collectBboxData(webInfo, 'xdt_api__v1__media__shortcode__web_info');
      for (const item of nodes[0]?.items ?? []) ingestMedia(item);
    }
    const profile = findJsonScriptContaining('xdt_api__v1__profile_timeline');
    if (profile) {
      for (const block of collectBboxData(profile, 'xdt_api__v1__profile_timeline')) {
        for (const g of block?.profile_grid_items ?? []) {
          try {
            ingestMedia(g.media);
          } catch {
            /* skip */
          }
        }
        for (const it of block?.items ?? []) {
          try {
            ingestMedia(it);
          } catch {
            /* skip */
          }
        }
      }
    }
    return;
  }

  // Reels surface.
  if (path.startsWith('/reels/')) {
    const root = findJsonScriptContaining('xdt_api__v1__clips__home__connection_v2');
    if (root) {
      for (const conn of collectBboxData(root, 'xdt_api__v1__clips__home__connection_v2')) {
        for (const edge of conn?.edges ?? []) ingestMedia(edge?.node?.media);
      }
    }
    return;
  }

  // Location pages.
  if (path.startsWith('/explore/locations/')) {
    const root = findJsonScriptContaining('xdt_location_get_web_info_tab');
    if (root) {
      for (const tab of collectBboxData(root, 'xdt_location_get_web_info_tab')) {
        for (const edge of tab?.edges ?? []) ingestMedia(edge?.node);
      }
    }
    return;
  }

  // Explore grid (embedded as a raw string in the preloader cache).
  if (path.startsWith('/explore/')) {
    const root = findJsonScriptContaining('PolarisQueryPreloaderCache');
    if (root) {
      for (const response of collectExploreGridResponses(root)) parseExploreSections(response);
    }
  }
}
