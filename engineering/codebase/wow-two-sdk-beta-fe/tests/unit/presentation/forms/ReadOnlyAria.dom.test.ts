import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick, type Component } from 'vue';
import { Field } from '@src/presentation/forms';
import { ariaViolations } from '../../../support/AriaValidity';
import { formsCases } from './FormsCases';

/*
 * Every public form control that takes `isReadOnly` renders valid ARIA while read-only: each attribute is allowed on
 * its role, each value resolves, and every required part and name is present. A read-only state belongs on a role
 * that allows `aria-readonly`; a `button` or a `group` that carries it fails here. The ARIA rules read the DOM, not
 * the layout, so the sweep runs in the DOM project instead of loading every control into a real browser.
 */

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

/** Reports whether a component declares the prop, whether its props are an array or an options object. */
function declares(component: Component, prop: string): boolean {
  const props = (component as { props?: unknown }).props;
  if (Array.isArray(props)) return props.includes(prop);
  return typeof props === 'object' && props !== null && prop in props;
}

/* `ListboxPicker` mounts here with no options, which is a required-children violation unrelated to read-only. */
const EmptyFixtures = new Set(['ListboxPicker']);

const readOnlyCases = formsCases.filter(
  (probe) => declares(probe.component, 'isReadOnly') && probe.wrap === undefined && !EmptyFixtures.has(probe.name),
);

describe('read-only form controls', () => {
  it('covers the controls that take isReadOnly', () => {
    expect(readOnlyCases.length).toBeGreaterThan(40);
  });

  it.each(readOnlyCases.map((probe) => [probe.name, probe] as const))('%s renders valid ARIA', async (_name, probe) => {
    wrapper = mount(
      {
        render: () =>
          h(Field, { label: 'Probe', isReadOnly: true }, () =>
            h(
              probe.component,
              { ...probe.props, isReadOnly: true },
              probe.slot ? { default: () => 'Probe' } : undefined,
            ),
          ),
      },
      { attachTo: document.body },
    );
    await nextTick();
    await nextTick();
    expect(await ariaViolations(wrapper.element)).toEqual([]);
  });

  it('rejects an aria-readonly on a button, the mistake this sweep guards against', async () => {
    wrapper = mount(
      { render: () => h('div', [h('button', { type: 'button', 'aria-readonly': 'true' }, 'Day')]) },
      { attachTo: document.body },
    );
    await nextTick();
    expect((await ariaViolations(wrapper.element)).join('\n')).toContain('aria-allowed-attr');
  });
});
