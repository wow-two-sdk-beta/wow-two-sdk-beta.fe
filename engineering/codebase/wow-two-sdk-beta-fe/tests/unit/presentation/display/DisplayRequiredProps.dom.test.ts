import { describe, expect, it } from 'vitest';
import { h, type Component } from 'vue';
import { mount } from '@vue/test-utils';
import {
  AudioWaveformPreview,
  CellsGlyph,
  DiffViewer,
  EventCalendarViewer,
  FrameGlyph,
  GanttTimeline,
  HeatmapCalendarGrid,
  RadiusGlyph,
  ReactionBar,
} from '@src/presentation/display';
import { DataGridEditor } from '@src/presentation/forms';
import { TourPopover } from '@src/presentation/overlays';

/*
 * Degrade-don't-crash, for the components whose required prop is a collection.
 *
 * Vue's `required: true` only WARNS. Render then proceeds with the prop still
 * `undefined`, and each of these dereferenced it immediately — `.length`, `.filter`,
 * `.split`, `for...of` — turning a missing prop into a raw `TypeError` that unmounts
 * the whole tree. A prop that is transiently `undefined` while a fetch resolves is the
 * ordinary case, not the exotic one, so it must not be able to take the page down.
 *
 * The contract asserted here is deliberately two-sided: the component renders, AND the
 * "Missing required prop" warning still fires. Silencing the warning would trade one
 * defect for a quieter one — the API misuse has to stay visible in dev.
 */

/** The dereference failures these components used to raise, by their console signature. */
const CRASH_SIGNATURES = [
  'TypeError',
  'Cannot read properties of undefined',
  'Cannot read properties of null',
  'is not iterable',
  'is not a function',
];

interface GuardCase {
  readonly name: string;
  readonly component: Component;
  /** The required prop the case deliberately omits. */
  readonly omits: string;
  /** Props other than the omitted one that the component needs to render at all. */
  readonly props?: Record<string, unknown>;
}

/**
 * Declares one case.
 *
 * The cast is not laziness. `vue-tsc` compiles a `generic="T"` SFC (`DataGridEditor`) to a generic
 * FUNCTION whose `__VLS_ctx.slots` is required, which no plain `Component` satisfies — the
 * same split `tests/support/Smoke.ts` documents on `PropsOf`. Nothing here reads the prop
 * types anyway: omitting the required prop is the whole point, so a typed surface would only
 * be in the way.
 */
function guardCase(name: string, component: unknown, omits: string, props?: Record<string, unknown>): GuardCase {
  return { name, component: component as Component, omits, props };
}

const cases: readonly GuardCase[] = [
  guardCase('AudioWaveformPreview', AudioWaveformPreview, 'peaks'),
  guardCase('DataGridEditor', DataGridEditor, 'rows'),
  guardCase('DiffViewer', DiffViewer, 'left'),
  guardCase('EventCalendarViewer', EventCalendarViewer, 'events'),
  guardCase('GanttTimeline', GanttTimeline, 'tasks'),
  guardCase('HeatmapCalendarGrid', HeatmapCalendarGrid, 'values'),
  guardCase('ReactionBar', ReactionBar, 'reactions'),
  guardCase('TourPopover', TourPopover, 'steps'),
  /* The same defect in numeric clothing: an absent number reached an SVG geometry
     attribute as `NaN`, which the browser rejects outright ( `rx="NaN"` ). */
  guardCase('CellsGlyph', CellsGlyph, 'cornerRx'),
  guardCase('FrameGlyph', FrameGlyph, 'frameRx'),
  guardCase('RadiusGlyph', RadiusGlyph, 'extent'),
];

/** Captures `console.warn` / `console.error` for the duration of `run`. */
function captureConsole(run: () => void): readonly string[] {
  const messages: string[] = [];
  const record = (...args: readonly unknown[]): void => {
    messages.push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '));
  };
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = record;
  console.error = record;
  try {
    run();
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }
  return messages;
}

describe('presentation/display — a missing required collection degrades, it does not crash', () => {
  for (const testCase of cases) {
    it(`${testCase.name} renders with no \`${testCase.omits}\``, () => {
      let html = '';
      const messages = captureConsole(() => {
        // The omission is the point, so the typed prop surface is bypassed on purpose.
        const wrapper = mount({
          render: () => h(testCase.component, { ...testCase.props }),
        });
        html = wrapper.html();
        wrapper.unmount();
      });

      const crashes = messages.filter((m) => CRASH_SIGNATURES.some((s) => m.includes(s)));
      expect(crashes, `${testCase.name} crashed instead of degrading`).toEqual([]);
      expect(html.length, `${testCase.name} rendered nothing`).toBeGreaterThan(0);
      expect(html, `${testCase.name} emitted a NaN geometry attribute`).not.toContain('NaN');
    });

    it(`${testCase.name} still warns that \`${testCase.omits}\` is missing`, () => {
      const messages = captureConsole(() => {
        const wrapper = mount({ render: () => h(testCase.component, { ...testCase.props }) });
        wrapper.unmount();
      });

      const warned = messages.some((m) => m.includes('Missing required prop') && m.includes(testCase.omits));
      expect(warned, `${testCase.name} silently accepted a missing \`${testCase.omits}\``).toBe(true);
    });
  }
});
