import { expect, it } from 'vitest';
import { UrlExtensions as U } from '@src/foundation/dom';
it('allows explicit web navigation and relative destinations under an SSR-safe parser', () => {
  for (const value of ['/path?q=1', '../relative', '#section', 'https://site.test/a', 'mailto:a@b.test', 'tel:+123']) {
    expect(U.safeNavigation(value)).toBe(value);
  }
});
it('rejects executable schemes including control and HTML-reference obfuscation', () => {
  for (const value of [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'java\nscript:alert(1)',
    'javascript&colon;alert(1)',
    'java&#x73;cript:alert(1)',
    'javascript&amp;colon;alert(1)',
    'data:text/html,hi',
    'vbscript:bad',
    null,
  ]) {
    expect(U.safeNavigation(value)).toBeUndefined();
    expect(U.safeResource(value)).toBeUndefined();
  }
});
it('keeps embedded-resource schemes narrower than navigation', () => {
  expect(U.safeResource('mailto:a@b.test')).toBeUndefined();
  expect(U.safeResource('blob:https://site.test/id')).toBe('blob:https://site.test/id');
});
