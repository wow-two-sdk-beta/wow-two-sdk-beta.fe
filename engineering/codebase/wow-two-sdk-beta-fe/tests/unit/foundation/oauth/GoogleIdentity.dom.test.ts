import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { GoogleIdentityStatus, loadGoogleIdentity, provideGoogleIdentity } from '@src/foundation/oauth';

const ScriptSelector = 'script[src="https://accounts.google.com/gsi/client"]';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.querySelectorAll(ScriptSelector).forEach((script) => script.remove());
});

describe('Google Identity lifetime', () => {
  it('creates a fresh script when the previous load failed', async () => {
    vi.stubGlobal('google', undefined);
    const append = document.head.appendChild.bind(document.head);
    vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLScriptElement) node.type = 'application/json';
      return append(node);
    });
    const failed = loadGoogleIdentity();
    const script = document.querySelector(ScriptSelector)!;
    script.dispatchEvent(new Event('error'));
    await expect(failed).rejects.toThrow('failed to load');
    const retried = loadGoogleIdentity();
    const replacement = document.querySelector(ScriptSelector)!;
    expect(replacement).not.toBe(script);
    const api = { initialize: vi.fn(), renderButton: vi.fn(), prompt: vi.fn(), disableAutoSelect: vi.fn() };
    vi.stubGlobal('google', { accounts: { id: api } });
    replacement.dispatchEvent(new Event('load'));
    await expect(retried).resolves.toBe(api);
  });

  it('ignores credentials from stale client generations and disposed hooks', async () => {
    const api = { initialize: vi.fn(), renderButton: vi.fn(), prompt: vi.fn(), disableAutoSelect: vi.fn() };
    vi.stubGlobal('google', { accounts: { id: api } });
    const clientId = ref<string | undefined>('first');
    const credential = vi.fn();
    let controls!: ReturnType<typeof provideGoogleIdentity>;
    const wrapper = mount(
      defineComponent({
        setup() {
          controls = provideGoogleIdentity({ clientId, onCredential: credential });
          return () => null;
        },
      }),
    );
    await flushPromises();
    const first = api.initialize.mock.calls[0]![0] as { callback: (response: { credential: string }) => void };
    clientId.value = 'second';
    await flushPromises();
    first.callback({ credential: 'stale' });
    expect(credential).not.toHaveBeenCalled();
    const second = api.initialize.mock.calls[1]![0] as { callback: (response: { credential: string }) => void };
    second.callback({ credential: 'active' });
    expect(credential).toHaveBeenCalledTimes(1);
    expect(controls.status.value).toBe(GoogleIdentityStatus.Ready);
    wrapper.unmount();
    second.callback({ credential: 'disposed' });
    controls.prompt();
    expect(credential).toHaveBeenCalledTimes(1);
    expect(api.prompt).not.toHaveBeenCalled();
  });
});
