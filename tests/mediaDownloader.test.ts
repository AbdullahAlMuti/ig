import { describe, it, expect } from 'vitest';
import { buildDownloadEntries, extensionFor } from '../src/shared/utils/mediaDownloader';
import type { InstagramMediaItem } from '../src/shared/types/instagram';

describe('mediaDownloader', () => {
  it('builds 1-indexed carousel download entries with safe filenames', () => {
    const item: InstagramMediaItem = {
      code: 'C12345678',
      carouselMedia: [
        'https://scontent.cdninstagram.com/pic1.jpg',
        'https://scontent.cdninstagram.com/pic2.jpg',
      ],
    };
    const entries = buildDownloadEntries(item);
    expect(entries.length).toBe(2);
    expect(entries[0].prefix).toBe('C12345678_1');
    expect(entries[1].prefix).toBe('C12345678_2');
  });

  it('maps MIME types and URL hints to clean extensions', () => {
    expect(extensionFor('image/jpeg', 'https://cdn.com/test.jpg')).toBe('jpg');
    expect(extensionFor('video/mp4', 'https://cdn.com/test.mp4')).toBe('mp4');
    expect(extensionFor('application/octet-stream', 'https://cdn.com/test.png?query=1')).toBe('png');
  });
});
