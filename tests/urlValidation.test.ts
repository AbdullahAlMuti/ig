import { describe, it, expect } from 'vitest';
import {
  validateMediaDownloadUrl,
  sanitizeDownloadFilename,
  isAllowedMediaHost,
} from '../src/shared/utils/urlValidation';

describe('urlValidation', () => {
  it('validates allowed Meta CDN hostnames', () => {
    expect(isAllowedMediaHost('instagram.fccu3-1.fna.fbcdn.net')).toBe(true);
    expect(isAllowedMediaHost('scontent.cdninstagram.com')).toBe(true);
    expect(isAllowedMediaHost('www.instagram.com')).toBe(true);
    expect(isAllowedMediaHost('malicious-site.com')).toBe(false);
    expect(isAllowedMediaHost('localhost')).toBe(false);
    expect(isAllowedMediaHost('192.168.1.1')).toBe(false);
  });

  it('rejects unsafe schemes and credentials', () => {
    expect(validateMediaDownloadUrl('javascript:alert(1)').valid).toBe(false);
    expect(validateMediaDownloadUrl('http://scontent.cdninstagram.com/test.mp4').valid).toBe(false);
    expect(validateMediaDownloadUrl('https://user:pass@scontent.cdninstagram.com/test.mp4').valid).toBe(false);
    expect(validateMediaDownloadUrl('https://scontent.cdninstagram.com/test.mp4').valid).toBe(true);
  });

  it('sanitizes download filename prefixes', () => {
    expect(sanitizeDownloadFilename('C:/Windows/System32/cmd.exe')).toBe('C__Windows_System32_cmd_exe');
    expect(sanitizeDownloadFilename('../../secret.txt')).toBe('____secret.txt');
    expect(sanitizeDownloadFilename('my_post_code_1')).toBe('my_post_code_1');
    expect(sanitizeDownloadFilename('')).toBe('media_item');
  });
});
