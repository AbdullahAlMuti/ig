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

const scannedScripts = new WeakSet<HTMLScriptElement>();

/** Find inline JSON scripts containing `needle`, continuing past individual parse errors. */
function findJsonScriptsContaining(needle: string): Raw[] {
  const results: Raw[] = [];
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[type="application/json"]');
  for (const script of scripts) {
    if (scannedScripts.has(script)) continue;
    const text = script.textContent ?? '';
    if (text.includes(needle)) {
      try {
        const parsed = JSON.parse(text);
        scannedScripts.add(script);
        results.push(parsed);
      } catch {
        // Continue scanning remaining script tags on parse failure
        continue;
      }
    }
  }
  return results;
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
    const roots = findJsonScriptsContaining('xdt_api__v1__feed__timeline__connection');
    for (const root of roots) {
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
    const webInfos = findJsonScriptsContaining('xdt_api__v1__media__shortcode__web_info');
    for (const webInfo of webInfos) {
      const nodes = collectBboxData(webInfo, 'xdt_api__v1__media__shortcode__web_info');
      for (const item of nodes[0]?.items ?? []) ingestMedia(item);
    }
    const profiles = findJsonScriptsContaining('xdt_api__v1__profile_timeline');
    for (const profile of profiles) {
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
    const roots = findJsonScriptsContaining('xdt_api__v1__clips__home__connection_v2');
    for (const root of roots) {
      for (const conn of collectBboxData(root, 'xdt_api__v1__clips__home__connection_v2')) {
        for (const edge of conn?.edges ?? []) ingestMedia(edge?.node?.media);
      }
    }
    return;
  }

  // Location pages.
  if (path.startsWith('/explore/locations/')) {
    const roots = findJsonScriptsContaining('xdt_location_get_web_info_tab');
    for (const root of roots) {
      for (const tab of collectBboxData(root, 'xdt_location_get_web_info_tab')) {
        for (const edge of tab?.edges ?? []) ingestMedia(edge?.node);
      }
    }
    return;
  }

  // Explore grid (embedded as a raw string in the preloader cache).
  if (path.startsWith('/explore/')) {
    const roots = findJsonScriptsContaining('PolarisQueryPreloaderCache');
    for (const root of roots) {
      for (const response of collectExploreGridResponses(root)) parseExploreSections(response);
    }
  }
}
