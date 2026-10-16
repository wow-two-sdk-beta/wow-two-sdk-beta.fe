import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { KanbanBoardHarness } from './KanbanBoardHarness';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

function mountBoard(props: Record<string, unknown> = {}): VueWrapper {
  const wrapper = mount(KanbanBoardHarness, { props, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

function column(wrapper: VueWrapper, key: string): string[] {
  return wrapper.findAll(`[data-column-key=${key}] [data-item-key]`).map((card) => card.text());
}

function card(itemKey: string): HTMLElement {
  return document.querySelector<HTMLElement>(`[data-item-key=${itemKey}]`)!;
}

async function alt(key: string): Promise<void> {
  (document.activeElement as HTMLElement).dispatchEvent(
    new KeyboardEvent('keydown', { key, altKey: true, bubbles: true, cancelable: true }),
  );
  for (let tick = 0; tick < 3; tick += 1) await nextTick();
}

describe('KanbanBoard', () => {
  it('names columns, describes cards and reorders by keyboard without losing focus', async () => {
    const wrapper = mountBoard();
    const todo = wrapper.get('[data-column-key=todo]');
    expect(wrapper.get(`#${todo.attributes('aria-labelledby')}`).text()).toBe('To do');
    const hint = document.getElementById(card('t1').getAttribute('aria-describedby')!);
    expect(hint?.textContent?.trim()).toBe('Press Alt with the arrow keys to move this card.');
    card('t1').focus();
    await alt('ArrowUp');
    expect(wrapper.emitted('applied')).toBeUndefined();
    await alt('ArrowDown');
    expect(wrapper.emitted('applied')).toEqual([
      [{ itemKey: 't1', fromColumn: 'todo', fromIndex: 0, toColumn: 'todo', toIndex: 1 }],
    ]);
    expect(column(wrapper, 'todo')).toEqual(['Draw icons', 'Write spec']);
    expect(document.activeElement).toBe(card('t1'));
    expect(wrapper.get('[aria-live]').text()).toBe('Moved Write spec to To do, position 2 of 2');
  });

  it('moves across columns, keeping the row where it can, and stops at the last column', async () => {
    const wrapper = mountBoard();
    card('t2').focus();
    await alt('ArrowRight');
    expect(column(wrapper, 'doing')).toEqual(['Build board', 'Draw icons']);
    await alt('ArrowRight');
    expect(column(wrapper, 'done')).toEqual(['Draw icons']);
    await alt('ArrowRight');
    expect(wrapper.emitted('applied')).toHaveLength(2);
    expect(document.activeElement).toBe(card('t2'));
    await alt('ArrowLeft');
    expect(column(wrapper, 'doing')).toEqual(['Draw icons', 'Build board']);
  });

  it('keeps a locked card in place', async () => {
    const wrapper = mountBoard({ isLocked: true });
    expect(card('t1').getAttribute('draggable')).toBe('false');
    expect(card('t1').hasAttribute('aria-describedby')).toBe(false);
    card('t1').focus();
    await alt('ArrowDown');
    expect(wrapper.emitted('applied')).toBeUndefined();
  });
});
