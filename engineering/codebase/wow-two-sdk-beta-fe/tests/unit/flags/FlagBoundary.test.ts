import type { Result } from '@src/foundation/results';
import { expect, expectTypeOf, it, vi } from 'vitest';
import { createFlagClient, FlagErrorCode, FlagReason, staticFlagProvider, type FlagProvider } from '@src/flags';

it('treats inherited flag names as absent and inherited context keys as non-targeting', () => {
  const provider = staticFlagProvider(Object.create({ beta: true }));
  expect(provider.resolveBoolean('beta', {})).toBeUndefined();
  expect(provider.resolveObject('constructor', {})).toBeUndefined();
  const targeted = staticFlagProvider({ beta: { value: false, rules: [{ when: { plan: 'pro' }, value: true }] } });
  expect(targeted.resolveBoolean('beta', Object.create({ plan: 'pro' }))?.value).toBe(false);
  const inheritedValue = Object.assign(Object.create({ value: true }), { own: false });
  expect(staticFlagProvider({ object: inheritedValue }).resolveObject('object', {})?.value).toBe(inheritedValue);
});

it('freezes even the empty initial context', () => {
  expect(Object.isFrozen(createFlagClient().getContext())).toBe(true);
});

it('contains malformed resolutions and throwing provider accessors', () => {
  const onError = vi.fn();
  const provider: FlagProvider = { ...staticFlagProvider(), resolveBoolean: () => null as never };
  const client = createFlagClient({ provider, onError });
  expect(client.evaluateBoolean('beta', true)).toMatchObject({
    value: true,
    reason: FlagReason.Error,
    errorCode: FlagErrorCode.ProviderError,
  });
  const hostile = {
    get value(): boolean {
      throw new Error('unreadable');
    },
  };
  const getter = createFlagClient({ provider: { ...provider, resolveBoolean: () => hostile }, onError });
  expect(getter.getBoolean('beta', false)).toBe(false);
  expect(onError).toHaveBeenCalledTimes(2);
});

it('widens scalar fallback literals and decodes object flags through Result', () => {
  const flags = createFlagClient({
    provider: staticFlagProvider({ theme: 'dark', settings: { limit: 50 }, bad: { limit: 'no' } }),
  });
  const value = flags.getValue('theme', 'light');
  expectTypeOf(value).toEqualTypeOf<string>();
  expect(value).toBe('dark');
  const decode = (raw: unknown): Result<{ limit: number }, string> => {
    if (typeof raw !== 'object' || raw === null || !Object.hasOwn(raw, 'limit'))
      return { ok: false, failure: 'missing limit' };
    const limit = (raw as Record<string, unknown>).limit;
    return typeof limit === 'number' ? { ok: true, value: { limit } } : { ok: false, failure: 'invalid limit' };
  };
  expect(flags.getObject('settings', { limit: 10 }, decode)).toEqual({ limit: 50 });
  expect(flags.evaluateObject('bad', { limit: 10 }, decode)).toMatchObject({
    value: { limit: 10 },
    errorCode: FlagErrorCode.TypeMismatch,
  });
  expect(flags.evaluate('nan', NaN)).toMatchObject({ errorCode: FlagErrorCode.InvalidDefault });
});

it('contains invalid metadata and reports invalid number fallbacks', () => {
  const provider: FlagProvider = {
    ...staticFlagProvider(),
    resolveBoolean: () => ({ value: true, reason: 'invalid' }) as never,
  };
  expect(createFlagClient({ provider }).evaluateBoolean('beta', false)).toMatchObject({
    value: false,
    errorCode: FlagErrorCode.ProviderError,
  });
  expect(createFlagClient().evaluateNumber('count', NaN)).toMatchObject({ errorCode: FlagErrorCode.InvalidDefault });
});
