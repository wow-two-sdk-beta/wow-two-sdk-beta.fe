import { expect, it } from 'vitest';
import { effectScope, nextTick, shallowRef } from 'vue';
import { useScrollLock } from '@src/foundation/dom';

it('keeps nested document locks until the final owner leaves', async () => {
  const original = document.body.style.overflow;
  document.body.style.overflow = 'auto';
  const first = effectScope();
  const second = effectScope();
  try {
    first.run(() => useScrollLock());
    second.run(() => useScrollLock());
    await nextTick();
    expect(document.body.style.overflow).toBe('hidden');
    first.stop();
    expect(document.body.style.overflow).toBe('hidden');
    second.stop();
    expect(document.body.style.overflow).toBe('auto');
  } finally {
    first.stop();
    second.stop();
    document.body.style.overflow = original;
  }
});

it('moves a lock between documents without releasing another document owner', async () => {
  const frame = document.createElement('iframe');
  document.body.append(frame);
  const other = frame.contentDocument!;
  const current = shallowRef(document);
  const dynamic = effectScope();
  const fixed = effectScope();
  const original = document.body.style.overflow;
  try {
    dynamic.run(() => useScrollLock(true, current));
    fixed.run(() => useScrollLock());
    await nextTick();
    current.value = other;
    await nextTick();
    expect(document.body.style.overflow).toBe('hidden');
    expect(other.body.style.overflow).toBe('hidden');
    dynamic.stop();
    expect(other.body.style.overflow).toBe('');
    expect(document.body.style.overflow).toBe('hidden');
  } finally {
    dynamic.stop();
    fixed.stop();
    frame.remove();
    document.body.style.overflow = original;
  }
});
