import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { computeDiff } from '@src/presentation/display/diffViewer/LineDiff';
import AudioWaveformPreview from '@src/presentation/display/audioWaveformPreview/AudioWaveformPreview.vue';

describe('linear-space line differences', () => {
  it('reconstructs both inputs and keeps an optimal common subsequence', () => {
    let seed = 73;
    const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
    for (let sample = 0; sample < 200; sample++) {
      const a = Array.from({ length: (next() % 14) + 1 }, () => String(next() % 5));
      const b = Array.from({ length: (next() % 14) + 1 }, () => String(next() % 5));
      const oracle = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
      for (let i = 1; i <= a.length; i++)
        for (let j = 1; j <= b.length; j++) {
          oracle[i]![j] =
            a[i - 1] === b[j - 1] ? oracle[i - 1]![j - 1]! + 1 : Math.max(oracle[i - 1]![j]!, oracle[i]![j - 1]!);
        }
      const rows = computeDiff(a.join('\n'), b.join('\n'));
      expect(rows.filter((row) => row.op !== 'added').map((row) => row.text)).toEqual(a);
      expect(rows.filter((row) => row.op !== 'removed').map((row) => row.text)).toEqual(b);
      expect(rows.filter((row) => row.op === 'unchanged')).toHaveLength(oracle[a.length]![b.length]!);
      expect(rows.filter((row) => row.leftNum !== null).map((row) => row.leftNum)).toEqual(
        a.map((_, index) => index + 1),
      );
      expect(rows.filter((row) => row.rightNum !== null).map((row) => row.rightNum)).toEqual(
        b.map((_, index) => index + 1),
      );
    }
  });
  it('handles large common regions and disjoint texts without allocating a matrix', () => {
    const lines = Array.from({ length: 20_000 }, (_, i) => `line ${i}`);
    const changed = [...lines];
    changed[10_000] = 'replacement';
    expect(computeDiff(lines.join('\n'), changed.join('\n')).filter((row) => row.op !== 'unchanged')).toHaveLength(2);
    expect(computeDiff(lines.join('\n'), lines.map((line) => `other ${line}`).join('\n'))).toHaveLength(40_000);
  });
});

describe('waveform geometry and seeking', () => {
  it('handles malformed geometry and amplitudes without non-finite SVG values', () => {
    const wrapper = mount(AudioWaveformPreview, {
      props: { peaks: [NaN, Infinity, -2], width: Infinity, height: -1, barWidth: 0, gap: NaN, progress: NaN },
    });
    try {
      expect(wrapper.get('svg').attributes('viewBox')).toBe('0 0 320 48');
      expect(wrapper.findAll('rect')).toHaveLength(3);
      expect(wrapper.html()).not.toMatch(/NaN|Infinity/);
      expect(wrapper.get('svg').attributes('aria-valuenow')).toBeUndefined();
    } finally {
      wrapper.unmount();
    }
  });
  it('does not seek when noninteractive or zero-sized', async () => {
    const seek = vi.fn();
    const wrapper = mount(AudioWaveformPreview, { props: { peaks: [0.5], isInteractive: false, onSeek: seek } });
    try {
      await wrapper.get('svg').trigger('keydown', { key: 'ArrowRight' });
      await wrapper.get('svg').trigger('click', { clientX: 5 });
      expect(seek).not.toHaveBeenCalled();
      await wrapper.setProps({ isInteractive: true });
      vi.spyOn(wrapper.get('svg').element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 0, 0));
      await wrapper.get('svg').trigger('click', { clientX: 5 });
      expect(seek).not.toHaveBeenCalled();
      await wrapper.get('svg').trigger('keydown', { key: 'End' });
      expect(seek).toHaveBeenCalledWith(1);
    } finally {
      wrapper.unmount();
    }
  });
  it('does not allocate invented bars for large layout widths', () => {
    const wrapper = mount(AudioWaveformPreview, {
      props: { peaks: [0.2, 0.8], width: Number.MAX_VALUE, barWidth: 0.0001 },
    });
    try {
      expect(wrapper.findAll('rect')).toHaveLength(2);
    } finally {
      wrapper.unmount();
    }
  });
});
