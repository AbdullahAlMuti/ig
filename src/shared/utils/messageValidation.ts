/**
 * Runtime Message Validation & Type Guards.
 *
 * Provides strict runtime schema validation for all extension IPC messages
 * (sidepanel <-> background <-> content scripts <-> main world bridge).
 */
import {
  RUNTIME_MSG,
  POST_MSG,
  OVERLAY_MODES,
  type OverlayMode,
  type EngagementWeights,
} from '../types/instagram';

export interface ValidatedMessageResult {
  valid: boolean;
  error?: string;
}

/** Check if value is a plain non-null object */
export function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/** Validate download request message payload */
export function validateDownloadPayload(payload: unknown): ValidatedMessageResult {
  if (!isObject(payload)) {
    return { valid: false, error: 'Payload must be an object.' };
  }

  if (typeof payload.url !== 'string' || payload.url.length === 0 || payload.url.length > 4096) {
    return { valid: false, error: 'Invalid or excessively long download URL.' };
  }

  if (typeof payload.prefix !== 'string' || payload.prefix.length > 256) {
    return { valid: false, error: 'Invalid filename prefix.' };
  }

  return { valid: true };
}

/** Validate overlay mode payload */
export function validateOverlayModeValue(val: unknown): val is OverlayMode {
  return typeof val === 'string' && (OVERLAY_MODES as readonly string[]).includes(val);
}

/** Validate engagement weights payload */
export function validateEngagementWeightsPayload(val: unknown): val is EngagementWeights {
  if (!isObject(val)) return false;
  const { like, comment, repost } = val;
  return (
    typeof like === 'number' &&
    Number.isFinite(like) &&
    like >= 0 &&
    like <= 100 &&
    typeof comment === 'number' &&
    Number.isFinite(comment) &&
    comment >= 0 &&
    comment <= 100 &&
    typeof repost === 'number' &&
    Number.isFinite(repost) &&
    repost >= 0 &&
    repost <= 100
  );
}

/** Validate snapshot root payload from main world */
export function validateSnapshotRootPayload(info: unknown): ValidatedMessageResult {
  if (!info) {
    return { valid: true }; // null / empty snapshot is acceptable
  }

  if (!isObject(info)) {
    return { valid: false, error: 'Snapshot root must be an object.' };
  }

  // Reject oversized snapshot objects
  try {
    const jsonStr = JSON.stringify(info);
    if (jsonStr.length > 15 * 1024 * 1024) {
      return { valid: false, error: 'Snapshot exceeds maximum 15MB size limit.' };
    }
  } catch {
    return { valid: false, error: 'Snapshot failed JSON serialization.' };
  }

  return { valid: true };
}
