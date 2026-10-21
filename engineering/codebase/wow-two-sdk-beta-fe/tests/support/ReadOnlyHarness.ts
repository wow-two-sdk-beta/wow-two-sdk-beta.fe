import { afterEach, expect } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, type VNode } from 'vue';
import { Field } from '@src/presentation/forms';
import { nativeTab } from '../BrowserKeyboard';
import { ariaViolations } from './AriaValidity';
import '@src/index.css';

/*
 * Shared harness of the read-only browser tests. Every case mounts a normal control beside a read-only one, so the
 * read-only look is read as a difference rather than a constant.
 */

/** Forced colours replace every fill and border with a system colour; structure, focus and cursor still apply. */
export const isForcedColors = matchMedia('(forced-colors: active)').matches;

/** Distinct resting and hover borders, so a hover emphasis is a visible difference in the default theme. */
export const Theme =
  '--color-input: rgb(0, 0, 255); --color-border-strong: rgb(255, 0, 0); width: 360px; padding: 16px;';

const mounted: VueWrapper[] = [];

/** Unmounts every host this file mounted, after each test. Call once at the top of a test file. */
export function unmountAfterEach(): void {
  afterEach(() => {
    for (const wrapper of mounted.splice(0)) wrapper.unmount();
    document.body.innerHTML = '';
  });
}

/** Unmounts the hosts so far, mid-test — for a case that mounts again under another theme. */
export function unmountNow(): void {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
}

/** Mounts a host render into the document and settles two ticks, so teleported panels and `onMounted` work landed. */
export async function mountHost(render: () => VNode | VNode[]): Promise<HTMLElement> {
  const wrapper = mount(defineComponent({ render }), { attachTo: document.body });
  mounted.push(wrapper);
  await nextTick();
  await nextTick();
  return wrapper.element as HTMLElement;
}

/** Names which of the pair a control is built for, so a case can tell the two instances' events apart. */
export type PairVariant = 'normal' | 'read-only';

/** Mounts a normal control and a read-only one, both through their surrounding `Field`, in one container. */
export function mountPair(make: (variant: PairVariant) => VNode, className = ''): Promise<HTMLElement> {
  return mountHost(() =>
    h('div', { class: className, style: Theme }, [
      h(Field, { label: 'Normal' }, () => make('normal')),
      h(Field, { label: 'Read only', isReadOnly: true }, () => make('read-only')),
    ]),
  );
}

export { ariaViolations };

/** Resolves a token to the colour the engine computes for it, in the container's theme. */
export function tokenColor(container: HTMLElement, property: string, token: string): string {
  const probe = document.createElement('span');
  probe.style.setProperty(property, `var(${token})`);
  container.append(probe);
  const value = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return value;
}

/** Presses Tab from the top of the page until the element is focused, so `:focus-visible` sees keyboard modality. */
export async function tabTo(element: HTMLElement, limit = 16): Promise<void> {
  // A click leaves the sequential-focus starting point where it landed (and WebKit does not focus a clicked button).
  document.body.tabIndex = -1;
  document.body.focus();
  document.body.removeAttribute('tabindex');
  for (let press = 0; press < limit && document.activeElement !== element; press++) await nativeTab();
  expect(document.activeElement).toBe(element);
}

/** Waits long enough for an asynchronous open, which a control that must stay closed has not started. */
export const settle = (milliseconds = 60): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const bg = (element: Element): string => getComputedStyle(element).backgroundColor;
export const textColor = (element: Element): string => getComputedStyle(element).color;
export const cursorOf = (element: Element): string => getComputedStyle(element).cursor;

/** The text of the elements an element's `aria-describedby` names — what a screen reader reads as its description. */
export function descriptionOf(element: Element): string {
  return (element.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
    .join(' ')
    .trim();
}
