import type { InstagramMediaItem } from '../types/instagram';

export type BadgeType =
  | 'top-performer'
  | 'most-engaged'
  | 'most-liked'
  | 'most-viewed'
  | 'best-reach'
  | 'trending'
  | 'rising-post'
  | 'high-performer';

export interface PerformanceBadgeInfo {
  type: BadgeType;
  label: string;
  shortLabel: string;
  description: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  iconName: 'Crown' | 'Zap' | 'Heart' | 'Eye' | 'Target' | 'Flame' | 'Rocket' | 'Star';
}

export const BADGE_METADATA: Record<BadgeType, PerformanceBadgeInfo> = {
  'top-performer': {
    type: 'top-performer',
    label: 'Top Performer',
    shortLabel: 'Top',
    description: 'Highest overall performance in the selected date-range comparison set.',
    bgClass: 'bg-amber-500/90',
    borderClass: 'border-amber-400/40',
    textClass: 'text-amber-950',
    iconName: 'Crown',
  },
  'most-engaged': {
    type: 'most-engaged',
    label: 'Most Engaged',
    shortLabel: 'Engaged',
    description: 'Highest engagement rate in the selected date-range comparison set.',
    bgClass: 'bg-purple-600/90',
    borderClass: 'border-purple-400/40',
    textClass: 'text-purple-100',
    iconName: 'Zap',
  },
  'most-liked': {
    type: 'most-liked',
    label: 'Most Liked',
    shortLabel: 'Liked',
    description: 'Highest number of likes in the selected date-range comparison set.',
    bgClass: 'bg-rose-500/90',
    borderClass: 'border-rose-400/40',
    textClass: 'text-white',
    iconName: 'Heart',
  },
  'most-viewed': {
    type: 'most-viewed',
    label: 'Most Viewed',
    shortLabel: 'Viewed',
    description: 'Highest number of views in the selected date-range comparison set.',
    bgClass: 'bg-blue-600/90',
    borderClass: 'border-blue-400/40',
    textClass: 'text-white',
    iconName: 'Eye',
  },
  'best-reach': {
    type: 'best-reach',
    label: 'Best Reach',
    shortLabel: 'Reach',
    description: 'Reached one of the largest audiences in the selected date-range comparison set.',
    bgClass: 'bg-teal-600/90',
    borderClass: 'border-teal-400/40',
    textClass: 'text-white',
    iconName: 'Target',
  },
  'trending': {
    type: 'trending',
    label: 'Trending',
    shortLabel: 'Trending',
    description: 'Growing faster than comparable recent posts in the comparison set.',
    bgClass: 'bg-orange-500/90',
    borderClass: 'border-orange-400/40',
    textClass: 'text-white',
    iconName: 'Flame',
  },
  'rising-post': {
    type: 'rising-post',
    label: 'Rising Post',
    shortLabel: 'Rising',
    description: 'High early growth trajectory published within 72 hours.',
    bgClass: 'bg-emerald-600/90',
    borderClass: 'border-emerald-400/40',
    textClass: 'text-white',
    iconName: 'Rocket',
  },
  'high-performer': {
    type: 'high-performer',
    label: 'High Performer',
    shortLabel: 'High',
    description: 'Top 15% overall performance score in the selected comparison set.',
    bgClass: 'bg-indigo-600/90',
    borderClass: 'border-indigo-400/40',
    textClass: 'text-white',
    iconName: 'Star',
  },
};

export interface ItemPerformanceData {
  code: string;
  overallScore: number; // 0..100
  overallRank: number; // 1..N
  erRank: number;
  likesRank: number;
  commentsRank: number;
  viewsRank: number;
  badge: PerformanceBadgeInfo | null;
  engagementRatePercent: number;
  achievements: string[];
}

export interface RankingResult {
  totalCount: number;
  byCode: Map<string, ItemPerformanceData>;
}

function safeLog10(val: number | undefined | null): number {
  if (val == null || !Number.isFinite(val) || val <= 0) return 0;
  return Math.log10(val + 1);
}

function minMaxNormalize(val: number, min: number, max: number): number {
  if (max === min) return 1.0;
  return Math.max(0, Math.min(1.0, (val - min) / (max - min)));
}

export function calculatePerformanceRankings(items: InstagramMediaItem[]): RankingResult {
  const result: RankingResult = {
    totalCount: items.length,
    byCode: new Map(),
  };

  if (!items || items.length === 0) return result;

  const validItems = items.filter((i) => Boolean(i && i.code));
  if (validItems.length === 0) return result;

  const nowSec = Math.floor(Date.now() / 1000);

  // Collect logarithmic raw metrics
  const logERs = validItems.map((i) => safeLog10(i.engagementRate != null ? i.engagementRate * 100 : 0));
  const logLikes = validItems.map((i) => safeLog10(i.likeCount));
  const logComments = validItems.map((i) => safeLog10(i.commentCount));
  const logViews = validItems.map((i) => safeLog10(i.playCount));

  // Determine min/max for normalization
  const minER = Math.min(...logERs);
  const maxER = Math.max(...logERs);

  const minLikes = Math.min(...logLikes);
  const maxLikes = Math.max(...logLikes);

  const minComments = Math.min(...logComments);
  const maxComments = Math.max(...logComments);

  const minViews = Math.min(...logViews);
  const maxViews = Math.max(...logViews);

  const hasViewData = validItems.some((i) => i.playCount != null && i.playCount > 0);

  // Compute individual normalized composite scores
  const intermediate = validItems.map((item, idx) => {
    const normER = minMaxNormalize(logERs[idx], minER, maxER);
    const normLikes = minMaxNormalize(logLikes[idx], minLikes, maxLikes);
    const normComments = minMaxNormalize(logComments[idx], minComments, maxComments);
    const normViews = hasViewData ? minMaxNormalize(logViews[idx], minViews, maxViews) : 0;

    // Recency & Velocity calculations
    const ageHours = item.createdAt != null ? Math.max(0.5, (nowSec - item.createdAt) / 3600) : 168;
    const recencyFactor = Math.max(0, 1 - ageHours / 336); // 14-day window

    const totalEng = (item.likeCount ?? 0) + (item.commentCount ?? 0) * 2;
    const velocity = totalEng / Math.pow(ageHours + 2, 1.2);
    const logVelocity = safeLog10(velocity);

    // Weights redistribution if view data is completely missing
    let wER = 0.35;
    let wLikes = 0.20;
    let wComments = 0.15;
    let wViews = 0.15;
    let wRecency = 0.08;
    let wVelocity = 0.07;

    if (!hasViewData) {
      wViews = 0;
      wLikes += 0.08;
      wComments += 0.07;
    }

    const rawComposite =
      normER * wER +
      normLikes * wLikes +
      normComments * wComments +
      normViews * wViews +
      recencyFactor * wRecency +
      logVelocity * wVelocity;

    const overallScore = Math.round(Math.max(0, Math.min(100, rawComposite * 100)));

    return {
      item,
      overallScore,
      erVal: item.engagementRate ?? 0,
      likesVal: item.likeCount ?? 0,
      commentsVal: item.commentCount ?? 0,
      viewsVal: item.playCount ?? 0,
      ageHours,
      logVelocity,
    };
  });

  // Calculate individual dimension ranks with deterministic tie breaks
  const rankByOverall = [...intermediate].sort((a, b) => {
    if (b.overallScore !== a.overallScore) return b.overallScore - a.overallScore;
    return a.item.code.localeCompare(b.item.code);
  });

  const rankByER = [...intermediate].sort((a, b) => {
    if (b.erVal !== a.erVal) return b.erVal - a.erVal;
    return a.item.code.localeCompare(b.item.code);
  });

  const rankByLikes = [...intermediate].sort((a, b) => {
    if (b.likesVal !== a.likesVal) return b.likesVal - a.likesVal;
    return a.item.code.localeCompare(b.item.code);
  });

  const rankByComments = [...intermediate].sort((a, b) => {
    if (b.commentsVal !== a.commentsVal) return b.commentsVal - a.commentsVal;
    return a.item.code.localeCompare(b.item.code);
  });

  const rankByViews = [...intermediate].sort((a, b) => {
    if (b.viewsVal !== a.viewsVal) return b.viewsVal - a.viewsVal;
    return a.item.code.localeCompare(b.item.code);
  });

  const overallRankMap = new Map<string, number>();
  rankByOverall.forEach((obj, idx) => overallRankMap.set(obj.item.code, idx + 1));

  const erRankMap = new Map<string, number>();
  rankByER.forEach((obj, idx) => erRankMap.set(obj.item.code, idx + 1));

  const likesRankMap = new Map<string, number>();
  rankByLikes.forEach((obj, idx) => likesRankMap.set(obj.item.code, idx + 1));

  const commentsRankMap = new Map<string, number>();
  rankByComments.forEach((obj, idx) => commentsRankMap.set(obj.item.code, idx + 1));

  const viewsRankMap = new Map<string, number>();
  rankByViews.forEach((obj, idx) => viewsRankMap.set(obj.item.code, idx + 1));

  // Velocity ranking
  const rankByVelocity = [...intermediate].sort((a, b) => b.logVelocity - a.logVelocity);
  const velocityRankMap = new Map<string, number>();
  rankByVelocity.forEach((obj, idx) => velocityRankMap.set(obj.item.code, idx + 1));

  const count = validItems.length;

  // Selective badge assignment rules
  const assignedBadges = new Map<string, BadgeType>();

  if (count >= 1) {
    const topCode = rankByOverall[0].item.code;
    assignedBadges.set(topCode, 'top-performer');
  }

  if (count >= 5) {
    const bestErObj = rankByER.find((o) => !assignedBadges.has(o.item.code));
    if (bestErObj && bestErObj.erVal > 0) {
      assignedBadges.set(bestErObj.item.code, 'most-engaged');
    }

    const bestLikesObj = rankByLikes.find((o) => !assignedBadges.has(o.item.code));
    if (bestLikesObj && bestLikesObj.likesVal > 0) {
      assignedBadges.set(bestLikesObj.item.code, 'most-liked');
    }
  }

  if (count >= 8) {
    if (hasViewData) {
      const bestViewsObj = rankByViews.find((o) => !assignedBadges.has(o.item.code));
      if (bestViewsObj && bestViewsObj.viewsVal > 0) {
        assignedBadges.set(bestViewsObj.item.code, 'most-viewed');
      }

      const bestReachObj = rankByViews.find(
        (o) =>
          !assignedBadges.has(o.item.code) &&
          (viewsRankMap.get(o.item.code) ?? 99) <= Math.max(2, Math.ceil(count * 0.15)),
      );
      if (bestReachObj) {
        assignedBadges.set(bestReachObj.item.code, 'best-reach');
      }
    }

    const trendingCandidate = rankByVelocity.find(
      (o) =>
        !assignedBadges.has(o.item.code) &&
        o.ageHours <= 336 &&
        (velocityRankMap.get(o.item.code) ?? 99) <= Math.max(2, Math.ceil(count * 0.15)),
    );
    if (trendingCandidate) {
      assignedBadges.set(trendingCandidate.item.code, 'trending');
    }

    const risingCandidate = rankByVelocity.find(
      (o) =>
        !assignedBadges.has(o.item.code) &&
        o.ageHours <= 72 &&
        (velocityRankMap.get(o.item.code) ?? 99) <= Math.max(2, Math.ceil(count * 0.25)),
    );
    if (risingCandidate) {
      assignedBadges.set(risingCandidate.item.code, 'rising-post');
    }

    const top15Cutoff = Math.max(1, Math.ceil(count * 0.15));
    for (const obj of rankByOverall) {
      const rank = overallRankMap.get(obj.item.code) ?? 99;
      if (rank <= top15Cutoff && !assignedBadges.has(obj.item.code)) {
        assignedBadges.set(obj.item.code, 'high-performer');
      }
    }
  }

  // Construct item performance records
  intermediate.forEach((obj) => {
    const code = obj.item.code;
    const badgeKey = assignedBadges.get(code);
    const badge = badgeKey ? BADGE_METADATA[badgeKey] : null;

    const oRank = overallRankMap.get(code) ?? 0;
    const eRank = erRankMap.get(code) ?? 0;
    const lRank = likesRankMap.get(code) ?? 0;
    const cRank = commentsRankMap.get(code) ?? 0;
    const vRank = viewsRankMap.get(code) ?? 0;

    const achievements: string[] = [];
    if (oRank === 1) achievements.push('👑 #1 Overall Performance');
    if (eRank === 1) achievements.push('⚡ #1 Highest Engagement Rate');
    if (lRank === 1) achievements.push('❤️ #1 Most Liked');
    if (cRank === 1) achievements.push('💬 #1 Most Commented');
    if (vRank === 1 && hasViewData) achievements.push('👁️ #1 Most Viewed');

    result.byCode.set(code, {
      code,
      overallScore: obj.overallScore,
      overallRank: oRank,
      erRank: eRank,
      likesRank: lRank,
      commentsRank: cRank,
      viewsRank: vRank,
      badge,
      engagementRatePercent: Number((obj.erVal * 100).toFixed(2)),
      achievements,
    });
  });

  return result;
}
