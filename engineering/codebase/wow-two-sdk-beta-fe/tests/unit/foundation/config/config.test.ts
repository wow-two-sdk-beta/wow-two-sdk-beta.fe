import { describe, expect, it } from 'vitest';
import { bool, ConfigError, defineConfig, num, oneOf, staticSource, str } from '@src/foundation/config';

/*
 * Smoke depth, `unit` project (node). `staticSource` keeps the resolution off the ambient
 * `import.meta.env` / `window.__APP_CONFIG__`, so the assertions are about the slice's own
 * policy: a missing required key FAILS LOUDLY AT BOOT with every issue at once, rather than
 * handing the app an `undefined` that surfaces three screens later.
 */

const sources = (values: Record<string, string | undefined>) => [staticSource(values)];

describe('resolution', () => {
  it('parses each field into its declared type', () => {
    const config = defineConfig(
      { API_URL: str(), PAGE_SIZE: num(), DEBUG: bool() },
      { sources: sources({ API_URL: 'https://api.test', PAGE_SIZE: '25', DEBUG: 'true' }) },
    );

    expect(config.API_URL).toBe('https://api.test');
    expect(config.PAGE_SIZE).toBe(25);
    expect(config.DEBUG).toBe(true);
  });

  it('falls back to a declared default when the key is absent', () => {
    const config = defineConfig({ PAGE_SIZE: num({ default: 20 }) }, { sources: sources({}) });
    expect(config.PAGE_SIZE).toBe(20);
  });

  it('applies the key prefix when resolving', () => {
    const config = defineConfig(
      { API_URL: str() },
      { sources: sources({ VITE_API_URL: 'https://api.test' }), prefix: 'VITE_' },
    );

    expect(config.API_URL).toBe('https://api.test');
  });
});

describe('failure', () => {
  it('throws a ConfigError naming every issue, not just the first', () => {
    let thrown: unknown;
    try {
      defineConfig({ API_URL: str(), PAGE_SIZE: num() }, { sources: sources({}) });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ConfigError);
    expect((thrown as ConfigError).issues).toHaveLength(2);
  });

  it('reports an unparseable value as invalid rather than coercing it', () => {
    expect(() => defineConfig({ PAGE_SIZE: num() }, { sources: sources({ PAGE_SIZE: 'twenty' }) })).toThrow(
      ConfigError,
    );
  });

  /* A secret's raw value must never reach the error message — the message is what ends up in a
     boot log or a crash report. */
  it('redacts a secret value from the failure message', () => {
    let thrown: unknown;
    try {
      defineConfig(
        { API_TOKEN: oneOf(['alpha', 'beta'], { secret: true }) },
        { sources: sources({ API_TOKEN: 'super-secret' }) },
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ConfigError);
    expect((thrown as ConfigError).message).not.toContain('super-secret');
  });
});

it('ignores inherited source values and safely resolves reserved keys', () => {
  const schema = { ['__proto__']: str(), constructor: str(), toString: str({ default: 'fallback' }) };
  const config = defineConfig(schema, {
    sources: [
      Object.defineProperties(Object.create({ toString: 'inherited' }), {
        ['__proto__']: { value: 'plain-data', enumerable: true },
        constructor: { value: 'own', enumerable: true },
      }),
    ],
  });
  expect(Object.getPrototypeOf(config)).toBeNull();
  expect(config.__proto__).toBe('plain-data');
  expect(config.constructor).toBe('own');
  expect(config.toString).toBe('fallback');
});
