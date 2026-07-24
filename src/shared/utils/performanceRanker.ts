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
    description: 'Highest overall performance among the currently visible posts.',
    bgClass: 'bg-amber-500/90',
    borderClass: 'border-amber-400/40',
    textClass: 'text-amber-950',
    iconName: 'Crown',
  },
  'most-engaged': {
    type: 'most-engaged',
    label: 'Most Engaged',
    shortLabel: 'Engaged',
    description: 'Highest engagement rate among the currently visible posts.',
    bgClass: 'bg-purple-600/90',
    borderClass: 'border-purple-400/40',
    textClass: 'text-purple-100',
    iconName: 'Zap',
  },
  'most-liked': {
    type: 'most-liked',
    label: 'Most Liked',
    shortLabel: 'Liked',
    description: 'Highest number of likes among the currently visible posts.',
    bgClass: 'bg-rose-500/90',
    borderClass: 'border-rose-400/40',
    textClass: 'text-white',
    iconName: 'Heart',
  },
  'most-viewed': {
    type: 'most-viewed',
    label: 'Most Viewed',
    shortLabel: 'Viewed',
    description: 'Highest number of views among the currently visible posts.',
    bgClass: 'bg-blue-600/90',
    borderClass: 'border-blue-400/40',
    textClass: 'text-white',
    iconName: 'Eye',
  },
  'best-reach': {
    type: 'best-reach',
    label: 'Best Reach',
    shortLabel: 'Reach',
    description: 'Reached one of the largest audiences in the current selection.',
    bgClass: 'bg-teal-600/90',
    borderClass: 'border-teal-400/40',
    textClass: 'text-white',
    iconName: 'Target',
  },
  'trending': {
    type: 'trending',
    label: 'Trending',
    shortLabel: 'Trending',
    description: 'Growing faster than comparable recent posts.',
    bgClass: 'bg-orange-500/90',
    borderClass: 'border-orange-400/40',
    textClass: 'text-white',
    iconName: 'Flame',
  },
  'rising-post': {
    type: 'rising-post',
    label: 'Rising Post',
    shortLabel: 'Rising',
    description: 'Showing strong early engagement after publishing.',
    bgClass: 'bg-emerald-600/90',
    borderClass: 'border-emerald-400/40',
    textClass: 'text-white',
    iconName: 'Rocket',
  },
  'high-performer': {
    type: 'high-performer',
    label: 'High Performer',
    shortLabel: 'High',
    description: 'Ranks within the top-performing group of the current selection.',
    bgClass: 'bg-indigo-600/90',
    borderClass: 'border-indigo-400/40',
    textClass: 'text-white',
    iconName: 'Star',
  },
};

export interface ItemPerformanceData {
  code: string;
  badge?: PerformanceBadgeInfo;
  overallRank: number;
  overallScore: number;
  likesRank: number;
  commentsRank: number;
  viewsRank: number;
  erRank: number;
  trendingRank: number;
  reachRank: number;
  engagementRatePercent: number;
  secondaryBadges: BadgeType[];
}

export interface RankingResult {
  byCode: Map<string, ItemPerformanceData>;
  totalCount: number;
}

interface IntermediateMetrics {
  item: InstagramMediaItem;
  code: string;
  likes: number;
  comments: number;
  reposts: number;
  views: number;
  er: number;
  ageHours: number;
  totalInteractions: number;
  engagementVelocity: number;
  viewVelocity: number;
  // Normalized metrics
  normLikes: number;
  normComments: number;
  normViews: number;
  normER: number;
  normVelocity: number;
  normViewVelocity: number;
  normRecency: number;
  // Final calculated scores
  overallScoreRaw: number;
  overallScore: number;
  trendingScore: number;
  reachScore: number;
  // Ranks
  overallRank: number;
  likesRank: number;
  commentsRank: number;
  viewsRank: number;
  erRank: number;
  trendingRank: number;
  reachRank: number;
}

/**
 * Calculates multi-metric performance rankings for the given media items.
 * Uses logarithmic scaling, min-max normalization, missing metric redistribution,
 * and priority-based conflict resolution.
 */
export function calculatePerformanceRankings(
  items: InstagramMediaItem[],
  nowSec: number = Math.floor(Date.now() / 1000),
): RankingResult {
  const result: RankingResult = {
    byCode: new Map(),
    totalCount: items.length,
  };

  if (!Array.isArray(items) || items.length === 0) {
    return result;
  }

  // 1. Build initial metrics per item
  const rawList: IntermediateMetrics[] = items.map((item) => {
    const likes = Math.max(0, item.likeCount ?? 0);
    const comments = Math.max(0, item.commentCount ?? 0);
    const reposts = Math.max(0, item.mediaRepostCount ?? 0);
    const views = Math.max(0, item.playCount ?? 0);
    const er = Math.max(0, item.engagementRate ?? 0);
    const ageHours = item.createdAt ? Math.max(1, (nowSec - item.createdAt) / 3600) : 720;
    const totalInteractions = likes + comments * 4 + reposts * 4;
    const engagementVelocity = totalInteractions / Math.max(1, ageHours);
    const viewVelocity = views / Math.max(1, ageHours);

    return {
      item,
      code: item.code,
      likes,
      comments,
      reposts,
      views,
      er,
      ageHours,
      totalInteractions,
      engagementVelocity,
      viewVelocity,
      normLikes: 0,
      normComments: 0,
      normViews: 0,
      normER: 0,
      normVelocity: 0,
      normViewVelocity: 0,
      normRecency: 0,
      overallScoreRaw: 0,
      overallScore: 0,
      trendingScore: 0,
      reachScore: 0,
      overallRank: 0,
      likesRank: 0,
      commentsRank: 0,
      viewsRank: 0,
      erRank: 0,
      trendingRank: 0,
      reachRank: 0,
    };
  });

  // 2. Compute min & max bounds with logarithmic scaling
  let minLogLikes = Infinity, maxLogLikes = -Infinity;
  let minLogComments = Infinity, maxLogComments = -Infinity;
  let minLogViews = Infinity, maxLogViews = -Infinity;
  let minER = Infinity, maxER = -Infinity;
  let minLogVel = Infinity, maxLogVel = -Infinity;
  let minLogViewVel = Infinity, maxLogViewVel = -Infinity;
  let minAge = Infinity, maxAge = -Infinity;

  rawList.forEach((m) => {
    const logL = Math.log10(m.likes + 1);
    const logC = Math.log10(m.comments + 1);
    const logV = Math.log10(m.views + 1);
    const logVel = Math.log10(m.engagementVelocity + 1);
    const logVVel = Math.log10(m.viewVelocity + 1);

    if (logL < minLogLikes) minLogLikes = logL;
    if (logL > maxLogLikes) maxLogLikes = logL;
    if (logC < minLogComments) minLogComments = logC;
    if (logC > maxLogComments) maxLogComments = logC;
    if (logV < minLogViews) minLogViews = logV;
    if (logV > maxLogViews) maxLogViews = logV;
    if (m.er < minER) minER = m.er;
    if (m.er > maxER) maxER = m.er;
    if (logVel < minLogVel) minLogVel = logVel;
    if (logVel > maxLogVel) maxLogVel = logVel;
    if (logVVel < minLogViewVel) minLogViewVel = logVVel;
    if (logVVel > maxLogViewVel) maxLogViewVel = logVVel;
    if (m.ageHours < minAge) minAge = m.ageHours;
    if (m.ageHours > maxAge) maxAge = m.ageHours;
  });

  // Helper scale function
  const scale = (val: number, min: number, max: number) =>
    max > min ? (val - min) / (max - min) : 0.5;

  const hasViewsData = maxLogViews > 0;
  const hasCommentsData = maxLogComments > 0;

  // Weight adjustments if metrics are missing across entire dataset
  let wER = 0.35;
  let wLikes = 0.20;
  let wComments = 0.15;
  let wViews = 0.15;
  let wRecency = 0.08;
  let wVelocity = 0.07;

  if (!hasViewsData) {
    wLikes += 0.08;
    wComments += 0.07;
    wViews = 0;
  }
  if (!hasCommentsData) {
    wLikes += 0.15;
    wComments = 0;
  }

  // 3. Normalize & calculate scores
  rawList.forEach((m) => {
    const logL = Math.log10(m.likes + 1);
    const logC = Math.log10(m.comments + 1);
    const logV = Math.log10(m.views + 1);
    const logVel = Math.log10(m.engagementVelocity + 1);
    const logVVel = Math.log10(m.viewVelocity + 1);

    m.normLikes = scale(logL, minLogLikes, maxLogLikes);
    m.normComments = scale(logC, minLogComments, maxLogComments);
    m.normViews = scale(logV, minLogViews, maxLogViews);
    m.normER = scale(m.er, minER, maxER);
    m.normVelocity = scale(logVel, minLogVel, maxLogVel);
    m.normViewVelocity = scale(logVVel, minLogViewVel, maxLogViewVel);
    m.normRecency = 1 - scale(m.ageHours, minAge, maxAge);

    m.overallScoreRaw =
      m.normER * wER +
      m.normLikes * wLikes +
      m.normComments * wComments +
      m.normViews * wViews +
      m.normRecency * wRecency +
      m.normVelocity * wVelocity;

    m.overallScore = Math.round(m.overallScoreRaw * 100);
    m.trendingScore = m.normVelocity * 0.60 + m.normViewVelocity * 0.25 + m.normER * 0.15;
    m.reachScore = m.normViews * 0.75 + m.normViewVelocity * 0.25;
  });

  // 4. Generate 1-based ranks for each metric
  const rankBy = (key: keyof IntermediateMetrics, asc = false) => {
    const sorted = [...rawList].sort((a, b) => {
      const va = Number(a[key]);
      const vb = Number(b[key]);
      return asc ? va - vb : vb - va;
    });
    return sorted;
  };

  const byOverall = rankBy('overallScoreRaw');
  byOverall.forEach((m, idx) => (m.overallRank = idx + 1));

  const byLikes = rankBy('likes');
  byLikes.forEach((m, idx) => (m.likesRank = idx + 1));

  const byComments = rankBy('comments');
  byComments.forEach((m, idx) => (m.commentsRank = idx + 1));

  const byViews = rankBy('views');
  byViews.forEach((m, idx) => (m.viewsRank = idx + 1));

  const byER = rankBy('er');
  byER.forEach((m, idx) => (m.erRank = idx + 1));

  const byTrending = rankBy('trendingScore');
  byTrending.forEach((m, idx) => (m.trendingRank = idx + 1));

  const byReach = rankBy('reachScore');
  byReach.forEach((m, idx) => (m.reachRank = idx + 1));

  // Map for easy lookup
  const metricMap = new Map<string, IntermediateMetrics>();
  rawList.forEach((m) => metricMap.set(m.code, m));

  // 5. Selective Badge Assignment Pipeline
  const assignedBadge = new Map<string, BadgeType>();
  const secondaryMap = new Map<string, BadgeType[]>();

  const addSecondary = (code: string, b: BadgeType) => {
    const list = secondaryMap.get(code) ?? [];
    if (!list.includes(b)) {
      list.push(b);
      secondaryMap.set(code, list);
    }
  };

  const total = rawList.length;

  // Selective rule thresholds based on dataset size:
  // 1-4 items: Only Top Performer
  // 5-7 items: Top Performer, Most Engaged, Most Liked
  // 8+ items: Full badge system

  // Category 1: Top Performer (#1 Overall)
  if (byOverall.length > 0) {
    const topItem = byOverall[0];
    assignedBadge.set(topItem.code, 'top-performer');
    addSecondary(topItem.code, 'top-performer');
  }

  // Category 2: Most Engaged (#1 ER)
  if (total >= 5 && byER.length > 0) {
    let candidate = byER.find((m) => !assignedBadge.has(m.code));
    if (!candidate && byER.length > 0) {
      candidate = byER[0]; // If #1 ER is also #1 Overall
    }
    if (candidate && candidate.er > 0) {
      if (!assignedBadge.has(candidate.code)) {
        assignedBadge.set(candidate.code, 'most-engaged');
      }
      addSecondary(candidate.code, 'most-engaged');
    }
  }

  // Category 3: Most Liked (#1 Likes)
  if (total >= 5 && byLikes.length > 0) {
    let candidate = byLikes.find((m) => !assignedBadge.has(m.code));
    if (!candidate && byLikes.length > 0) {
      candidate = byLikes[0];
    }
    if (candidate && candidate.likes > 0) {
      if (!assignedBadge.has(candidate.code)) {
        assignedBadge.set(candidate.code, 'most-liked');
      }
      addSecondary(candidate.code, 'most-liked');
    }
  }

  // Category 4: Most Viewed (#1 Views)
  if (total >= 8 && byViews.length > 0) {
    let candidate = byViews.find((m) => !assignedBadge.has(m.code));
    if (!candidate && byViews.length > 0) {
      candidate = byViews[0];
    }
    if (candidate && candidate.views > 0) {
      if (!assignedBadge.has(candidate.code)) {
        assignedBadge.set(candidate.code, 'most-viewed');
      }
      addSecondary(candidate.code, 'most-viewed');
    }
  }

  // Category 5: Trending (Published < 14d, top 15% velocity, totalInteractions >= 5)
  if (total >= 8) {
    const trendingCandidates = byTrending.filter(
      (m) => m.ageHours <= 336 && m.totalInteractions >= 5 && m.trendingRank <= Math.max(1, Math.ceil(total * 0.15)),
    );
    for (const cand of trendingCandidates) {
      addSecondary(cand.code, 'trending');
      if (!assignedBadge.has(cand.code)) {
        assignedBadge.set(cand.code, 'trending');
        break; // Only assign main badge to top trending
      }
    }
  }

  // Category 6: Best Reach (Top 15% reach score, views > 0)
  if (total >= 8 && hasViewsData) {
    const reachCandidates = byReach.filter(
      (m) => m.views > 0 && m.reachRank <= Math.max(1, Math.ceil(total * 0.15)),
    );
    for (const cand of reachCandidates) {
      addSecondary(cand.code, 'best-reach');
      if (!assignedBadge.has(cand.code)) {
        assignedBadge.set(cand.code, 'best-reach');
        break;
      }
    }
  }

  // Category 7: Rising Post (Published < 72h, top 25% velocity, totalInteractions >= 3)
  if (total >= 8) {
    const risingCandidates = byTrending.filter(
      (m) => m.ageHours <= 72 && m.totalInteractions >= 3 && m.trendingRank <= Math.max(1, Math.ceil(total * 0.25)),
    );
    for (const cand of risingCandidates) {
      addSecondary(cand.code, 'rising-post');
      if (!assignedBadge.has(cand.code)) {
        assignedBadge.set(cand.code, 'rising-post');
        break;
      }
    }
  }

  // Category 8: High Performer (Top 15% overall score, dataset >= 8)
  if (total >= 8) {
    const cutoffRank = Math.max(2, Math.ceil(total * 0.15));
    byOverall.forEach((m) => {
      if (m.overallRank <= cutoffRank) {
        addSecondary(m.code, 'high-performer');
        if (!assignedBadge.has(m.code)) {
          assignedBadge.set(m.code, 'high-performer');
        }
      }
    });
  }

  // 6. Build final ItemPerformanceData objects
  rawList.forEach((m) => {
    const mainBadgeType = assignedBadge.get(m.code);
    const badge = mainBadgeType ? BADGE_METADATA[mainBadgeType] : undefined;
    const secondary = secondaryMap.get(m.code) ?? [];

    result.byCode.set(m.code, {
      code: m.code,
      badge,
      overallRank: m.overallRank,
      overallScore: m.overallScore,
      likesRank: m.likesRank,
      commentsRank: m.commentsRank,
      viewsRank: m.viewsRank,
      erRank: m.erRank,
      trendingRank: m.trendingRank,
      reachRank: m.reachRank,
      engagementRatePercent: Number((m.er * 100).toFixed(2)),
      secondaryBadges: secondary,
    });
  });

  return result;
}
