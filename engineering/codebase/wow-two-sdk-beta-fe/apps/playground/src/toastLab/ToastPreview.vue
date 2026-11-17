<script setup lang="ts">
import {
  computed,
  Fragment,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue';
import {
  Clock3,
  Globe2,
  Grid2X2,
  History,
  House,
  LayoutList,
  ListFilter,
  Package,
  RadioTower,
  ShieldCheck,
  Users,
} from 'lucide-vue-next';
import {
  createFeedbackBus,
  NoticeCategory,
  NoticePriority,
  NoticeTone,
  type FeedbackBus,
  type NoticeGroup,
  type NoticeProgress,
  type ToastPauseUntil,
} from '@wow-two-beta/fe/feedback';
import { Key } from '@wow-two-beta/fe/foundation/dom';
import { Politeness } from '@wow-two-beta/fe/foundation/primitives';
import { getTheme, themeToCss } from '@wow-two-beta/fe/foundation/themes';
import { Button } from '@wow-two-beta/fe/presentation/actions';
import {
  Badge,
  Card,
  EmptyState,
  NotificationCenterGroup,
  NotificationCenterButton,
  TabsGroup,
  TabsGroupList,
  TabsGroupPanel,
  TabsGroupTab,
} from '@wow-two-beta/fe/presentation/display';
import { FeedbackToastHost, toastHost, type ToastHostProps } from '@wow-two-beta/fe/presentation/feedback';
import { ToggleGroup, ToggleInput } from '@wow-two-beta/fe/presentation/forms';
import { AppFrame } from '@wow-two-beta/fe/presentation/layout';
import { SidebarMenu, SidebarMenuItem, SidebarMenuSection } from '@wow-two-beta/fe/presentation/nav';
import {
  DefaultToastLabSettings,
  PriorityDurations,
  ToastTimerChoices,
  type ToastLabContext,
  type ToastLabSettings,
  type ToastPreviewEvent,
  type ToastPreviewMessage,
  type ToastScenario,
} from './ToastLabConfig';
import ConsolePostsPreview, { ConsolePostsView } from './ConsolePostsPreview.vue';
import './toastPreview.css';

/** The fictional source the Console sample collects from; it has no real address. */
const SourceName = 'City Events Guide';
const SourceHost = 'events.example';
const SceneThemes: Readonly<Record<ToastLabContext, string>> = { console: 'platform', catalogue: 'frost' };
const PauseStorageKey = 'wow2-fe-toast-lab-pause';

/** The classes of the floating History panel. */
const HistoryPanelClasses = [
  'toast-preview-history fixed z-[calc(var(--z-index-toast)+1)] overflow-hidden rounded-xl border border-border',
  'bg-popover text-popover-foreground shadow-xl',
];

/** The classes of the phone layout's bottom navigation. */
const BottomNavClasses = [
  'toast-preview-bottom-nav surface-glass flex items-center justify-evenly',
  'border-t border-glass-edge px-3',
];

const settings = reactive<ToastLabSettings>({ ...DefaultToastLabSettings });
let reminderTimer: number | undefined;

/** One bus per preview scope; Urgent breaks through a pause only when the lab asks for it. */
function createLabBus(bypass: boolean): FeedbackBus {
  return createFeedbackBus({
    pauseBypass: bypass ? NoticePriority.Urgent : undefined,
    reminders: {
      delayMs: 5000,
      schedule: ({ dueAtMs }, signal) => {
        signal.throwIfAborted();
        clearReminder();
        reminderTimer = window.setTimeout(
          () => {
            reminderTimer = undefined;
            showReminder();
          },
          Math.max(0, dueAtMs - Date.now()),
        );
        return Promise.resolve();
      },
    },
  });
}

function readStoredPause(): ToastPauseUntil {
  try {
    const stored = window.localStorage.getItem(PauseStorageKey);
    return stored === 'manual' ? stored : stored === null ? null : Number(stored);
  } catch {
    // Storage can be unavailable in embedded or private previews.
    return null;
  }
}

/** Mirrors a bus's pause into storage so a reload restores it; returns the unsubscribe. */
function storePause(target: FeedbackBus): () => void {
  let saved: ToastPauseUntil | undefined;
  return target.subscribeNotificationState(({ pausedUntil }) => {
    if (pausedUntil === saved) return;
    saved = pausedUntil;
    try {
      if (pausedUntil === null) window.localStorage.removeItem(PauseStorageKey);
      else window.localStorage.setItem(PauseStorageKey, String(pausedUntil));
    } catch {
      // Pause still works for the current session.
    }
  });
}

const bus = shallowRef<FeedbackBus>(createLabBus(settings.pauseBypass));
bus.value.setToastPause(readStoredPause());
let stopPauseStorage = storePause(bus.value);

/** Swaps in a bus with a new pause bypass. The pause carries over; History starts empty. */
function replaceBus(bypass: boolean): void {
  const previous = bus.value;
  const { pausedUntil } = previous.notificationState();
  // Disposing resets the pause, which must not reach the stored preference.
  stopPauseStorage();
  const next = createLabBus(bypass);
  next.setToastPause(pausedUntil);
  stopPauseStorage = storePause(next);
  bus.value = next;
  previous.dispose();
}

const toastOptions = computed<ToastHostProps>(() => ({
  position: settings.placement,
  motion: settings.motion,
  groupMotion: settings.groupMotion,
  timer: ToastTimerChoices[settings.timer].timer,
  max: 3,
  priorityDurations: PriorityDurations,
  moveDuration: 200 / settings.speed,
  surface: settings.surface,
  hotkey: settings.hotkey ? 'F8' : false,
}));
const isHistoryOpen = ref(false);
const historyToggle = useTemplateRef<InstanceType<typeof NotificationCenterButton>>('historyToggle');
const historyPanel = useTemplateRef<InstanceType<typeof NotificationCenterGroup>>('historyPanel');
const activityHeading = useTemplateRef<HTMLHeadingElement>('activityHeading');
const page = ref<'source' | 'activity'>('source');
const sourceTab = ref('posts');
const galleryView = ref<ConsolePostsView>(ConsolePostsView.Cards);
interface PreviewItem {
  readonly id: number;
  readonly label: string;
  readonly state: string;
}

const activity = shallowRef<ReadonlyArray<PreviewItem>>([]);
const selectedActivity = ref<number>();
const queuedHarvestCount = computed(() => activity.value.filter((item) => item.state === 'Queued').length);
let nextActivityId = 0;
let cancellable: { readonly id: string; readonly item: number } | undefined;
let announcerObserver: MutationObserver | undefined;
const burstTimers = new Set<number>();
const taskTimers = new Set<number>();
const isConsole = computed(() => settings.context === 'console');
const app = computed(() => (isConsole.value ? 'Console' : 'Catalogue'));
const section = computed(() => (isConsole.value ? 'Sources' : 'Catalogue'));
const track = computed(() => (isConsole.value ? 'Activity' : 'Products'));
const activeTab = computed(() => (page.value === 'activity' ? 'activity' : sourceTab.value));
const tabLabel = computed(() => activeTab.value.charAt(0).toUpperCase() + activeTab.value.slice(1));
const crumbs = computed(() =>
  isConsole.value
    ? ['Collect', 'Sources', SourceName, SourceHost, tabLabel.value]
    : ['Catalogue', page.value === 'activity' ? 'Products' : 'Drafts'],
);
const account = { name: 'Test operator', description: 'Preview workspace', showAppearance: false } as const;
const themeStyle = document.createElement('style');

function post(message: ToastPreviewEvent): void {
  if (window.parent !== window) window.parent.postMessage(message, location.origin);
}

function postState(): void {
  post({ type: 'toast-preview-state', cancellable: cancellable !== undefined });
}

function closeHistory(returnFocus = false): void {
  isHistoryOpen.value = false;
  if (returnFocus) historyToggle.value?.el?.focus();
}

function toggleHistory(): void {
  if (isHistoryOpen.value) {
    closeHistory(true);
    return;
  }
  isHistoryOpen.value = true;
  void nextTick(() => historyPanel.value?.el?.focus());
}

/** Closes the History panel on Escape, returning focus to its bell. */
function onKeydown(event: KeyboardEvent): void {
  if (event.key === Key.Escape && isHistoryOpen.value) closeHistory(true);
}

function showActivity(item?: number): void {
  selectedActivity.value = item;
  page.value = 'activity';
  closeHistory();
  void nextTick(() => activityHeading.value?.focus());
}

function showSource(tab = 'posts'): void {
  sourceTab.value = tab;
  page.value = 'source';
}

function chooseSourceTab(tab: string): void {
  if (tab === 'activity') showActivity();
  else showSource(tab);
}

function recordActivity(label: string, state: string): PreviewItem {
  const item = { id: ++nextActivityId, label, state };
  activity.value = [item, ...activity.value];
  return item;
}

function setActivityState(id: number, state: string): void {
  activity.value = activity.value.map((row) => (row.id === id ? { ...row, state } : row));
}

function action(label: string, run: () => void) {
  return h(Button, { size: 'xs', variant: 'outline', onClick: run }, () => label);
}

function queueBatch(): void {
  recordActivity(`${SourceName} · Fashion`, 'Queued');
  recordActivity(`${SourceName} · Exhibitions`, 'Queued');
  bus.value.notify({
    tone: NoticeTone.Success,
    title: '2 harvests queued.',
    priority: NoticePriority.Normal,
    category: confirmCategory(),
    action: action('View activity', () => showActivity()),
  });
}

function queueOne(): void {
  const item = recordActivity(`${SourceName} · Exhibitions`, 'Queued');
  const openRun = action('Open run', () => showActivity(item.id));
  bus.value.notify({
    id: `console:harvest:${item.id}`,
    tone: NoticeTone.Success,
    title: 'Harvest queued.',
    description: `${item.label} · Run ${item.id}`,
    compact: { title: `Run ${item.id}`, description: settings.groupMatching ? undefined : item.label },
    group: settings.groupMatching
      ? { key: 'console:city-events:exhibitions:queued', title: 'Exhibitions harvests queued.' }
      : undefined,
    // An existing run stays at the anchor when Priority stack adds comparison cards.
    priority: NoticePriority.High,
    category: confirmCategory(),
    action: item.id % 3 === 0 ? h(Fragment, null, [openRun, action('Open source posts', () => showSource())]) : openRun,
  });
}

function createProduct(): void {
  const item = recordActivity('Ivory silk scarf', 'Draft');
  bus.value.notify({
    tone: NoticeTone.Success,
    title: 'Product created.',
    description: item.label,
    priority: NoticePriority.Normal,
    category: confirmCategory(),
    action: action('Open product', () => showActivity(item.id)),
  });
}

function confirmCategory(): NoticeCategory {
  return settings.history && settings.keepConfirmations ? NoticeCategory.Retained : NoticeCategory.Transient;
}

/** Task outcomes stay in History whenever the lab has History on. */
function outcomeCategory(): NoticeCategory {
  return settings.history ? NoticeCategory.Retained : NoticeCategory.Transient;
}

function showReminder(): void {
  bus.value.notify({
    id: 'catalogue-review-reminder',
    reminderKey: 'catalogue-review',
    tone: NoticeTone.Info,
    title: 'Catalogue review is due.',
    description: 'Check the new product details before publishing.',
    priority: NoticePriority.High,
    durationMs: settings.history ? undefined : Infinity,
    category: outcomeCategory(),
    action: action('Open review', () => {
      const item = recordActivity('Catalogue review', 'Due');
      showActivity(item.id);
    }),
  });
}

function showLongNotice(): void {
  const item = recordActivity(
    isConsole.value ? `${SourceName} · Entries without dates` : 'Ivory silk scarf',
    'Needs review',
  );
  bus.value.notify({
    tone: NoticeTone.Warning,
    title: isConsole.value ? 'Three entries need review.' : 'The product draft needs review.',
    description: isConsole.value
      ? 'Dates were missing from the latest harvest. ' +
        'Check the entries in Activity before accepting them into the catalogue.'
      : 'Check the supplier, material and care instructions before publishing the product in the catalogue.',
    priority: NoticePriority.High,
    durationMs: settings.history ? undefined : Infinity,
    category: outcomeCategory(),
    action: action(isConsole.value ? 'View activity' : 'Open product', () => showActivity(item.id)),
    details: h(Fragment, null, [
      h(
        'p',
        { class: 'mb-2 text-sm text-muted-foreground' },
        isConsole.value
          ? 'Open the run list for the original results or return to Posts to compare the affected entries.'
          : 'The product draft remains available while the review is open. ' +
              'Return to the list to compare it with other drafts.',
      ),
      action(isConsole.value ? 'Open source posts' : 'Open drafts', () => showSource()),
    ]),
  });
}

function clearTimers(timers: Set<number>): void {
  for (const timer of timers) window.clearTimeout(timer);
  timers.clear();
}

/** Stops scheduled steps. A tracked operation whose next step is cleared never settles and publishes nothing more. */
function clearPlayback(): void {
  clearTimers(burstTimers);
  clearTimers(taskTimers);
}

function schedulePlayback(timers: Set<number>, run: () => void, delay: number): void {
  const timer = window.setTimeout(() => {
    timers.delete(timer);
    run();
  }, delay);
  timers.add(timer);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => schedulePlayback(taskTimers, resolve, ms));
}

function playPriorityStack(): void {
  const task = isConsole.value ? `${SourceName} · 2 harvest sections` : 'Catalogue export · 3 collections';
  const item = recordActivity(task, 'Running');
  bus.value.notify({
    tone: NoticeTone.Info,
    title: isConsole.value ? 'Harvest running.' : 'Catalogue export running.',
    description: task,
    priority: NoticePriority.High,
    action: action(isConsole.value ? 'Open run' : 'View export', () => showActivity(item.id)),
  });
  bus.value.notify({
    tone: NoticeTone.Info,
    title: isConsole.value ? 'Source list refreshed.' : 'Catalogue refreshed.',
    priority: NoticePriority.Normal,
    durationMs: PriorityDurations[NoticePriority.Low],
  });
  bus.value.notify({
    tone: NoticeTone.Success,
    title: 'Changes saved.',
    priority: NoticePriority.Normal,
  });
}

function playTaskUpdate(): void {
  const item = recordActivity(isConsole.value ? `${SourceName} · Exhibitions` : 'Catalogue export', 'Running');
  const notice = {
    id: `task:${item.id}`,
    priority: NoticePriority.High,
    action: action(isConsole.value ? 'Open run' : 'View export', () => showActivity(item.id)),
  };
  bus.value.notify({
    ...notice,
    tone: NoticeTone.Info,
    title: isConsole.value ? 'Harvest running.' : 'Catalogue export running.',
    description: '1 of 2 sections processed.',
  });
  schedulePlayback(
    taskTimers,
    () => {
      setActivityState(item.id, 'Completed');
      bus.value.notify({
        ...notice,
        tone: NoticeTone.Success,
        title: isConsole.value ? 'Harvest complete.' : 'Catalogue export complete.',
        description: '2 of 2 sections processed.',
      });
    },
    1350,
  );
}

/** The words a tracked run uses in each sample app. */
function trackCopy() {
  return isConsole.value
    ? {
        unit: 'sections',
        run: 'Run',
        open: 'Open run',
        running: 'Harvest in progress.',
        done: 'Harvest finished.',
        partial: 'Harvest finished with errors.',
        failed: 'One section could not be read.',
      }
    : {
        unit: 'collections',
        run: 'Import',
        open: 'View import',
        running: 'Import in progress.',
        done: 'Import finished.',
        partial: 'Import finished with errors.',
        failed: 'One collection could not be read.',
      };
}

/** `bus.track` from "Queued" through counted steps to success, or to a warning with Retry when `fails`. */
function playTrack(fails: boolean, retry?: PreviewItem): void {
  const copy = trackCopy();
  const item =
    retry ??
    recordActivity(isConsole.value ? `${SourceName} · 3 sections` : 'Catalogue import · 3 collections', 'Queued');
  if (retry) setActivityState(item.id, 'Queued');
  const step = (value: number): NoticeProgress => ({ value, max: 3, label: `${value} of 3 ${copy.unit}` });
  const open = action(copy.open, () => showActivity(item.id));
  const shared = {
    id: `track:${item.id}`,
    priority: NoticePriority.High,
    category: outcomeCategory(),
    description: item.label,
    compact: { title: `${copy.run} ${item.id}`, description: item.label },
  };
  void bus.value
    .track(
      async (report) => {
        await wait(900);
        setActivityState(item.id, 'Running');
        report(step(1));
        await wait(1100);
        report(step(2));
        await wait(1100);
        if (fails) throw new Error(copy.failed);
        report(step(3));
        await wait(600);
      },
      {
        running: { ...shared, tone: NoticeTone.Info, title: copy.running, progress: { label: 'Queued' }, action: open },
        success: {
          ...shared,
          tone: NoticeTone.Success,
          title: copy.done,
          description: `${item.label} · 3 of 3 ${copy.unit} collected.`,
          action: open,
        },
        failure: {
          ...shared,
          tone: NoticeTone.Warning,
          title: copy.partial,
          description: `2 of 3 ${copy.unit} collected. ${copy.failed}`,
          action: h(Fragment, null, [action('Retry', () => playTrack(false, item)), open]),
        },
      },
    )
    .then(
      () => setActivityState(item.id, 'Completed'),
      () => setActivityState(item.id, 'Partly failed'),
    );
}

/** Two runs under one group key: one finished, one still running until it completes a few seconds later. */
function playGroupedProgress(): void {
  const copy = trackCopy();
  const group: NoticeGroup = isConsole.value
    ? { key: 'console:city-events:runs', title: `${SourceName} runs.` }
    : { key: 'catalogue:imports', title: 'Catalogue imports.' };
  const category = outcomeCategory();
  const step = (value: number): NoticeProgress => ({ value, max: 3, label: `${value} of 3 ${copy.unit}` });
  const done = recordActivity(isConsole.value ? `${SourceName} · Fashion` : 'Spring collection import', 'Completed');
  bus.value.notify({
    id: `track:${done.id}`,
    group,
    category,
    priority: NoticePriority.High,
    tone: NoticeTone.Success,
    title: copy.done,
    description: `${done.label} · 3 of 3 ${copy.unit} collected.`,
    compact: { title: `${copy.run} ${done.id} finished`, description: done.label },
    action: action(copy.open, () => showActivity(done.id)),
  });
  const running = recordActivity(
    isConsole.value ? `${SourceName} · Exhibitions` : 'Winter collection import',
    'Running',
  );
  const shared = {
    id: `track:${running.id}`,
    group,
    category,
    priority: NoticePriority.High,
    action: action(copy.open, () => showActivity(running.id)),
  };
  void bus.value
    .track(
      async (report) => {
        await wait(3000);
        report(step(2));
        await wait(4000);
      },
      {
        running: {
          ...shared,
          tone: NoticeTone.Info,
          title: copy.running,
          description: running.label,
          compact: { title: `${copy.run} ${running.id}`, description: running.label },
          progress: step(1),
        },
        success: {
          ...shared,
          tone: NoticeTone.Success,
          title: copy.done,
          description: `${running.label} · 3 of 3 ${copy.unit} collected.`,
          compact: { title: `${copy.run} ${running.id} finished`, description: running.label },
        },
        failure: { ...shared, tone: NoticeTone.Warning, title: copy.partial, description: running.label },
      },
    )
    .then(
      () => setActivityState(running.id, 'Completed'),
      () => setActivityState(running.id, 'Partly failed'),
    );
}

/** The first click starts an indeterminate task; its Cancel action or a second click closes it with `bus.dismiss`. */
function playCancel(): void {
  if (cancellable) {
    cancelTask();
    return;
  }
  const item = recordActivity(
    isConsole.value ? `${SourceName} · Full re-harvest` : 'Catalogue export · All products',
    'Running',
  );
  const id = `cancel:${item.id}`;
  cancellable = { id, item: item.id };
  // Transient on purpose: a cancelled task leaves nothing in History.
  bus.value.notify({
    id,
    tone: NoticeTone.Info,
    priority: NoticePriority.High,
    title: isConsole.value ? 'Re-harvest running.' : 'Catalogue export running.',
    description: item.label,
    progress: { label: isConsole.value ? 'Waiting for the source' : 'Preparing files' },
    action: action('Cancel', cancelTask),
  });
  postState();
}

function cancelTask(): void {
  if (!cancellable) return;
  bus.value.dismiss(cancellable.id);
  setActivityState(cancellable.item, 'Cancelled');
  forgetCancellable();
}

function forgetCancellable(): void {
  if (!cancellable) return;
  cancellable = undefined;
  postState();
}

function showUndo(): void {
  const expiresAtMs = Date.now() + 6000;
  const item = recordActivity(isConsole.value ? 'Exhibitions post' : 'Catalogue product', 'Removed');
  const id = `undo:${item.id}`;
  const category = outcomeCategory();
  bus.value.notify({
    id,
    category,
    tone: NoticeTone.Info,
    priority: NoticePriority.Urgent,
    title: isConsole.value ? 'Post removed.' : 'Product removed.',
    description: item.label,
    expiresAtMs,
    action: action('Undo', () => {
      if (Date.now() >= expiresAtMs) return;
      setActivityState(item.id, 'Restored');
      bus.value.notify({
        id,
        category,
        tone: NoticeTone.Success,
        priority: NoticePriority.High,
        title: isConsole.value ? 'Post restored.' : 'Product restored.',
      });
    }),
  });
}

function playBurst(): void {
  clearTimers(burstTimers);
  const steps = [
    isConsole.value ? queueOne : createProduct,
    isConsole.value ? queueBatch : createProduct,
    showLongNotice,
    () =>
      bus.value.notify({
        tone: NoticeTone.Info,
        title: isConsole.value ? 'Source list refreshed.' : 'Catalogue refreshed.',
      }),
    () => bus.value.notify({ tone: NoticeTone.Success, title: 'Changes saved.' }),
    () =>
      bus.value.notify({
        tone: NoticeTone.Info,
        title: isConsole.value ? 'Schedules checked.' : 'Stock counts refreshed.',
        canPin: false,
      }),
    () =>
      bus.value.notify({ tone: NoticeTone.Info, title: isConsole.value ? 'Feed delivery queued.' : 'Export queued.' }),
    () =>
      bus.value.notify({
        tone: NoticeTone.Success,
        title: isConsole.value ? 'Connection checked.' : 'Preview updated.',
      }),
  ];
  steps.forEach((step, index) => schedulePlayback(burstTimers, step, 150 * index));
}

function play(scenario: ToastScenario): void {
  switch (scenario) {
    case 'batch':
      queueBatch();
      break;
    case 'single':
      queueOne();
      break;
    case 'create':
      createProduct();
      break;
    case 'priority':
      playPriorityStack();
      break;
    case 'task':
      playTaskUpdate();
      break;
    case 'track':
      playTrack(false);
      break;
    case 'partial':
      playTrack(true);
      break;
    case 'groupedProgress':
      playGroupedProgress();
      break;
    case 'cancel':
      playCancel();
      break;
    case 'undo':
      showUndo();
      break;
    case 'reminder':
      clearReminder();
      showReminder();
      break;
    case 'long':
      showLongNotice();
      break;
    case 'burst':
      playBurst();
      break;
    case 'clear':
      clearPlayback();
      forgetCancellable();
      toastHost.dismissAll();
      break;
  }
}

function clearReminder(): void {
  if (reminderTimer === undefined) return;
  window.clearTimeout(reminderTimer);
  reminderTimer = undefined;
}

/** Starts a fresh preview scope: empty History and activity. The pause carries over. */
function resetScope(bypass: boolean): void {
  clearReminder();
  clearPlayback();
  if (bypass === settings.pauseBypass) {
    const { pausedUntil } = bus.value.notificationState();
    bus.value.reset();
    bus.value.setToastPause(pausedUntil);
  } else {
    replaceBus(bypass);
  }
  activity.value = [];
  showSource();
  closeHistory();
  forgetCancellable();
}

function receive(event: MessageEvent<ToastPreviewMessage>): void {
  if (event.origin !== location.origin || event.source !== window.parent) return;
  if (event.data?.type === 'toast-preview-settings') {
    const next = event.data.settings;
    if (settings.context !== next.context || settings.pauseBypass !== next.pauseBypass) resetScope(next.pauseBypass);
    if (
      settings.motion !== next.motion ||
      settings.timer !== next.timer ||
      settings.speed !== next.speed ||
      settings.groupMatching !== next.groupMatching
    ) {
      clearPlayback();
      forgetCancellable();
      toastHost.dismissAll();
    }
    if (!next.history) {
      closeHistory();
      bus.value.setToastPause(null);
    }
    Object.assign(settings, next);
  }
  if (event.data?.type === 'toast-preview-play') play(event.data.scenario);
}

/** Reports each non-empty text the host's live regions take, so the lab can log what a screen reader hears. */
function observeAnnouncers(): void {
  if (typeof MutationObserver === 'undefined') return;
  announcerObserver = new MutationObserver((records) => {
    const regions = new Set<HTMLElement>();
    for (const record of records) {
      const target = record.target instanceof Element ? record.target : record.target.parentElement;
      const region = target?.closest<HTMLElement>('[data-toast-announcer]');
      if (region) regions.add(region);
      for (const node of record.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.matches('[data-toast-announcer]')) regions.add(node);
        for (const nested of node.querySelectorAll<HTMLElement>('[data-toast-announcer]')) regions.add(nested);
      }
    }
    for (const region of regions) {
      const text = region.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      if (!text) continue;
      post({
        type: 'toast-preview-announcement',
        text,
        politeness: region.dataset.toastAnnouncer === Politeness.Assertive ? Politeness.Assertive : Politeness.Polite,
        atMs: Date.now(),
      });
    }
  });
  announcerObserver.observe(document.body, { subtree: true, childList: true, characterData: true });
}

watch(
  [isConsole, () => settings.dark],
  ([consoleScene, dark]) => {
    const id = SceneThemes[consoleScene ? 'console' : 'catalogue'];
    const theme = getTheme(id);
    if (!theme) return;
    themeStyle.textContent = themeToCss(theme);
    const root = document.documentElement;
    for (const sceneTheme of Object.values(SceneThemes))
      root.classList.toggle(`theme-${sceneTheme}`, sceneTheme === id);
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
  },
  { immediate: true },
);

onMounted(() => {
  document.head.append(themeStyle);
  observeAnnouncers();
  window.addEventListener('message', receive);
  post({ type: 'toast-preview-ready' });
});

onUnmounted(() => {
  announcerObserver?.disconnect();
  stopPauseStorage();
  bus.value.dispose();
  clearReminder();
  clearPlayback();
  themeStyle.remove();
  window.removeEventListener('message', receive);
});
</script>

<template>
  <div class="toast-preview" @keydown="onKeydown">
    <AppFrame
      variant="glass"
      class="bg-background font-sans text-foreground"
      :crumbs="crumbs"
      :account="account"
      :version="isConsole ? '0.2.2-local' : undefined"
      collapse-storage-key="toast-lab.sidebar"
      content-class="pt-4 pb-8"
    >
      <template #brand="{ isRail }">
        <a
          href="#posts"
          :aria-label="`${app} home`"
          class="flex shrink-0 items-center gap-2"
          @click.prevent="showSource()"
        >
          <span aria-hidden="true" class="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <RadioTower v-if="isConsole" :size="16" />
            <Package v-else :size="16" />
          </span>
          <span v-if="!isRail" class="text-base font-semibold tracking-tight">{{ app }}</span>
        </a>
      </template>

      <template #nav="{ isRail }">
        <SidebarMenu :aria-label="app" :is-collapsed="isRail" class="min-h-0 flex-1 overflow-y-auto">
          <SidebarMenuSection label="Overview">
            <SidebarMenuItem href="#overview" @click.prevent="showSource('overview')">
              <template #icon><House :size="17" /></template>
              Home
            </SidebarMenuItem>
          </SidebarMenuSection>
          <SidebarMenuSection :label="isConsole ? 'Collect' : 'Workspace'">
            <SidebarMenuItem href="#posts" :is-active="!isConsole && page === 'source'" @click.prevent="showSource()">
              <template #icon><Globe2 v-if="isConsole" :size="17" /><Grid2X2 v-else :size="17" /></template>
              {{ section }}
              <template v-if="isConsole" #trailing><span class="text-xs text-muted-foreground">1</span></template>
            </SidebarMenuItem>
            <template v-if="isConsole">
              <SidebarMenuItem
                href="#overview"
                :class="isRail ? '' : 'ms-3 h-8 w-auto text-xs'"
                @click.prevent="showSource('overview')"
              >
                <template #icon><ListFilter :size="15" /></template>
                {{ SourceName }}
              </SidebarMenuItem>
              <SidebarMenuItem
                href="#posts"
                :is-active="page === 'source'"
                :class="isRail ? '' : 'ms-6 h-8 w-auto text-xs'"
                @click.prevent="showSource()"
              >
                <template #icon><Globe2 :size="15" class="rounded bg-pink-600 p-0.5 text-white" /></template>
                {{ SourceHost }}
              </SidebarMenuItem>
            </template>
            <SidebarMenuItem v-else href="#products" :is-active="page === 'activity'" @click.prevent="showActivity()">
              <template #icon><LayoutList :size="17" /></template>
              Products
            </SidebarMenuItem>
          </SidebarMenuSection>
          <SidebarMenuSection v-if="isConsole" label="Deliver">
            <SidebarMenuItem href="#subscribers" @click.prevent="showSource('subscribers')">
              <template #icon><Users :size="17" /></template>
              Subscribers
            </SidebarMenuItem>
          </SidebarMenuSection>
          <SidebarMenuSection v-if="isConsole" label="System">
            <SidebarMenuItem href="#access" @click.prevent="showSource('access')">
              <template #icon><ShieldCheck :size="17" /></template>
              Access
            </SidebarMenuItem>
          </SidebarMenuSection>
        </SidebarMenu>
      </template>

      <template #bar-end>
        <ToggleGroup
          v-if="isConsole && activeTab === 'posts'"
          variant="segmented"
          aria-label="View"
          :model-value="galleryView"
          class="shrink-0"
          @update:model-value="
            galleryView = $event === ConsolePostsView.Rows ? ConsolePostsView.Rows : ConsolePostsView.Cards
          "
        >
          <ToggleInput value="cards" size="sm" aria-label="Cards">
            <Grid2X2 :size="15" aria-hidden="true" /><span class="ml-1 max-md:sr-only">Cards</span>
          </ToggleInput>
          <ToggleInput value="rows" size="sm" aria-label="Rows">
            <LayoutList :size="15" aria-hidden="true" /><span class="ml-1 max-md:sr-only">Rows</span>
          </ToggleInput>
        </ToggleGroup>
        <NotificationCenterButton
          v-if="settings.history"
          ref="historyToggle"
          :bus="bus"
          :is-expanded="isHistoryOpen"
          aria-controls="toast-preview-history"
          label="History"
          @toggle="toggleHistory"
        />
      </template>

      <template #phone-nav>
        <nav :class="BottomNavClasses" aria-label="Preview navigation">
          <Button variant="ghost" :aria-current="page === 'source' ? 'page' : undefined" @click="showSource()">
            {{ section }}
          </Button>
          <Button variant="ghost" :aria-current="page === 'activity' ? 'page' : undefined" @click="showActivity()">
            {{ track }}
          </Button>
        </nav>
      </template>

      <div v-if="isConsole" class="min-w-0 space-y-4">
        <Card
          variant="surface"
          radius="2xl"
          :elevation="0"
          padding="xl"
          class="@container max-sm:p-4"
          aria-label="Source"
          role="region"
        >
          <div class="grid min-w-0 items-start gap-4 @min-[42rem]:grid-cols-[minmax(0,1fr)_auto]">
            <div class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3">
              <div aria-hidden="true" class="grid size-14 place-items-center rounded-xl bg-primary-soft">
                <div class="grid size-7 place-items-center rounded-md bg-pink-600 text-white">
                  <Globe2 :size="17" />
                </div>
              </div>
              <h1 class="flex min-w-0 flex-wrap items-center gap-2.5 text-2xl font-semibold tracking-tight">
                {{ SourceHost }}
                <Badge variant="info" is-outlined>harvesting</Badge>
              </h1>
              <div class="col-span-full flex min-w-0 flex-wrap gap-2 @min-[36rem]:col-start-2">
                <Badge variant="outline" size="lg"
                  ><template #leading><ListFilter /></template>{{ SourceName }}</Badge
                >
                <Badge variant="info" size="lg" is-outlined>
                  <template #leading><History /></template
                  >{{ queuedHarvestCount ? 'Harvest queued' : 'Last harvest 12 min ago' }}
                </Badge>
                <Badge variant="outline" size="lg"
                  ><template #leading><Clock3 /></template>Next harvest in 1 hour 19 min</Badge
                >
              </div>
            </div>
            <div class="flex flex-wrap gap-2" role="group" aria-label="Source actions">
              <Button variant="outline" size="sm" @click="showSource('settings')">Source settings</Button>
              <Button size="sm" @click="queueBatch">Harvest now</Button>
            </div>
          </div>
        </Card>

        <TabsGroup
          :model-value="activeTab"
          activation-mode="manual"
          class="gap-4"
          @update:model-value="chooseSourceTab"
        >
          <TabsGroupList aria-label="Source sections" class="flex w-full overflow-x-auto">
            <TabsGroupTab value="overview" class="shrink-0">Overview</TabsGroupTab>
            <TabsGroupTab value="posts" class="shrink-0"
              >Posts <span class="text-xs text-muted-foreground">78</span></TabsGroupTab
            >
            <TabsGroupTab value="activity" class="shrink-0"
              >Activity <span class="text-xs text-muted-foreground">{{ 38 + queuedHarvestCount }}</span></TabsGroupTab
            >
            <TabsGroupTab value="settings" class="shrink-0">Settings</TabsGroupTab>
          </TabsGroupList>
          <TabsGroupPanel value="posts"><ConsolePostsPreview :view="galleryView" /></TabsGroupPanel>
          <TabsGroupPanel value="overview">
            <Card radius="xl" :elevation="0" padding="lg" class="space-y-3">
              <h2 class="text-sm font-medium">Harvesting sections</h2>
              <ul class="divide-y divide-border text-sm">
                <li
                  v-for="name in ['Fashion', 'Exhibitions']"
                  :key="name"
                  class="flex items-center justify-between gap-3 py-2"
                >
                  {{ name }} <Badge variant="info">Harvesting</Badge>
                </li>
              </ul>
            </Card>
          </TabsGroupPanel>
          <TabsGroupPanel value="settings">
            <Card radius="xl" :elevation="0" padding="lg">
              <p class="text-sm text-muted-foreground">Sections are harvested hourly.</p>
            </Card>
          </TabsGroupPanel>
        </TabsGroup>
        <Card
          v-if="activeTab === 'subscribers' || activeTab === 'access'"
          radius="xl"
          :elevation="0"
          padding="lg"
          class="space-y-2"
        >
          <h2 class="text-base font-semibold">{{ activeTab === 'subscribers' ? 'Subscribers' : 'Access' }}</h2>
          <Badge variant="outline">{{ activeTab === 'subscribers' ? SourceName : 'Test operator' }}</Badge>
        </Card>
      </div>

      <div v-else-if="page === 'source'" class="space-y-4">
        <Card radius="2xl" :elevation="0" padding="lg" class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="mb-1 text-xs text-muted-foreground">Catalogue</p>
            <h1 class="text-2xl font-semibold tracking-tight">Products</h1>
          </div>
          <Button size="sm" @click="createProduct">Create product</Button>
        </Card>
        <Card radius="xl" :elevation="0" class="overflow-hidden">
          <div class="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 class="text-sm font-medium">Product drafts</h2>
            <Button size="xs" variant="ghost" @click="showActivity()">View products</Button>
          </div>
          <ul class="divide-y divide-border text-sm">
            <li
              v-for="name in ['Atlas silk shawl', 'Embroidered tote']"
              :key="name"
              class="flex items-center justify-between gap-3 px-4 py-3"
            >
              {{ name }} <Badge variant="outline">Draft</Badge>
            </li>
          </ul>
        </Card>
      </div>

      <Card v-if="page === 'activity'" radius="xl" :elevation="0" padding="lg" class="mt-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 ref="activityHeading" tabindex="-1" class="text-xl font-semibold">{{ track }}</h2>
          <Button size="xs" variant="ghost" @click="showSource()">Back to {{ section.toLowerCase() }}</Button>
        </div>
        <EmptyState v-if="!activity.length" title="No activity in this preview yet" />
        <ul v-else class="divide-y divide-border rounded-md border border-border">
          <li
            v-for="item in activity"
            :key="item.id"
            class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
            :class="{ 'bg-muted font-medium': item.id === selectedActivity }"
          >
            <span>{{ item.label }}</span>
            <Badge variant="outline">{{ item.state }}</Badge>
          </li>
        </ul>
      </Card>
    </AppFrame>

    <section
      v-if="settings.history"
      v-show="isHistoryOpen"
      id="toast-preview-history"
      aria-label="Notification history"
      :class="HistoryPanelClasses"
    >
      <NotificationCenterGroup
        ref="historyPanel"
        :bus="bus"
        can-pause
        title="Notification history"
        class="w-full max-h-[min(24rem,70svh)]"
        @close="closeHistory(true)"
      />
    </section>

    <FeedbackToastHost
      :bus="bus"
      v-bind="toastOptions"
      :class="[
        'toast-preview-viewport',
        { 'toast-preview-slow': settings.speed === 0.25, 'toast-preview-timer-top': settings.timer === 'top' },
      ]"
    />
  </div>
</template>
