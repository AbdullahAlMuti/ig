import { describe, it, expect } from 'vitest';
import {
  normalizeWeights,
  areWeightsValid,
  computeEngagementRate,
  formatErFormula,
} from '../src/shared/utils/engagementCalculator';

describe('engagementCalculator', () => {
  it('normalizes engagement weights correctly', () => {
    const weights = normalizeWeights({ like: 1, comment: 2, repost: 3 });
    expect(weights.like).toBe(1);
    expect(weights.comment).toBe(2);
    expect(weights.repost).toBe(3);
  });

  it('validates invalid weight objects', () => {
    expect(areWeightsValid(null)).toBe(false);
    expect(areWeightsValid({ like: -1, comment: 2, repost: 3 })).toBe(false);
    expect(areWeightsValid({ like: 1, comment: 2, repost: 3 })).toBe(true);
  });

  it('calculates engagement rate with custom weights', () => {
    const item = {
      code: 'test_code',
      likeCount: 100,
      commentCount: 10,
      playCount: 1000,
    };
    const er = computeEngagementRate(item, { like: 1, comment: 2, repost: 3 });
    expect(er).toBeCloseTo(0.12);
  });

  it('formats ER formula string correctly', () => {
    const formula = formatErFormula({ like: 1, comment: 2, repost: 3 });
    expect(formula).toContain('Likes × 1');
    expect(formula).toContain('Comments × 2');
  });
});
