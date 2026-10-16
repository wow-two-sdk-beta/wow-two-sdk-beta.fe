import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { GoogleSignInButton } from '@src/presentation/actions';
import { provideGoogleIdentity, type GoogleIdentityApi } from '@src/foundation/oauth';

const ClientId = 'test-client-id.apps.googleusercontent.com';
let gis: {
  initialize: ReturnType<typeof vi.fn>;
  renderButton: ReturnType<typeof vi.fn>;
  prompt: ReturnType<typeof vi.fn>;
  disableAutoSelect: ReturnType<typeof vi.fn>;
};
const wrappers: VueWrapper[] = [];
beforeEach(() => {
  gis = { initialize: vi.fn(), renderButton: vi.fn(), prompt: vi.fn(), disableAutoSelect: vi.fn() };
  vi.stubGlobal('google', { accounts: { id: gis } });
});
afterEach(() => {
  wrappers
    .splice(0)
    .reverse()
    .forEach((wrapper) => wrapper.unmount());
  vi.unstubAllGlobals();
});
async function settle() {
  await flushPromises();
  await nextTick();
}
function owner(count = 1, configured = true) {
  const clientId = ref<string | undefined>(configured ? ClientId : undefined);
  const theme = ref<'outline' | 'filled_blue'>('outline');
  const credential = vi.fn();
  const error = vi.fn();
  let controls!: GoogleIdentityApi;
  const wrapper = mount(
    defineComponent({
      setup() {
        controls = provideGoogleIdentity({ clientId, onCredential: credential, onError: error });
        return () =>
          h(
            'section',
            Array.from({ length: count }, () => h(GoogleSignInButton, { theme: theme.value })),
          );
      },
    }),
  );
  wrappers.push(wrapper);
  return { wrapper, clientId, theme, credential, error, controls };
}
function callback(index = -1): (response: { credential?: string }) => void {
  return gis.initialize.mock.calls.at(index)![0].callback;
}

describe('GoogleSignInButton shared owner', () => {
  it('initializes once for multiple rendered buttons and delivers credentials once to their common owner', async () => {
    const host = owner(2);
    await settle();
    expect(gis.initialize).toHaveBeenCalledTimes(1);
    expect(gis.renderButton).toHaveBeenCalledTimes(2);
    const buttons = host.wrapper.findAllComponents(GoogleSignInButton);
    expect(gis.renderButton.mock.calls.map((call) => call[0])).toEqual(buttons.map((button) => button.element));
    callback()({ credential: 'id-token' });
    expect(host.credential).toHaveBeenCalledOnce();
    expect(host.credential.mock.calls[0]![0]).toBe('id-token');
    callback()({});
    expect(host.credential).toHaveBeenCalledOnce();
  });

  it('renders nothing without an owner client id', async () => {
    const host = owner(1, false);
    await settle();
    expect(host.wrapper.findComponent(GoogleSignInButton).html()).toBe('<!--v-if-->');
    expect(gis.initialize).not.toHaveBeenCalled();
  });

  it('updates provider configuration while old callbacks cannot deliver credentials', async () => {
    const host = owner();
    await settle();
    const stale = callback();
    host.clientId.value = 'second-id';
    stale({ credential: 'stale' });
    await settle();
    callback()({ credential: 'current' });
    expect(gis.initialize).toHaveBeenCalledTimes(2);
    expect(host.credential).toHaveBeenCalledTimes(1);
    expect(host.credential.mock.calls[0]![0]).toBe('current');
  });

  it('clears Google-owned nodes before re-rendering appearance changes', async () => {
    const host = owner();
    await settle();
    const button = host.wrapper.findComponent(GoogleSignInButton);
    button.element.appendChild(document.createElement('div'));
    host.theme.value = 'filled_blue';
    await settle();
    expect(button.element.children).toHaveLength(0);
    expect(gis.renderButton).toHaveBeenCalledTimes(2);
    expect(gis.renderButton.mock.calls[1]![1]).toMatchObject({ theme: 'filled_blue' });
  });

  it('rejects a competing page owner without overwriting the first credential sink', async () => {
    const first = owner();
    await settle();
    const second = owner();
    await settle();
    expect(gis.initialize).toHaveBeenCalledTimes(1);
    expect(second.error).toHaveBeenCalledOnce();
    callback()({ credential: 'first-only' });
    expect(first.credential).toHaveBeenCalledOnce();
    expect(second.credential).not.toHaveBeenCalled();
  });

  it('releases ownership on unmount and ignores the disposed callback', async () => {
    const first = owner();
    await settle();
    const old = callback();
    first.wrapper.unmount();
    wrappers.pop();
    const second = owner();
    await settle();
    old({ credential: 'disposed' });
    callback()({ credential: 'active' });
    expect(first.credential).not.toHaveBeenCalled();
    expect(second.credential).toHaveBeenCalledOnce();
    expect(gis.initialize).toHaveBeenCalledTimes(2);
  });
});
