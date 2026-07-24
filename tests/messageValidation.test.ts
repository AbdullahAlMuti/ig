import { describe, it, expect } from 'vitest';
import { validateSnapshotRootPayload } from '../src/shared/utils/messageValidation';

describe('messageValidation', () => {
  it('accepts array snapshot root payload', () => {
    const sampleArray = [{ code: 'P123', likeCount: 100 }, { code: 'P456', likeCount: 200 }];
    const res = validateSnapshotRootPayload(sampleArray);
    expect(res.valid).toBe(true);
  });

  it('accepts null or empty snapshot payload', () => {
    expect(validateSnapshotRootPayload(null).valid).toBe(true);
    expect(validateSnapshotRootPayload(undefined).valid).toBe(true);
  });

  it('rejects primitive values as snapshot root', () => {
    expect(validateSnapshotRootPayload('invalid_string').valid).toBe(false);
    expect(validateSnapshotRootPayload(12345).valid).toBe(false);
  });
});
