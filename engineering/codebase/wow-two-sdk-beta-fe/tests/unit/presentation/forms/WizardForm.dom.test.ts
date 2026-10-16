import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { WizardForm, WizardFormFooter, WizardFormStep, WizardFormSteps } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
  const at = Date.now();
  while (Date.now() === at) await Promise.resolve();
}

interface Options {
  readonly props?: Record<string, unknown>;
  readonly validate?: () => boolean | Promise<boolean>;
  readonly hasStrip?: boolean;
}

function mountWizard({ props = {}, validate, hasStrip = true }: Options = {}): VueWrapper {
  const wrapper = mount(WizardForm, {
    props,
    slots: {
      default: () => [
        hasStrip ? h(WizardFormSteps) : null,
        h(WizardFormStep, { id: 'account', label: 'Account', validate }, () => 'Account panel'),
        h(WizardFormStep, { id: 'plan', label: 'Plan', isOptional: true }, () => 'Plan panel'),
        h(WizardFormStep, { id: 'review', label: 'Review', isFinal: true }, () => 'Review panel'),
        h(WizardFormFooter),
      ],
    },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  return wrapper;
}

function button(wrapper: VueWrapper, text: string): HTMLButtonElement | undefined {
  return [...(wrapper.element as HTMLElement).querySelectorAll<HTMLButtonElement>('button')].find(
    (node) => node.textContent?.trim() === text,
  );
}

function tab(wrapper: VueWrapper, label: string): HTMLButtonElement {
  return [...(wrapper.element as HTMLElement).querySelectorAll<HTMLButtonElement>('[role=tab]')].find((node) =>
    node.textContent?.includes(label),
  )!;
}

function panelText(wrapper: VueWrapper): string {
  return wrapper.get('[role=tabpanel]').text();
}

describe('WizardForm', () => {
  it('walks forward and back, and re-opens only visited steps from the strip', async () => {
    const wrapper = mountWizard();
    await settle();
    expect(panelText(wrapper)).toBe('Account panel');
    expect(button(wrapper, 'Back')).toBeUndefined();
    expect(tab(wrapper, 'Review').getAttribute('aria-disabled')).toBe('true');

    button(wrapper, 'Next')!.click();
    await settle();
    expect(panelText(wrapper)).toBe('Plan panel');
    expect(tab(wrapper, 'Plan').getAttribute('aria-selected')).toBe('true');
    expect(tab(wrapper, 'Plan').textContent).toContain('(optional)');

    tab(wrapper, 'Review').click();
    await settle();
    expect(panelText(wrapper)).toBe('Plan panel');

    button(wrapper, 'Back')!.click();
    await settle();
    expect(panelText(wrapper)).toBe('Account panel');
    tab(wrapper, 'Plan').click();
    await settle();
    expect(panelText(wrapper)).toBe('Plan panel');
    expect(wrapper.emitted('update:currentStep')).toEqual([['plan'], ['account'], ['plan']]);
  });

  it('holds the step while its validator declines, and shows the pending state while it runs', async () => {
    let release!: (ok: boolean) => void;
    const validate = vi.fn(() => new Promise<boolean>((resolve) => (release = resolve)));
    const wrapper = mountWizard({ validate });
    await settle();
    button(wrapper, 'Next')!.click();
    await settle();
    const pending = button(wrapper, '…')!;
    expect(pending.disabled).toBe(true);
    release(false);
    await settle();
    expect(panelText(wrapper)).toBe('Account panel');
    button(wrapper, 'Next')!.click();
    await settle();
    release(true);
    await settle();
    expect(panelText(wrapper)).toBe('Plan panel');
    expect(validate).toHaveBeenCalledTimes(2);
  });

  it('awaits the completion handler on the final step', async () => {
    let finish!: () => void;
    const onComplete = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const wrapper = mountWizard({ props: { onComplete, defaultCurrentStep: 'review' } });
    await settle();
    button(wrapper, 'Finish')!.click();
    await settle();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(button(wrapper, '…')!.disabled).toBe(true);
    finish();
    await settle();
    expect(button(wrapper, 'Finish')!.disabled).toBe(false);
  });

  it('only requests a step change while controlled', async () => {
    const wrapper = mountWizard({ props: { currentStep: 'account' } });
    await settle();
    button(wrapper, 'Next')!.click();
    await settle();
    expect(wrapper.emitted('update:currentStep')).toEqual([['plan']]);
    expect(panelText(wrapper)).toBe('Account panel');
    await wrapper.setProps({ currentStep: 'plan' });
    await settle();
    expect(panelText(wrapper)).toBe('Plan panel');
  });

  it('drops Back and step jumps when going back is off', async () => {
    const wrapper = mountWizard({ props: { canGoBack: false, defaultCurrentStep: 'plan' } });
    await settle();
    expect(button(wrapper, 'Back')).toBeUndefined();
    tab(wrapper, 'Account').click();
    await settle();
    expect(panelText(wrapper)).toBe('Plan panel');
  });

  it('names each panel by its tab, with one tab stop and arrow keys along the strip', async () => {
    const wrapper = mountWizard();
    await settle();
    const panel = wrapper.get('[role=tabpanel]').element;
    const account = tab(wrapper, 'Account');
    expect(panel.getAttribute('aria-labelledby')).toBe(account.id);
    expect(account.getAttribute('aria-controls')).toBe(panel.id);
    expect(document.getElementById(account.id)).toBe(account);
    expect([...wrapper.element.querySelectorAll('[role=tab]')].map((node) => node.getAttribute('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
    ]);
    account.focus();
    account.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(tab(wrapper, 'Plan'));
    (document.activeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(tab(wrapper, 'Review'));
    (document.activeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(account);
  });

  it('keeps two wizards in one app from sharing ids, and leaves a strip-less panel unnamed', async () => {
    const wizard = (): ReturnType<typeof h> =>
      h(WizardForm, null, () => [h(WizardFormSteps), h(WizardFormStep, { id: 'account', label: 'Account' })]);
    const pair = mount({ render: () => h('div', [wizard(), wizard()]) }, { attachTo: document.body });
    wrappers.push(pair);
    await settle();
    const ids = [...pair.element.querySelectorAll('[role=tab]')].map((node) => node.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    const bare = mountWizard({ hasStrip: false });
    await settle();
    expect(bare.get('[role=tabpanel]').attributes('aria-labelledby')).toBeUndefined();
  });
});
