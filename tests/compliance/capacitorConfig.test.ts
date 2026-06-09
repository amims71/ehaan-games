import { describe, it, expect } from 'vitest';
import { hasNoServerUrl } from '@/compliance/assertions';
import capacitorConfig from '../../capacitor.config';

describe('hasNoServerUrl', () => {
  it('returns true for a config without server.url', () => {
    expect(hasNoServerUrl({ appId: 'x', appName: 'y', webDir: 'dist' })).toBe(true);
  });

  it('returns false when server.url is present', () => {
    expect(hasNoServerUrl({ server: { url: 'http://192.168.0.2' } })).toBe(false);
  });

  it('asserts the SHIPPED capacitor.config.ts has no server.url (kids-store thin-wrapper guard)', () => {
    expect(hasNoServerUrl(capacitorConfig as unknown as Record<string, unknown>)).toBe(true);
  });
});
