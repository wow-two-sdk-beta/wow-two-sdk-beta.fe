import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { LocaleProvider } from '@src/foundation/i18n';
import { ErrorBoundary } from '@src/presentation/feedback';

const wrappers: VueWrapper[] = [];
const track = <T extends VueWrapper>(wrapper: T): T => {
  wrappers.push(wrapper);
  return wrapper;
};
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  vi.restoreAllMocks();
});

/** A child whose render throws while `fail.value` is true. */
function flaky(fail: { value: boolean }) {
  return defineComponent({
    name: 'FlakyWidget',
    setup: () => () => {
      if (fail.value) throw new Error('render failed');
      return h('p', { 'data-widget': '' }, 'widget');
    },
  });
}

/** Silences Vue's dev warnings for the errors these tests throw on purpose. */
function quiet(): void {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
}

describe('ErrorBoundary', () => {
  it('swaps a render failure for the fallback and remounts the subtree on retry', async () => {
    quiet();
    const fail = { value: true };
    const Widget = flaky(fail);
    const wrapper = track(mount(ErrorBoundary, { slots: { default: () => h(Widget) } }));
    await nextTick();
    const alert = wrapper.get('[role=alert]');
    expect(alert.text()).toContain('Something went wrong');
    const [error, info] = wrapper.emitted('error')![0]!;
    expect((error as Error).message).toBe('render failed');
    expect(typeof info).toBe('string');
    fail.value = false;
    await alert.get('button').trigger('click');
    await nextTick();
    expect(wrapper.find('[data-widget]').exists()).toBe(true);
    expect(wrapper.emitted('reset')).toHaveLength(1);
  });

  it('catches a setup failure', async () => {
    quiet();
    const Broken = defineComponent({
      setup() {
        throw new Error('setup failed');
      },
    });
    const wrapper = track(mount(ErrorBoundary, { slots: { default: () => h(Broken) } }));
    await nextTick();
    expect(wrapper.find('[role=alert]').exists()).toBe(true);
  });

  it('keeps the subtree for a handler failure, reports it and lets it propagate', async () => {
    quiet();
    const appHandler = vi.fn();
    const Button = defineComponent({
      setup: () => () =>
        h(
          'button',
          {
            onClick: () => {
              throw new Error('click failed');
            },
          },
          'Save',
        ),
    });
    const wrapper = track(
      mount(ErrorBoundary, {
        slots: { default: () => h(Button) },
        global: { config: { errorHandler: appHandler } },
      }),
    );
    await wrapper.get('button').trigger('click');
    await nextTick();
    expect(wrapper.find('[role=alert]').exists()).toBe(false);
    expect(wrapper.find('button').exists()).toBe(true);
    expect((wrapper.emitted('error')![0]![0] as Error).message).toBe('click failed');
    expect(appHandler).toHaveBeenCalledTimes(1);
  });

  it('clears a caught error when a reset key changes', async () => {
    quiet();
    const fail = { value: true };
    const Widget = flaky(fail);
    const key = ref('a');
    const wrapper = track(
      mount(
        defineComponent({
          setup: () => () => h(ErrorBoundary, { resetKeys: [key.value] }, () => h(Widget)),
        }),
      ),
    );
    await nextTick();
    expect(wrapper.find('[role=alert]').exists()).toBe(true);
    fail.value = false;
    key.value = 'b';
    await nextTick();
    await nextTick();
    expect(wrapper.find('[data-widget]').exists()).toBe(true);
  });

  it('hands the error and the reset to a custom fallback', async () => {
    quiet();
    const fail = { value: true };
    const Widget = flaky(fail);
    const wrapper = track(
      mount(ErrorBoundary, {
        slots: {
          default: () => h(Widget),
          fallback: ({ error, reset }: { error: unknown; reset: () => void }) =>
            h('button', { 'data-retry': '', onClick: reset }, (error as Error).message),
        },
      }),
    );
    await nextTick();
    expect(wrapper.get('[data-retry]').text()).toBe('render failed');
    fail.value = false;
    await wrapper.get('[data-retry]').trigger('click');
    expect(wrapper.find('[data-widget]').exists()).toBe(true);
  });

  it('lets the nearest boundary own a failure and localizes the built-in copy', async () => {
    quiet();
    const Widget = flaky({ value: true });
    const outer = vi.fn();
    const wrapper = track(
      mount(
        defineComponent({
          render: () =>
            h(
              LocaleProvider,
              { messages: { 'ErrorBoundary.title': 'Fehler', 'ErrorBoundary.retryLabel': 'Nochmal' } },
              () =>
                h(ErrorBoundary, { onError: outer }, () => [
                  h('span', { 'data-sibling': '' }, 'sibling'),
                  h(ErrorBoundary, null, () => h(Widget)),
                ]),
            ),
        }),
      ),
    );
    await nextTick();
    expect(outer).not.toHaveBeenCalled();
    expect(wrapper.find('[data-sibling]').exists()).toBe(true);
    expect(wrapper.get('[role=alert]').text()).toContain('Fehler');
    expect(wrapper.get('[role=alert] button').text()).toBe('Nochmal');
  });
});
