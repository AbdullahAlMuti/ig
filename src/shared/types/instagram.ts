/**
 * Canonical, standardized media model for the extension.
 *
 * Instagram's raw GraphQL / REST payloads are noisy snake_case objects that
 * change shape per surface (feed, reels, explore, profile, search). The
 * network parser normalizes every captured object into this single model,
 * keyed by shortcode (`code`), which every other layer (overlay, side panel,
 * sort/filter, Excel export) consumes.
 */
export interface InstagramMediaItem {
  /** Shortcode, e.g. "C123abc" — the primary key. */
  code: string;
  likeCount?: number;
  commentCount?: number;
  /** "Reposts" surfaced by Instagram on some media. */
  mediaRepostCount?: number;
  /** Reel / video view count. */
  playCount?: number;
  /** Publication time, unix timestamp in **seconds**. */
  createdAt?: number;
  captionText?: string;
  username?: string;
  userId?: string;
  /** Thumbnail URL (small candidate). */
  imgSmall?: string;
  /** Full-resolution image URL. */
  imgOrigin?: string;
  /** MP4 video URL (single-video posts / reels). */
  videoUrl?: string;
  /** Ordered list of media URLs for multi-slide (carousel) posts. */
  carouselMedia?: string[];
  /** Calculated engagement rate as a fraction (multiply by 100 for %). */
  engagementRate?: number;

  // --- Extended capture fields (kept for full feature parity + richer export) ---
  /** Base64 data-URL of the thumbnail; powers the grid + embedded Excel image. */
  imgB64?: string;
  /** Derived media kind. */
  mediaType?: MediaType;
  following?: boolean;
  /** Reel audio asset id. */
  audioCollection?: string;
  originalSoundUsername?: string;
  durationInMs?: number;

  // --- Author enrichment (populated from GraphQL profile dictionaries) ---
  userFollowerCount?: number;
  userFollowingCount?: number;
  userMediaCount?: number;
  userTotalClipsCount?: number;
  userBiography?: string;
  externalUrl?: string;
  cityName?: string;
  isBusiness?: boolean;
}

export type MediaType = 'image' | 'video' | 'carousel';

/** Instagram numeric media_type → our label. 1=image, 2=video, 8=carousel. */
export function mediaTypeFromRaw(raw: number | undefined): MediaType | undefined {
  switch (raw) {
    case 1:
      return 'image';
    case 2:
      return 'video';
    case 8:
      return 'carousel';
    default:
      return undefined;
  }
}

/** Author profile record captured from GraphQL, merged onto media by userId. */
export interface InstagramUserRecord {
  id: string;
  username?: string;
  follower_count?: number;
  following_count?: number;
  media_count?: number;
  total_clips_count?: number;
  biography?: string;
  external_url?: string;
  city_name?: string;
  is_business?: boolean;
}

/* ------------------------------------------------------------------ *
 * Engagement-rate weights
 * ------------------------------------------------------------------ */

export interface EngagementWeights {
  like: number;
  comment: number;
  repost: number;
}

export const ER_WEIGHT_KEYS = ['like', 'comment', 'repost'] as const;

export const DEFAULT_ER_WEIGHTS: Readonly<EngagementWeights> = Object.freeze({
  like: 1,
  comment: 4,
  repost: 4,
});

/* ------------------------------------------------------------------ *
 * Overlay display mode
 * ------------------------------------------------------------------ */

export type OverlayMode = 'detail' | 'download' | 'none';

export const OVERLAY_MODES: readonly OverlayMode[] = Object.freeze([
  'detail',
  'download',
  'none',
]);

export const DEFAULT_OVERLAY_MODE: OverlayMode = 'detail';

export const OVERLAY_MODE_LABELS: Record<OverlayMode, string> = {
  detail: 'Detail (stats + downloads)',
  download: 'Download icon only',
  none: 'None (hide overlay)',
};

/* ------------------------------------------------------------------ *
 * chrome.storage.local keys (preserved from the original for a clean
 * upgrade path — existing users keep their settings).
 * ------------------------------------------------------------------ */

export const STORAGE_KEYS = {
  overlayMode: 'ndy_ig_overlay_mode',
  erWeights: 'ndy_ig_er_weights',
  badgeDisplayMode: 'ndy_ig_badge_display_mode',
} as const;

export type BadgeDisplayMode = 'smart' | 'er' | 'hover' | 'none';

export const BADGE_DISPLAY_MODES: readonly BadgeDisplayMode[] = Object.freeze([
  'smart',
  'hover',
  'er',
  'none',
]);

export const DEFAULT_BADGE_DISPLAY_MODE: BadgeDisplayMode = 'hover';

export const BADGE_DISPLAY_MODE_LABELS: Record<BadgeDisplayMode, string> = {
  smart: 'Smart performance badges',
  hover: 'Smart badge (show ER on hover)',
  er: 'Classic ER percentage',
  none: 'No badges',
};

/* ------------------------------------------------------------------ *
 * Sort + date-range option tables (indices preserved from the original
 * dropdowns so behaviour is identical).
 * ------------------------------------------------------------------ */

/** Sortable numeric keys; '' means "Default" (preserve capture order). */
export type SortKey =
  | 'likeCount'
  | 'commentCount'
  | 'mediaRepostCount'
  | 'createdAt'
  | 'playCount'
  | 'engagementRate'
  | '';

export interface SortOption {
  label: string;
  key: SortKey;
  /** Human warning shown once if the metric is missing on some items. */
  missingWarning?: string;
}

/** Order matches the original <select id="sort_by"> option indices exactly. */
export const SORT_OPTIONS: readonly SortOption[] = [
  { label: 'Likes', key: 'likeCount' },
  { label: 'Comments', key: 'commentCount' },
  { label: 'Reposts', key: 'mediaRepostCount' },
  { label: 'Date', key: 'createdAt', missingWarning: 'Some medias do not have date info.' },
  { label: 'Views (Reels)', key: 'playCount', missingWarning: 'Some medias do not have views info.' },
  { label: 'Default', key: '' },
  {
    label: 'ER (Engage%)',
    key: 'engagementRate',
    missingWarning: "ER is calculated for reels that have a 'view count'.",
  },
];

/** Default selected sort index — 5 = "Default" (matches original Z=5). */
export const DEFAULT_SORT_INDEX = 5;

export interface DateRangeOption {
  label: string;
  days: number;
}

/** Order matches the original <select id="timeRange"> options exactly. */
export const DATE_RANGE_OPTIONS: readonly DateRangeOption[] = [
  { label: 'All times', days: 0 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 180 days', days: 180 },
  { label: 'Last year', days: 365 },
  { label: 'Last 2 years', days: 730 },
  { label: 'Last 5 years', days: 1825 },
  { label: 'Last 10 years', days: 3650 },
];
