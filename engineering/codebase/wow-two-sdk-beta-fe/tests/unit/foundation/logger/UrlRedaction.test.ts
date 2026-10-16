import { describe, expect, it } from 'vitest';
import { redactUrl } from '@src/foundation/logger';

describe('redactUrl', () => {
  it('masks credential parameters in the query and keeps the rest as written', () => {
    expect(redactUrl('/api/orders?page=2&token=abc&sort=name%20asc')).toBe(
      '/api/orders?page=2&token=[redacted]&sort=name%20asc',
    );
    expect(redactUrl('https://app.test/callback?code=xyz&STATE=s1')).toBe(
      'https://app.test/callback?code=[redacted]&STATE=[redacted]',
    );
  });

  it('matches encoded parameter names', () => {
    expect(redactUrl('/x?access%5Ftoken=1')).toBe('/x?access%5Ftoken=[redacted]');
  });

  it('drops user-info from the authority', () => {
    expect(redactUrl('https://admin:hunter2@api.test/v1?x=1')).toBe('https://api.test/v1?x=1');
    expect(redactUrl('//user@cdn.test/a.png')).toBe('//cdn.test/a.png');
  });

  it('scrubs implicit-flow fragments and hash-route queries', () => {
    expect(redactUrl('https://app.test/#access_token=t&expires_in=3600')).toBe(
      'https://app.test/#access_token=[redacted]&expires_in=3600',
    );
    expect(redactUrl('/#/reset?otp=123456&email=a')).toBe('/#/reset?otp=[redacted]&email=a');
    expect(redactUrl('/#/orders/42')).toBe('/#/orders/42');
  });

  it('accepts its own parameter list and mask', () => {
    expect(redactUrl('/x?ticket=1&token=2', ['ticket'], '***')).toBe('/x?ticket=***&token=2');
  });

  it('tolerates malformed escapes and parameters without a value', () => {
    expect(redactUrl('/x?%E0%A4%A=1&token&secret=')).toBe('/x?%E0%A4%A=1&token&secret=[redacted]');
  });
});
