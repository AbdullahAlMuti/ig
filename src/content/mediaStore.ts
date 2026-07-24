/**
 * In-memory capture store (MAIN world).
 *
 * Holds every normalized post keyed by shortcode, plus id→code and pk→code
 * indexes used to resolve posts from React Fiber props, and an author
 * dictionary merged onto posts at snapshot time. Insertion order is the
 * "Default" sort order surfaced in the side panel.
 */
import {
  type InstagramMediaItem,
  type InstagramUserRecord,
  type EngagementWeights,
  DEFAULT_ER_WEIGHTS,
} from '../shared/types/instagram';
import { normalizeWeights, recalcEngagementRates } from '../shared/utils/engagementCalculator';

export class MediaStore {
  readonly byCode = new Map<string, InstagramMediaItem>();
  readonly idToCode = new Map<string, string>();
  readonly pkToCode = new Map<string, string>();
  readonly users = new Map<string, InstagramUserRecord>();
  /** Shortcodes whose thumbnail is currently being fetched → base64. */
  readonly thumbInFlight = new Set<string>();

  weights: EngagementWeights = { ...DEFAULT_ER_WEIGHTS };
  revision = 0;

  get size(): number {
    return this.byCode.size;
  }

  getByCode(code: string | undefined | null): InstagramMediaItem | undefined {
    return code ? this.byCode.get(code) : undefined;
  }

  getById(id: string | undefined | null): InstagramMediaItem | undefined {
    if (!id) return undefined;
    const code = this.idToCode.get(id);
    return code ? this.byCode.get(code) : undefined;
  }

  getByPk(pk: string | number | undefined | null): InstagramMediaItem | undefined {
    if (pk == null) return undefined;
    const code = this.pkToCode.get(String(pk));
    return code ? this.byCode.get(code) : undefined;
  }

  /** Update ER weights and recompute engagement across all stored posts. */
  setWeights(input: unknown): void {
    this.weights = normalizeWeights(input);
    recalcEngagementRates([...this.byCode.values()], this.weights);
    this.revision++;
  }

  upsertUser(user: InstagramUserRecord | undefined | null): void {
    if (user?.id && !this.users.has(user.id)) {
      this.users.set(user.id, user);
      this.revision++;
    }
  }

  /**
   * Enriched snapshot in capture order. Author fields are merged from the
   * user dictionary so profile stats ride along into the panel + Excel.
   */
  snapshot(): InstagramMediaItem[] {
    const list = [...this.byCode.values()];
    for (const item of list) {
      if (item.userId && this.users.has(item.userId)) {
        const u = this.users.get(item.userId)!;
        if (u.username) item.username = u.username;
        item.userFollowerCount = u.follower_count;
        item.userFollowingCount = u.following_count;
        item.userMediaCount = u.media_count;
        item.userTotalClipsCount = u.total_clips_count;
        item.userBiography = u.biography;
        item.externalUrl = u.external_url;
        item.cityName = u.city_name;
        item.isBusiness = u.is_business;
      }
    }
    return list;
  }
}

/** Process-wide singleton for the MAIN world. */
export const store = new MediaStore();
