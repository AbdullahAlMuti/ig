import { describe, it, expect } from 'vitest';
import {
  filterAndSort,
  normalizePerformanceFilters,
  DEFAULT_PERFORMANCE_FILTERS,
} from '../src/shared/utils/sortFilter';
import type { InstagramMediaItem } from '../src/shared/types/instagram';

describe('sortFilter', () => {
  const mockItems: InstagramMediaItem[] = [
    { code: 'post1', likeCount: 1000, commentCount: 50, playCount: 15000, engagementRate: 0.12, createdAt: Math.floor(Date.now() / 1000) - 3600 },
    { code: 'post2', likeCount: 500, commentCount: 200, playCount: 5000, engagementRate: 0.25, createdAt: Math.floor(Date.now() / 1000) - 86400 },
    { code: 'post3', likeCount: 20000, commentCount: 1500, playCount: 250000, engagementRate: 0.08, createdAt: Math.floor(Date.now() / 1000) - 604800 },
    { code: 'post4', likeCount: 10, commentCount: 1, playCount: 100, engagementRate: 0.01, createdAt: Math.floor(Date.now() / 1000) - 1000000 },
    { code: 'post5', likeCount: 300, commentCount: 10, playCount: 12000, engagementRate: 0.05, createdAt: Math.floor(Date.now() / 1000) - 7200 },
    { code: 'post6', likeCount: 1500, commentCount: 80, playCount: 30000, engagementRate: 0.14, createdAt: Math.floor(Date.now() / 1000) - 43200 },
    { code: 'post7', likeCount: 8000, commentCount: 400, playCount: 100000, engagementRate: 0.09, createdAt: Math.floor(Date.now() / 1000) - 172800 },
    { code: 'post8', likeCount: 400, commentCount: 30, playCount: 4000, engagementRate: 0.18, createdAt: Math.floor(Date.now() / 1000) - 1800 },
    { code: 'post9', likeCount: 1200, commentCount: 60, playCount: 18000, engagementRate: 0.11, createdAt: Math.floor(Date.now() / 1000) - 250000 },
    { code: 'post10', likeCount: 50, commentCount: 2, playCount: 800, engagementRate: 0.02, createdAt: Math.floor(Date.now() / 1000) - 500000 },
  ];

  it('normalizes performance filters safely', () => {
    const normalized = normalizePerformanceFilters({
      minScore: 80,
      maxScore: 60, // min > max -> swap
      hasBadgeOnly: true,
      noBadgeOnly: true, // contradictory -> resolve to false
    });
    expect(normalized.minScore).toBe(60);
    expect(normalized.maxScore).toBe(80);
    expect(normalized.hasBadgeOnly).toBe(false);
    expect(normalized.noBadgeOnly).toBe(false);
  });

  it('filters by performance badge correctly', () => {
    const res = filterAndSort(mockItems, {
      days: 0,
      sortKey: '',
      performanceFilters: { ...DEFAULT_PERFORMANCE_FILTERS, badges: ['trending'] },
    });
    expect(res.items.map((i) => i.code)).toEqual(['post1']);
  });

  it('filters by overall rank limit correctly', () => {
    const res = filterAndSort(mockItems, {
      days: 0,
      sortKey: '',
      performanceFilters: { ...DEFAULT_PERFORMANCE_FILTERS, maxOverallRank: 3 },
    });
    expect(res.items.map((i) => i.code).sort()).toEqual(['post3', 'post6', 'post7']);
  });

  it('preserves base ranking counts when performance filter is active', () => {
    const res = filterAndSort(mockItems, {
      days: 0,
      sortKey: '',
      performanceFilters: { ...DEFAULT_PERFORMANCE_FILTERS, badges: ['trending'] },
    });
    expect(res.baseItems.length).toBe(10);
    expect(res.items.length).toBe(1);
    expect(res.rankings.totalCount).toBe(10);
  });
});
