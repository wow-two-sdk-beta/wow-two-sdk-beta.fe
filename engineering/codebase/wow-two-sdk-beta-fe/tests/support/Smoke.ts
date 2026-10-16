import { createSSRApp, h, nextTick, type Component, type VNode } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { mount } from '@vue/test-utils';
import { expect } from 'vitest';

/**
 * The `$props` of an SFC default export — the declared props plus the emit handlers, with the
 * required ones still required.
 *
 * Two shapes, because `vue-tsc` compiles the two kinds of SFC differently: a plain
 * `<script setup>` becomes a constructor carrying `$props`, while a `generic="…"` one becomes a
 * generic *function* whose first parameter is the props object. Matching only the constructor
 * would silently fall through to `never` for every generic component — `DataTable`, `Select`,
 * `Listbox`, `ToggleButton` — and quietly retire the typecheck for exactly the components whose
 * prop surface is hardest to get right.
 *
 * This is the whole reason `smokeCase` takes props as a typed argument rather than a loose
 * record: `tsconfig.typecheck.json` covers `tests/**`, so a component that grows a required
 * prop breaks `pnpm typecheck` at the registry entry that no longer satisfies it. The registry
 * is a compile-time inventory first and a runtime one second.
 */
export type PropsOf<C> = C extends abstract new (...args: never[]) => { $props: infer P }
  ? P
  : C extends (props: infer P, ...args: never[]) => unknown
    ? P
    : never;

/** The subset of an SFC default export's type that `smokeCase` needs to read props off. */
type ComponentLike = (abstract new (...args: never[]) => { $props: object }) | ((...args: never[]) => unknown);

/** Marks the probe node handed to a component's default slot, so the assertion can find it. */
export const SLOT_PROBE_ATTR = 'data-smoke-slot-probe';

/** One component's smoke entry — what to mount, with what, and which tiers apply to it. */
export interface SmokeCase {
  /** The exported name, as a consumer imports it. Also the test title. */
  readonly name: string;
  readonly component: Component;
  readonly props: Record<string, unknown>;

  /**
   * Renders its default slot unconditionally, so the slot-probe assertion applies.
   * Left off for roots that gate their slot on open/active state — those are covered by the
   * composed-tree test in the group's focused file instead.
   */
  readonly slot?: boolean;

  /**
   * Renders the case inside the parent(s) whose `provide` it injects.
   *
   * Compound parts — `TabsPanel`, `PopoverContent`, `SelectItem` — throw by contract when
   * mounted bare (`"Tabs.* must be used inside <Tabs>"`). Wrapping rather than skipping is
   * what keeps them covered: the part is exercised in the context it actually ships in, and
   * the registry stays one flat inventory instead of splitting into a second composed suite.
   */
  readonly wrap?: (node: VNode) => VNode;

  /** Reason this case is excluded from the SSR tier. Present = skipped, and the string says why. */
  readonly skipSsr?: string;

  /** Reason this case is excluded from the mount tier. Present = skipped, and the string says why. */
  readonly skipMount?: string;
}

interface SmokeOptions {
  readonly slot?: boolean;
  readonly wrap?: (node: VNode) => VNode;
  readonly skipSsr?: string;
  readonly skipMount?: string;
}

/**
 * Declares one smoke case. `props` is typechecked against the component, so omitting a required
 * prop is a `pnpm typecheck` failure rather than a runtime warning nobody reads.
 */
export function smokeCase<C extends ComponentLike>(
  name: string,
  component: C,
  props: PropsOf<C>,
  options: SmokeOptions = {},
): SmokeCase {
  return {
    name,
    component: component as unknown as Component,
    props: props as Record<string, unknown>,
    ...options,
  };
}

/** The probe node handed to a default slot. */
function slotProbe(): VNode {
  return h('span', { [SLOT_PROBE_ATTR]: '' }, 'probe');
}

/**
 * Vue warnings that are always a defect rather than noise. A component that mounts while
 * warning `Missing required prop` has not really mounted — it rendered a hole.
 */
const FATAL_WARNINGS = [
  'Missing required prop',
  'Invalid prop',
  'injection "',
  'Failed to resolve component',
  'Failed to resolve directive',
  'was accessed during render but is not defined',
  'Maximum recursive updates',
  'Unhandled error',
  'Invalid VNode type',
  'Slot "default" invoked outside of the render function',
];

/** Captures `console.warn` / `console.error` for the duration of `run`. */
async function captureConsole(run: () => Promise<void> | void): Promise<readonly string[]> {
  const messages: string[] = [];
  const record = (...args: readonly unknown[]): void => {
    messages.push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '));
  };
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = record;
  console.error = record;
  try {
    await run();
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }
  return messages;
}

/** The captured messages that name a real defect. */
function fatalOnly(messages: readonly string[]): readonly string[] {
  return messages.filter((m) => FATAL_WARNINGS.some((f) => m.includes(f)));
}

/** The case's own vnode, with a slot probe when the case declares a default slot. */
function caseNode(testCase: SmokeCase, withProbe: boolean): VNode {
  return h(testCase.component, testCase.props, withProbe ? { default: () => slotProbe() } : undefined);
}

/** The case's vnode inside its required parents, as a mountable component. */
function harness(testCase: SmokeCase, withProbe: boolean): Component {
  return {
    name: `${testCase.name}Harness`,
    render: () => {
      const node = caseNode(testCase, withProbe);
      return testCase.wrap === undefined ? node : testCase.wrap(node);
    },
  };
}

/**
 * Mounts the case and asserts it neither throws nor warns fatally. Asserts that a mount happens
 * at all, not what it produced — depth is the focused files' job.
 */
export async function assertMounts(testCase: SmokeCase): Promise<void> {
  const messages = await captureConsole(() => {
    const wrapper = mount(harness(testCase, testCase.slot === true));
    wrapper.unmount();
  });
  expect(fatalOnly(messages), `${testCase.name} warned while mounting`).toEqual([]);
}

/**
 * Mounts the case with a probe in the default slot and asserts the probe reached the DOM.
 *
 * Searches the document as well as the wrapper: every overlay renders its content through
 * `Portal`, which teleports to `document.body` and so lands outside the mounted tree that
 * `wrapper.find` walks.
 */
export async function assertRendersDefaultSlot(testCase: SmokeCase): Promise<void> {
  const wrapper = mount(harness(testCase, true));
  // `Portal` withholds its teleport until it is mounted (its SSR guard), so portalled slot
  // content lands one tick after mount.
  await nextTick();
  const selector = `[${SLOT_PROBE_ATTR}]`;
  const rendered = wrapper.find(selector).exists() || document.body.querySelector(selector) !== null;
  expect(rendered, `${testCase.name} did not render its default slot`).toBe(true);
  wrapper.unmount();
}

/**
 * Server-renders the case. Runs in the `ssr` project, which has NO DOM globals — so a component
 * that reaches for `window` / `document` at setup, or from an `immediate: true` watcher (which
 * Vue runs on the server), throws here and nowhere else.
 */
export async function assertRendersOnServer(testCase: SmokeCase): Promise<string> {
  const app = createSSRApp(harness(testCase, testCase.slot === true));
  const messages: string[] = [];
  app.config.warnHandler = (message) => {
    messages.push(message);
  };
  const html = await renderToString(app);
  expect(fatalOnly(messages), `${testCase.name} warned while server-rendering`).toEqual([]);
  return html;
}

/**
 * Registers the three breadth assertions for a group of cases. Called from the `dom` tier;
 * the SSR tier calls {@link assertRendersOnServer} from its own file so the two stay in
 * separate environments.
 */
export function describeMountTier(
  cases: readonly SmokeCase[],
  register: (name: string, run: () => Promise<void>) => void,
): void {
  for (const testCase of cases) {
    if (testCase.skipMount !== undefined) continue;
    register(`${testCase.name} mounts`, () => assertMounts(testCase));
    if (testCase.slot === true) {
      register(`${testCase.name} renders its default slot`, () => assertRendersDefaultSlot(testCase));
    }
  }
}
