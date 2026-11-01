import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { expect, it, vi } from 'vitest';
import { AuthProvider, createAuthBridge, createBffStrategy } from '@src/auth';

it('renders on the server without a request, a channel or a timer', async () => {
  const fetch = vi.fn();
  const open = vi.fn();
  const bff = createBffStrategy({ fetch, sync: { open }, refresh: {} });
  const connect = vi.spyOn(bff, 'connect');
  const app = createSSRApp({
    render: () => h(AuthProvider, { strategy: bff, bridge: createAuthBridge() }, { default: () => h('p', 'page') }),
  });

  expect(await renderToString(app)).toContain('page');

  expect(fetch).not.toHaveBeenCalled();
  expect(open).not.toHaveBeenCalled();
  expect(connect).not.toHaveBeenCalled();
});
