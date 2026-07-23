/**
 * Normalizes Instagram's raw GraphQL / REST media objects into the canonical
 * `InstagramMediaItem` model and walks every response shape the app uses.
 *
 * The payload shapes here are undocumented Instagram internals reproduced from
 * the original extension; they drift whenever Instagram ships changes. All
 * access is defensively optional-chained so an unexpected shape degrades to
 * "captured nothing" rather than throwing.
 */
import { store } from './mediaStore';
import { applyEngagementRate } from '../shared/utils/engagementCalculator';
import { mediaTypeFromRaw, type InstagramMediaItem } from '../shared/types/instagram';
import { applyCapturedHeaders, hasAllHeaders } from './headers';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = any;

/** Strip Instagram's anti-JSON-hijacking `for (;;);` prefix. */
export function stripForLoop(text: string): string {
  return typeof text !== 'string' ? text : text.replace(/^\s*for\s*\(\s*;;\s*\)\s*;?/, '');
}

/** Choose a ~240px thumbnail candidate, else the smallest available. */
function pickThumb(candidates: Raw[]): string | undefined {
  if (!Array.isArray(candidates) || candidates.length === 0) return undefined;
  const square = candidates.find((c) => c?.width === 240 && c?.height !== 240 && c?.url);
  if (square) return square.url;
  return candidates[candidates.length - 1]?.url;
}

/** Best-effort fetch of the thumbnail → base64 data URL (grid + Excel image). */
async function cacheThumbnail(code: string, url: string | undefined): Promise<void> {
  if (!url || store.thumbInFlight.has(code)) return;
  store.thumbInFlight.add(code);
  try {
    const res = await fetch(url, {});
    if (!res.ok) return;
    const blob = await res.blob();
    await new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const item = store.byCode.get(code);
        if (item && item.imgB64 == null) item.imgB64 = reader.result as string;
        resolve();
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    /* CORS / network — non-fatal */
  } finally {
    store.thumbInFlight.delete(code);
  }
}

function resolveUsername(raw: Raw): string | undefined {
  return raw?.caption?.user?.username || raw?.owner?.username || raw?.user?.username;
}

/**
 * Ingest one raw media object (the original's `g()`). Requires a shortcode and
 * a like count. Backfills an existing record's missing fields, or creates a new
 * one and kicks off thumbnail caching + a media-info backfill when needed.
 */
export function ingestMedia(raw: Raw): void {
  const code: string | undefined = raw?.code;
  if (code == null || raw?.like_count == null) return;

  // --- Backfill an already-captured post with any newly-seen fields. ---
  const existing = store.byCode.get(code);
  if (existing) {
    if (existing.createdAt == null) {
      existing.createdAt = raw?.caption?.created_at ?? raw?.taken_at;
    }
    if (existing.captionText == null && raw?.caption?.text) {
      existing.captionText = raw.caption.text;
    }
    if (existing.playCount == null) {
      existing.playCount = raw?.ig_play_count ?? raw?.play_count ?? raw?.view_count;
      applyEngagementRate(existing, store.weights);
    }
    if (existing.mediaRepostCount == null && raw?.media_repost_count != null) {
      existing.mediaRepostCount = raw.media_repost_count;
      applyEngagementRate(existing, store.weights);
    }
    if (existing.username == null) existing.username = resolveUsername(raw);
    if (existing.following == null) existing.following = raw?.owner?.friendship_status?.following;
    if (existing.userId == null) existing.userId = raw?.user?.id;
    if (existing.videoUrl == null && raw?.video_versions?.[0]?.url) {
      existing.videoUrl = raw.video_versions[0].url;
    }
    return;
  }

  // --- Build a fresh record. ---
  const item: InstagramMediaItem = { code };
  item.createdAt = raw?.caption?.created_at ?? raw?.taken_at;
  if (raw?.caption?.text) item.captionText = raw.caption.text;
  item.playCount = raw?.ig_play_count ?? raw?.play_count ?? raw?.view_count;
  item.commentCount = raw?.comment_count;
  item.likeCount = raw?.like_count;
  item.mediaRepostCount = raw?.media_repost_count;
  item.mediaType = mediaTypeFromRaw(raw?.media_type);
  item.imgSmall = pickThumb(raw?.image_versions2?.candidates);
  item.imgOrigin = raw?.image_versions2?.candidates?.[0]?.url;
  item.username = resolveUsername(raw);
  item.following = raw?.owner?.friendship_status?.following;
  item.userId = raw?.user?.id;
  if (raw?.video_versions?.[0]?.url) item.videoUrl = raw.video_versions[0].url;

  const sound = raw?.clips_metadata?.original_sound_info;
  if (sound) {
    if (sound?.audio_asset_id) item.audioCollection = sound.audio_asset_id;
    if (sound?.ig_artist?.username) item.originalSoundUsername = sound.ig_artist.username;
    if (sound?.duration_in_ms) item.durationInMs = sound.duration_in_ms;
  }

  const carousel = raw?.carousel_media;
  if (Array.isArray(carousel) && carousel.length > 0) {
    const urls = carousel
      .map((child: Raw) => {
        store.idToCode.set(child.id, code);
        store.pkToCode.set(String(child.pk), code);
        const video = child?.video_versions?.[0]?.url;
        const image = child?.image_versions2?.candidates?.[0]?.url;
        return [video, image];
      })
      .flat()
      .filter((u: unknown): u is string => Boolean(u));
    item.carouselMedia = urls;
  }

  applyEngagementRate(item, store.weights);
  store.byCode.set(code, item);
  if (raw?.id != null) store.idToCode.set(raw.id, code);
  if (raw?.pk != null) store.pkToCode.set(String(raw.pk), code);

  void cacheThumbnail(code, item.imgSmall);

  // --- Backfill missing metrics via the media info endpoint. ---
  const mediaType = raw?.media_type;
  const needsBackfill =
    !item.createdAt ||
    (!item.videoUrl && mediaType === 2) ||
    (item.playCount == null && mediaType === 2) ||
    (item.mediaRepostCount == null && (mediaType === 1 || mediaType === 8));
  if (needsBackfill && raw?.pk != null && hasAllHeaders()) {
    requestMediaInfo(raw.pk);
  }
}

/** Self-issue an authenticated media-info request; its response re-enters ingest. */
function requestMediaInfo(pk: string | number): void {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `/api/v1/media/${pk}/info/`, true);
    applyCapturedHeaders(xhr);
    xhr.setRequestHeader('x-requested-with', 'XMLHttpRequest');
    xhr.send(null);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ *
 * Recursive helpers for GraphQL bboxes
 * ------------------------------------------------------------------ */

/** Collect every `__bbox.result.data[key]` node found anywhere in `root`. */
export function collectBboxData(root: Raw, key: string): Raw[] {
  const out: Raw[] = [];
  (function walk(node: Raw) {
    if (node && typeof node === 'object') {
      const data = node.__bbox?.result?.data;
      if (data && data[key]) out.push(data[key]);
      for (const k in node) if (Object.prototype.hasOwnProperty.call(node, k)) walk(node[k]);
    }
  })(root);
  return out;
}

/* ------------------------------------------------------------------ *
 * Response-shape parsers (called from the fetch/XHR interceptor)
 * ------------------------------------------------------------------ */

/** Explore-grid sectional items (`/api/v1/discover/web/explore_grid/`). */
export function parseExploreSections(payload: Raw): void {
  const sections = payload?.sectional_items;
  if (!Array.isArray(sections)) return;
  for (const section of sections) {
    try {
      if (section.feed_type === 'media') {
        for (const m of section?.layout_content?.medias ?? []) ingestMedia(m.media);
      } else if (section.feed_type === 'clips') {
        for (const m of section?.layout_content?.fill_items ?? []) ingestMedia(m.media);
        const one = section?.layout_content?.one_by_two_item?.clips?.items;
        for (const m of one ?? []) ingestMedia(m.media);
      } else {
        for (const m of section?.layout_content?.fill_items ?? []) ingestMedia(m.media);
      }
    } catch {
      /* skip malformed section */
    }
  }
}

/** Search top-serp media grid (`/api/v1/fbsearch/web/top_serp/`). */
export function parseTopSerp(payload: Raw): void {
  const sections = payload?.media_grid?.sections;
  if (!Array.isArray(sections)) return;
  for (const section of sections) {
    for (const m of section?.layout_content?.medias ?? []) ingestMedia(m.media);
  }
}

/** Items array carrying full media objects (`/media/{pk}/info/`, `/feed/user/`). */
export function parseItems(payload: Raw): void {
  for (const item of payload?.items ?? []) {
    if (item?.code) ingestMedia(item);
  }
}

/** Saved posts / collection feeds (`item.media`). */
export function parseSavedCollection(payload: Raw): void {
  for (const item of payload?.items ?? []) {
    if (item?.media?.code) ingestMedia(item.media);
  }
}

/** Reel-audio clips music feed. */
export function parseClipsMusic(payload: Raw): void {
  const items = payload?.items ?? payload?.payload?.items;
  for (const item of items ?? []) {
    if (item?.media?.code) ingestMedia(item.media);
  }
}

/**
 * GraphQL response fan-out (`/graphql/query`, `/api/graphql`). Tries each of
 * the many `xdt_*` connection shapes the app returns across surfaces.
 */
export function parseGraphqlResponse(payload: Raw): void {
  const data = payload?.data;
  if (!data) return;

  // Author dictionary — merged onto posts at snapshot time.
  try {
    if (data.user?.id != null) store.upsertUser(normalizeUser(data.user));
  } catch {
    /* ignore */
  }

  const tryEdges = (edges: Raw[] | undefined, pick: (node: Raw) => Raw): boolean => {
    if (!Array.isArray(edges)) return false;
    for (const edge of edges) {
      try {
        const media = pick(edge?.node);
        if (media) ingestMedia(media);
      } catch {
        /* skip */
      }
    }
    return true;
  };

  // Reposts timeline grid.
  const reposts = data?.fetch__XDTUserDict?.user_reposts_timeline?.repost_grid_items;
  if (Array.isArray(reposts)) for (const r of reposts) ingestMedia(r.media);

  // Search serp.
  const serp = data?.xdt_fbsearch__top_serp_graphql?.edges;
  if (Array.isArray(serp)) {
    for (const edge of serp) for (const it of edge?.node?.items ?? []) ingestMedia(it);
    return;
  }

  // Location tab.
  if (tryEdges(data?.xdt_location_get_web_info_tab?.edges, (n) => n)) return;

  // Home feed timeline (media or explore_story.media).
  const homeEdges = data?.xdt_api__v1__feed__timeline__connection?.edges;
  if (Array.isArray(homeEdges)) {
    for (const edge of homeEdges) {
      const node = edge?.node;
      if (node?.media) ingestMedia(node.media);
      else if (node?.explore_story?.media) ingestMedia(node.explore_story.media);
    }
  }

  if (tryEdges(data?.xdt_api__v1__feed__user_timeline_graphql_connection?.edges, (n) => n)) return;
  if (tryEdges(data?.xdt_api__v1__clips__user__connection_v2?.edges, (n) => n?.media)) return;

  const clipsHome = data?.xdt_api__v1__clips__home__connection_v2?.edges;
  if (Array.isArray(clipsHome)) {
    for (const edge of clipsHome) {
      try {
        ingestMedia(edge?.node);
      } catch {
        /* ignore */
      }
      try {
        ingestMedia(edge?.node?.media);
      } catch {
        /* ignore */
      }
    }
    return;
  }

  if (tryEdges(data?.xdt_api__v1__usertags__user_id__feed_connection?.edges, (n) => n)) return;
}

function normalizeUser(user: Raw) {
  return {
    id: String(user.id),
    username: user.username,
    follower_count: user.follower_count,
    following_count: user.following_count,
    media_count: user.media_count,
    total_clips_count: user.total_clips_count,
    biography: user.biography,
    external_url: user.external_url,
    city_name: user.city_name,
    is_business: user.is_business,
  };
}
