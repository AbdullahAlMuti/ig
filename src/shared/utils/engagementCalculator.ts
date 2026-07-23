/**
 * Engagement-rate math + weight validation.
 *
 *   ER = (likes·W_like + comments·W_comment + reposts·W_repost) / playCount
 *
 * ER is only defined for media that report a view/play count (i.e. reels);
 * for everything else it is `undefined`, which sorts/filters treat as "N/A".
 */
import {
  type InstagramMediaItem,
  type EngagementWeights,
  DEFAULT_ER_WEIGHTS,
  ER_WEIGHT_KEYS,
} from '../types/instagram';

/** Coerce arbitrary input into a valid weight set, falling back to defaults. */
export function normalizeWeights(input: unknown): EngagementWeights {
  const out: EngagementWeights = { ...DEFAULT_ER_WEIGHTS };
  if (input && typeof input === 'object') {
    for (const key of ER_WEIGHT_KEYS) {
      const value = Number((input as Record<string, unknown>)[key]);
      if (Number.isFinite(value) && value >= 0) out[key] = value;
    }
  }
  return out;
}

/** True when every weight is a finite, non-negative number. */
export function areWeightsValid(input: unknown): input is EngagementWeights {
  if (!input || typeof input !== 'object') return false;
  return ER_WEIGHT_KEYS.every((key) => {
    const value = Number((input as Record<string, unknown>)[key]);
    return Number.isFinite(value) && value >= 0;
  });
}

/** Compute ER for one item; `undefined` when there is no play/view count. */
export function computeEngagementRate(
  item: InstagramMediaItem,
  weights: EngagementWeights = DEFAULT_ER_WEIGHTS,
): number | undefined {
  const plays = Number(item.playCount) || 0;
  if (!plays) return undefined;
  const w = normalizeWeights(weights);
  const likes = (Number(item.likeCount) || 0) * w.like;
  const comments = (Number(item.commentCount) || 0) * w.comment;
  const reposts = (Number(item.mediaRepostCount) || 0) * w.repost;
  return (likes + comments + reposts) / plays;
}

/** Recompute + assign `engagementRate` in place, returning the same item. */
export function applyEngagementRate(
  item: InstagramMediaItem,
  weights: EngagementWeights = DEFAULT_ER_WEIGHTS,
): InstagramMediaItem {
  item.engagementRate = computeEngagementRate(item, weights);
  return item;
}

/** Recompute ER across a whole collection (used on weight changes). */
export function recalcEngagementRates(
  items: InstagramMediaItem[],
  weights: EngagementWeights,
): void {
  for (const item of items) applyEngagementRate(item, weights);
}

/** Badge text, e.g. "ER 4.25%" or "ER N/A". */
export function formatEngagementRate(item: InstagramMediaItem): string {
  return item.engagementRate == null
    ? 'ER N/A'
    : `ER ${(100 * item.engagementRate).toFixed(2)}%`;
}

/** Human-readable formula string for the settings preview. */
export function formatErFormula(weights: EngagementWeights): string {
  const w = normalizeWeights(weights);
  return `ER = (Likes × ${w.like} + Comments × ${w.comment} + Reposts × ${w.repost}) ÷ Views`;
}
