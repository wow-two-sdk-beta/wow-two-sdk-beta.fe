import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  defaultSources,
  defineConfig,
  importMetaEnvSource,
  str,
  url,
  windowConfigSource,
  type ConfigEnv,
} from '@src/foundation/config';

/*
 * `unit` project (node). The app's build-time env reaches the package only as an argument: a bundler replaces
 * `import.meta.env` in the app's own modules, never inside the prebuilt package. These tests call the source the
 * way an app module does — with this test module's own `import.meta.env`, which vitest populates.
 */

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('importMetaEnvSource', () => {
  it("reads the caller's own import.meta.env, including a value stubbed after startup", () => {
    vi.stubEnv('VITE_SENTINEL', 'consumer-sentinel');
    const source = importMetaEnvSource(import.meta.env);
    expect(source.VITE_SENTINEL).toBe('consumer-sentinel');
    expect(source.MODE).toBe(import.meta.env.MODE);
  });

  it('copies scalar values as strings into a frozen snapshot and drops the rest', () => {
    const env: ConfigEnv = {
      VITE_API_URL: 'https://api.test',
      DEV: true,
      PROD: false,
      PORT: 5173,
      BIG: 10n,
      NESTED: { a: 1 },
      LIST: ['a'],
      NOTHING: null,
      EMPTY: '',
    };
    const source = importMetaEnvSource(env);
    expect({ ...source }).toEqual({
      VITE_API_URL: 'https://api.test',
      DEV: 'true',
      PROD: 'false',
      PORT: '5173',
      BIG: '10',
      EMPTY: '',
    });
    expect(Object.isFrozen(source)).toBe(true);
    expect(Object.getPrototypeOf(source)).toBeNull();
  });

  it('yields an empty source for a missing or non-object env', () => {
    expect({ ...importMetaEnvSource(undefined) }).toEqual({});
    expect({ ...importMetaEnvSource(null as unknown as ConfigEnv) }).toEqual({});
    expect({ ...importMetaEnvSource('VITE_X=1' as unknown as ConfigEnv) }).toEqual({});
  });
});

describe('defaultSources', () => {
  it('reads only the runtime global without an env', () => {
    vi.stubGlobal('window', { __APP_CONFIG__: { VITE_API_URL: 'https://runtime.test' } });
    const sources = defaultSources();
    expect(sources).toHaveLength(1);
    expect(sources[0]).toEqual(windowConfigSource());
  });

  it('layers the runtime global ahead of the passed env', () => {
    vi.stubGlobal('window', { __APP_CONFIG__: { VITE_API_URL: 'https://runtime.test' } });
    const config = defineConfig(
      { API_URL: url(), NAME: str() },
      { prefix: 'VITE_', env: { VITE_API_URL: 'https://build.test', VITE_NAME: 'Desk' } },
    );
    expect(config.API_URL).toBe('https://runtime.test');
    expect(config.NAME).toBe('Desk');
  });
});

describe('defineConfig env', () => {
  it("resolves a prefixed key from the caller's import.meta.env", () => {
    vi.stubEnv('VITE_API_URL', 'https://api.consumer.test');
    const config = defineConfig({ API_URL: url() }, { prefix: 'VITE_', env: import.meta.env });
    expect(config.API_URL).toBe('https://api.consumer.test');
  });

  it('ignores env when explicit sources are given', () => {
    const config = defineConfig({ NAME: str({ default: 'fallback' }) }, { sources: [{}], env: { NAME: 'from-env' } });
    expect(config.NAME).toBe('fallback');
  });

  it('reports a missing key loudly when no env reaches it', () => {
    expect(() => defineConfig({ API_URL: url() }, { prefix: 'VITE_' })).toThrow('VITE_API_URL');
  });
});
