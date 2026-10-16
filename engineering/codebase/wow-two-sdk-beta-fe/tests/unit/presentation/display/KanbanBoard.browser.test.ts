import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { KanbanBoardHarness } from './KanbanBoardHarness';
import '@src/index.css';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

function drag(type: string, target: Element, clientY: number, transfer: DataTransfer): void {
  target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, clientY, dataTransfer: transfer }));
}

function titles(key: string): string[] {
  return [...document.querySelectorAll(`[data-column-key=${key}] [data-item-key]`)].map(
    (card) => card.textContent?.trim() ?? '',
  );
}

it('drops a card into an empty column and below a card, showing where it will land', async () => {
  wrapper = mount(KanbanBoardHarness, { attachTo: document.body });
  const transfer = new DataTransfer();
  const spec = document.querySelector('[data-item-key=t1]')!;
  const done = document.querySelector('[data-column-key=done]')!;
  drag('dragstart', spec, 0, transfer);
  drag('dragover', done, done.getBoundingClientRect().bottom - 4, transfer);
  await nextTick();
  expect(done.querySelector('[data-drop-indicator]')).not.toBeNull();
  expect(spec.hasAttribute('data-dragging')).toBe(true);
  drag('drop', done, done.getBoundingClientRect().bottom - 4, transfer);
  drag('dragend', spec, 0, transfer);
  await nextTick();
  expect(titles('done')).toEqual(['Write spec']);
  expect(wrapper.emitted('applied')?.[0]).toEqual([
    { itemKey: 't1', fromColumn: 'todo', fromIndex: 0, toColumn: 'done', toIndex: 0 },
  ]);

  const icons = document.querySelector('[data-item-key=t2]')!;
  const build = document.querySelector('[data-item-key=d1]')!;
  const lowerHalf = build.getBoundingClientRect().bottom - 2;
  drag('dragstart', icons, 0, transfer);
  drag('dragover', build, lowerHalf, transfer);
  drag('drop', build, lowerHalf, transfer);
  drag('dragend', icons, 0, transfer);
  await nextTick();
  expect(titles('doing')).toEqual(['Build board', 'Draw icons']);
  expect(document.querySelector('[data-drop-indicator]')).toBeNull();
});
