import { describe, expect, it } from 'vitest';
import { createFlagClient, FlagReason, staticFlagProvider } from '@src/flags';

/*
 * Smoke depth, `unit` project (node). The client's defining contract is that it NEVER hands the
 * caller a surprise: an unconfigured key, a provider that throws, and a value of the wrong
 * runtime type all resolve to the caller's default. A flag layer that can throw is a flag layer
 * that takes the app down on a bad payload from the flag vendor.
 */

const client = (flags: Parameters<typeof staticFlagProvider>[0] = {}) =>
  createFlagClient({ provider: staticFlagProvider(flags) });

describe('resolution', () => {
  it('reads a configured value', () => {
    expect(client({ newCheckout: true }).getBoolean('newCheckout', false)).toBe(true);
  });

  it('falls back to the caller default for an unconfigured key', () => {
    const evaluation = client().evaluateBoolean('missing', true);

    expect(evaluation.value).toBe(true);
    expect(evaluation.reason).toBe(FlagReason.Default);
  });

  it('reports `static` for a plainly configured value', () => {
    expect(client({ theme: 'dark' }).evaluateString('theme', 'light').reason).toBe(FlagReason.Static);
  });

  it('honours a disabled definition', () => {
    const evaluation = client({ beta: { value: true, disabled: true } }).evaluateBoolean('beta', false);
    expect(evaluation.reason).toBe(FlagReason.Disabled);
  });
});

describe('targeting', () => {
  it('applies a matching rule ahead of the base value', () => {
    const targeted = client({
      newCheckout: { value: false, rules: [{ when: { tier: 'pro' }, value: true }] },
    });

    expect(targeted.getBoolean('newCheckout', false, { tier: 'pro' })).toBe(true);
    expect(targeted.getBoolean('newCheckout', false, { tier: 'free' })).toBe(false);
  });
});

describe('the never-surprise contract', () => {
  /* A mistyped map reaches the client's runtime type check — the typed accessors deliberately
     cast rather than validate, so this is the only place the mismatch can be caught. */
  it('rejects a value of the wrong runtime type and uses the default', () => {
    const evaluation = client({ pageSize: 'not a number' }).evaluateNumber('pageSize', 20);

    expect(evaluation.value).toBe(20);
    expect(evaluation.reason).toBe(FlagReason.Error);
  });

  it('survives a provider that throws', () => {
    const down = (): never => {
      throw new Error('flag service down');
    };
    const throwing = createFlagClient({
      provider: {
        name: 'throwing',
        resolveBoolean: down,
        resolveString: down,
        resolveNumber: down,
        resolveObject: down,
      },
    });

    expect(() => throwing.getBoolean('anything', false)).not.toThrow();
    expect(throwing.getBoolean('anything', true)).toBe(true);
  });

  it('picks the typed path from the default value on getValue', () => {
    const typed = client({ theme: 'dark', pageSize: 50, beta: true });

    expect(typed.getValue('theme', 'light')).toBe('dark');
    expect(typed.getValue('pageSize', 20)).toBe(50);
    expect(typed.getValue('beta', false)).toBe(true);
  });
});

it('isolates targeting array snapshots from caller mutation', () => {
  const roles = ['reader'];
  const flags = createFlagClient({ context: { roles } });
  roles.push('admin');
  expect(flags.getContext().roles).toEqual(['reader']);
  expect(Object.isFrozen(flags.getContext())).toBe(true);
});
it('notifies evaluations when the current async provider refresh finishes', async () => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const provider = { ...staticFlagProvider(), onContextChange: () => pending };
  const flags = createFlagClient({ provider });
  let notifications = 0;
  flags.subscribe(() => {
    notifications += 1;
  });
  flags.setContext({ user: 'a' });
  expect(notifications).toBe(1);
  release();
  await pending;
  await Promise.resolve();
  expect(notifications).toBe(2);
});
