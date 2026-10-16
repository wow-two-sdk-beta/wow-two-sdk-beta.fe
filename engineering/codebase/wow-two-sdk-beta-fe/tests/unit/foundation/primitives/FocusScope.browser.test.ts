import { nativeTab } from '../../../BrowserKeyboard';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref, Teleport } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { FocusScope } from '@src/foundation/primitives/focusScope';
import { DismissableLayer } from '@src/foundation/primitives/dismissableLayer';

const wrappers: VueWrapper[] = [];
const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  for (const host of hosts.splice(0)) host.remove();
});
function host(): HTMLDivElement {
  const node = document.createElement('div');
  document.body.append(node);
  hosts.push(node);
  return node;
}
function button(text: string): HTMLButtonElement {
  const node = document.createElement('button');
  node.textContent = text;
  host().append(node);
  return node;
}
function byText(text: string): HTMLButtonElement {
  const found = Array.from(document.querySelectorAll('button')).find((node) => node.textContent === text);
  if (!found) throw new Error(`Missing test control: ${text}`);
  return found;
}
function render(component: ReturnType<typeof defineComponent>): VueWrapper {
  const wrapper = mount(component, { attachTo: host() });
  wrappers.push(wrapper);
  return wrapper;
}

describe('FocusScope browser contract', () => {
  it('makes modal background inert, traps Tab and restores the opening control', async () => {
    const opener = button('open modal');
    const preexisting = host();
    preexisting.setAttribute('inert', 'already');
    opener.focus();
    const wrapper = render(
      defineComponent({
        setup: () => () =>
          h(FocusScope, { isTrapped: true, isModal: true, canLoop: true }, () => [
            h('button', 'first'),
            h('button', 'last'),
          ]),
      }),
    );
    await nextTick();
    expect(document.activeElement).toBe(byText('first'));
    expect(opener.closest('[inert]')).not.toBeNull();
    opener.focus();
    expect(document.activeElement).toBe(byText('first'));
    byText('last').focus();
    await nativeTab();
    expect(document.activeElement).toBe(byText('first'));
    await nativeTab({ shift: true });
    expect(document.activeElement).toBe(byText('last'));
    wrapper.unmount();
    wrappers.splice(wrappers.indexOf(wrapper), 1);
    expect(opener.closest('[inert]')).toBeNull();
    expect(preexisting.getAttribute('inert')).toBe('already');
    expect(document.activeElement).toBe(opener);
  });

  it('leaves a nonmodal scope and background available', async () => {
    const outside = button('outside nonmodal');
    const wrapper = render(
      defineComponent({ setup: () => () => h(FocusScope, {}, () => h('button', 'nonmodal action')) }),
    );
    await nextTick();
    expect(outside.closest('[inert]')).toBeNull();
    outside.focus();
    expect(document.activeElement).toBe(outside);
    wrapper.unmount();
    wrappers.splice(wrappers.indexOf(wrapper), 1);
    expect(document.activeElement).toBe(outside);
  });

  it('keeps a nonmodal nested portal inside its parent modal focus boundary', async () => {
    render(
      defineComponent({
        setup: () => () =>
          h(FocusScope, { isTrapped: true, isModal: true, canLoop: true }, () => [
            h('button', 'parent first'),
            h(
              Teleport,
              { to: 'body' },
              h(FocusScope, {}, () => h('button', 'portal child')),
            ),
          ]),
      }),
    );
    await nextTick();
    const child = byText('portal child');
    expect(child.closest('[inert]')).toBeNull();
    child.focus();
    expect(document.activeElement).toBe(child);
    await nativeTab();
    expect(document.activeElement).toBe(byText('parent first'));
  });

  it('gives the initially nested modal priority and restores its parent trigger on close', async () => {
    const innerOpen = ref(false);
    const outerOpen = ref(true);
    const opener = button('outer opener');
    opener.focus();
    render(
      defineComponent({
        setup: () => () =>
          outerOpen.value
            ? h(FocusScope, { isTrapped: true, isModal: true, canLoop: true }, () => [
                h(
                  'button',
                  {
                    onClick: () => {
                      innerOpen.value = true;
                    },
                  },
                  'inner opener',
                ),
                innerOpen.value
                  ? h(
                      Teleport,
                      { to: 'body' },
                      h(FocusScope, { isTrapped: true, isModal: true, canLoop: true }, () =>
                        h('button', 'inner action'),
                      ),
                    )
                  : null,
              ])
            : null,
      }),
    );
    await nextTick();
    byText('inner opener').click();
    await nextTick();
    expect(document.activeElement).toBe(byText('inner action'));
    expect(byText('inner opener').closest('[inert]')).not.toBeNull();
    innerOpen.value = false;
    await nextTick();
    expect(document.activeElement).toBe(byText('inner opener'));
    expect(byText('inner opener').closest('[inert]')).toBeNull();
    outerOpen.value = false;
    await nextTick();
    expect(document.activeElement).toBe(opener);
  });

  it('restores the original opener when a parent closes with a nested modal still mounted', async () => {
    const opened = ref(false);
    const opener = button('close whole tree opener');
    opener.focus();
    render(
      defineComponent({
        setup: () => () =>
          opened.value
            ? h(FocusScope, { isTrapped: true, isModal: true }, () => [
                h('button', 'outer tree action'),
                h(
                  Teleport,
                  { to: 'body' },
                  h(FocusScope, { isTrapped: true, isModal: true }, () => h('button', 'inner tree action')),
                ),
              ])
            : null,
      }),
    );
    opened.value = true;
    await nextTick();
    expect(document.activeElement).toBe(byText('inner tree action'));
    opened.value = false;
    await nextTick();
    expect(document.activeElement).toBe(opener);
    expect(opener.closest('[inert]')).toBeNull();
  });

  it('isolates late background nodes and restores their previous attributes on close', async () => {
    const wrapper = render(
      defineComponent({
        setup: () => () => h(FocusScope, { isModal: true, isTrapped: true }, () => h('button', 'active modal')),
      }),
    );
    await nextTick();
    const late = host();
    late.textContent = 'late background';
    await vi.waitFor(() => expect(late.hasAttribute('inert')).toBe(true));
    wrapper.unmount();
    wrappers.splice(wrappers.indexOf(wrapper), 1);
    expect(late.hasAttribute('inert')).toBe(false);
  });

  it('isolates and restores focus in the owning iframe document', async () => {
    const frame = document.createElement('iframe');
    // Wait for the final document before focusing; a new iframe starts with a transient document.
    await new Promise<void>((resolve) => {
      frame.addEventListener('load', () => resolve(), { once: true });
      frame.srcdoc = '<!doctype html><html><body></body></html>';
      host().append(frame);
    });
    const ownedDocument = frame.contentDocument;
    if (!ownedDocument) throw new Error('Missing iframe document');
    const opener = ownedDocument.createElement('button');
    opener.textContent = 'iframe opener';
    ownedDocument.body.append(opener);
    frame.contentWindow?.focus();
    opener.focus();
    expect(ownedDocument.activeElement).toBe(opener);
    const target = ownedDocument.createElement('div');
    ownedDocument.body.append(target);
    const wrapper = mount(
      defineComponent({
        setup: () => () => h(FocusScope, { isModal: true, isTrapped: true }, () => h('button', 'iframe action')),
      }),
      { attachTo: target },
    );
    wrappers.push(wrapper);
    await nextTick();
    expect(opener.hasAttribute('inert')).toBe(true);
    expect(ownedDocument.activeElement?.textContent).toBe('iframe action');
    expect(frame.closest('[inert]')).toBeNull();
    wrapper.unmount();
    wrappers.splice(wrappers.indexOf(wrapper), 1);
    expect(opener.hasAttribute('inert')).toBe(false);
    expect(ownedDocument.activeElement).toBe(opener);
  });

  it('skips hidden, disabled and negative-tabindex controls', async () => {
    render(
      defineComponent({
        setup: () => () =>
          h(FocusScope, { isTrapped: true, isModal: true }, () => [
            h('button', { style: { visibility: 'hidden' } }, 'invisible'),
            h('fieldset', { disabled: true }, h('button', 'fieldset disabled')),
            h('button', { tabindex: -2 }, 'negative tab index'),
            h('button', 'eligible'),
          ]),
      }),
    );
    await nextTick();
    expect(document.activeElement).toBe(byText('eligible'));
  });
});

describe('DismissableLayer browser contract', () => {
  it('dispatches Escape only to the logical nested top layer and removes its listeners on close', async () => {
    const innerOpen = ref(true);
    const outerEscape = vi.fn();
    const innerEscape = vi.fn();
    render(
      defineComponent({
        setup: () => () =>
          h(DismissableLayer, { onEscape: outerEscape }, () => [
            h('button', 'outer layer'),
            innerOpen.value
              ? h(
                  Teleport,
                  { to: 'body' },
                  h(DismissableLayer, { onEscape: innerEscape }, () => h('button', 'inner layer')),
                )
              : null,
          ]),
      }),
    );
    await nextTick();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(innerEscape).toHaveBeenCalledTimes(1);
    expect(outerEscape).not.toHaveBeenCalled();
    innerOpen.value = false;
    await nextTick();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(innerEscape).toHaveBeenCalledTimes(1);
    expect(outerEscape).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss an underlying layer when the top callback unmounts synchronously', async () => {
    const outerEscape = vi.fn();
    const innerEscape = vi.fn(() => inner.unmount());
    render(
      defineComponent({
        setup: () => () => h(DismissableLayer, { onEscape: outerEscape }, () => h('button', 'underlying layer')),
      }),
    );
    const inner = render(
      defineComponent({
        setup: () => () => h(DismissableLayer, { onEscape: innerEscape }, () => h('button', 'synchronous top')),
      }),
    );
    await nextTick();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(innerEscape).toHaveBeenCalledTimes(1);
    expect(outerEscape).not.toHaveBeenCalled();
    wrappers.splice(wrappers.indexOf(inner), 1);
  });

  it('ignores inside portal pointers and suppresses disabled top-layer dismissal', async () => {
    const disabled = ref(false);
    const outside = vi.fn();
    const outer = vi.fn();
    render(
      defineComponent({
        setup: () => () =>
          h(DismissableLayer, { onOutsidePointerDown: outer }, () =>
            h(
              Teleport,
              { to: 'body' },
              h(
                DismissableLayer,
                {
                  onOutsidePointerDown: outside,
                  isOutsideClickDisabled: disabled.value,
                },
                () => h('button', 'pointer child'),
              ),
            ),
          ),
      }),
    );
    await nextTick();
    byText('pointer child').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    expect(outside).not.toHaveBeenCalled();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(outside).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
    disabled.value = true;
    await nextTick();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(outside).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });
});
