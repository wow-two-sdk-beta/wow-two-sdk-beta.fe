import { NoticePriority } from '@wow-two-beta/fe/feedback';
import type { Politeness } from '@wow-two-beta/fe/foundation/primitives';
import { OverlayPosition } from '@wow-two-beta/fe/foundation/styles';
import { ToastGroupMotion, ToastMotion, ToastSurface, ToastTimer } from '@wow-two-beta/fe/presentation/feedback';

/** The entry and exit motions the lab offers, each with its label and timing detail. */
export const ToastMotions = {
  [ToastMotion.SideSlide]: { label: 'Side slide', detail: 'Horizontal · 8 px · 200 ms in' },
  [ToastMotion.ShortSlide]: { label: 'Short slide', detail: 'Toward edge · 12 px · 200 ms in' },
  [ToastMotion.EdgeSlide]: { label: 'Edge slide', detail: 'Toward edge · full card · 260 ms in' },
  [ToastMotion.SlideAndSettle]: { label: 'Slide and settle', detail: 'Toward edge · 24 px + scale · 240 ms in' },
} as const satisfies Record<ToastMotion, { label: string; detail: string }>;

/** The labels of the group arrival motions. */
export const ToastGroupMotions = {
  [ToastGroupMotion.Card]: 'Full card merge',
  [ToastGroupMotion.Highlight]: 'Count highlight',
} as const satisfies Record<ToastGroupMotion, string>;

/** The labels of the stack placements the lab offers. */
export const ToastPlacements = {
  [OverlayPosition.TopRight]: 'Top right',
  [OverlayPosition.TopLeft]: 'Top left',
  [OverlayPosition.BottomRight]: 'Bottom right',
  [OverlayPosition.BottomLeft]: 'Bottom left',
} as const;

/** The labels of the card surfaces. */
export const ToastSurfaces = {
  [ToastSurface.Glass]: 'Glass',
  [ToastSurface.Solid]: 'Solid',
} as const satisfies Record<ToastSurface, string>;

/** The display lifetime per priority the preview host runs with (ms). */
export const PriorityDurations = {
  [NoticePriority.Low]: 4000,
  [NoticePriority.Normal]: 8000,
  [NoticePriority.High]: 10000,
} as const satisfies Partial<Record<NoticePriority, number>>;

/** The frame sizes the preview scales between (px). */
export const PreviewWidths = {
  desktop: { label: 'Desktop', width: 1440, height: 624 },
  tablet: { label: 'Tablet', width: 768, height: 550 },
  phone: { label: 'Phone', width: 390, height: 548 },
} as const;

/** The countdown displays the lab offers, each with its label and `ToastTimer` value. */
export const ToastTimerChoices = {
  close: { label: 'Ring around Close', timer: ToastTimer.CloseRing },
  bar: { label: 'Bottom bar', timer: ToastTimer.Bar },
  top: { label: 'Top bar', timer: ToastTimer.Bar },
  ring: { label: 'Ring beside Close', timer: ToastTimer.Ring },
  seconds: { label: 'Seconds', timer: ToastTimer.Seconds },
  none: { label: 'Hidden', timer: ToastTimer.None },
} as const;

/** The sample app shown in the preview frame. Both are fixtures with no real sources or links. */
export const ToastLabContexts = {
  console: 'Console',
  catalogue: 'Catalogue',
} as const;

export type ToastLabContext = keyof typeof ToastLabContexts;

export interface ToastLabSettings {
  context: ToastLabContext;
  motion: ToastMotion;
  groupMotion: ToastGroupMotion;
  placement: keyof typeof ToastPlacements;
  timer: keyof typeof ToastTimerChoices;
  surface: ToastSurface;
  speed: 1 | 0.25;
  history: boolean;
  keepConfirmations: boolean;
  groupMatching: boolean;
  /** Recreates the preview's bus with `pauseBypass: NoticePriority.Urgent`. */
  pauseBypass: boolean;
  /** Passes `hotkey: false` to the host when off. */
  hotkey: boolean;
  dark: boolean;
}

/** The settings the lab starts from. */
export const DefaultToastLabSettings: Readonly<ToastLabSettings> = {
  context: 'console',
  motion: ToastMotion.ShortSlide,
  groupMotion: ToastGroupMotion.Card,
  placement: OverlayPosition.TopRight,
  timer: 'close',
  surface: ToastSurface.Glass,
  speed: 1,
  history: true,
  keepConfirmations: true,
  groupMatching: true,
  pauseBypass: false,
  hotkey: true,
  dark: true,
};

/** The labels of the replayable scenarios. */
export const ToastScenarios = {
  batch: 'Queue batch',
  single: 'Queue one',
  create: 'Create product',
  priority: 'Priority stack',
  task: 'Task update',
  track: 'Track progress',
  partial: 'Partial failure',
  groupedProgress: 'Grouped progress',
  cancel: 'Cancel task',
  undo: 'Urgent Undo',
  reminder: 'Reminder',
  long: 'Long message',
  burst: 'Burst',
  clear: 'Clear toasts',
} as const;

export type ToastScenario = keyof typeof ToastScenarios;

/** The scenarios each context offers, in button order. Every other scenario plays in both contexts. */
export const ContextScenarios: Readonly<Record<ToastLabContext, ReadonlyArray<ToastScenario>>> = {
  console: ['batch', 'single'],
  catalogue: ['create'],
};

/** The scenarios that play in every context. */
export const SharedScenarios: ReadonlyArray<ToastScenario> = [
  'priority',
  'task',
  'track',
  'partial',
  'groupedProgress',
  'cancel',
  'undo',
  'reminder',
  'long',
  'burst',
];

export interface ToastLabFeature {
  readonly label: string;
  /** The replay that shows it; settings-only features have none. */
  readonly scenario?: ToastScenario;
}

/** What the SDK ships today, each with the replay that shows it best. */
export const ImplementedFeatures: ReadonlyArray<ToastLabFeature> = [
  { label: 'Placement and motion', scenario: 'priority' },
  { label: 'Responsive stack and overflow', scenario: 'burst' },
  { label: 'Ring countdown, paused on hover or focus', scenario: 'priority' },
  { label: 'Priority and deadlines', scenario: 'undo' },
  { label: 'Pin', scenario: 'priority' },
  { label: 'Details', scenario: 'long' },
  { label: 'Compact rows', scenario: 'burst' },
  { label: 'Grouping with card merge or count highlight', scenario: 'groupedProgress' },
  { label: 'Update highlight', scenario: 'task' },
  { label: 'Remind later', scenario: 'reminder' },
  { label: 'Pause pop-ups with an unread bell' },
  { label: 'History actions with deadlines', scenario: 'undo' },
  { label: 'History timestamps and unread marks' },
  { label: 'Mark all read and Clear all' },
  { label: 'Publisher dismiss', scenario: 'cancel' },
  { label: 'Pause bypass for urgent notices', scenario: 'undo' },
  { label: 'Running progress and track', scenario: 'track' },
  { label: 'Glass surface' },
  { label: 'Swipe to dismiss' },
  { label: 'F8 hotkey' },
  { label: 'Screen-reader announcements', scenario: 'priority' },
];

/** The notification items still open in the SDK backlog. */
export const UpcomingFeatures: ReadonlyArray<string> = [
  'Group History entries by key',
  'Persist History through storage',
  'Sync pause and read state across tabs',
  'Bridge urgent notices to OS notifications in hidden tabs',
  'Coalesce repeated identical notices',
  'Host the lab on the platform',
  'Release and product upgrades',
];

export interface ToastAnnouncement {
  readonly text: string;
  readonly politeness: Politeness;
  readonly atMs: number;
}

/** Messages the lab sends into the preview frame. */
export type ToastPreviewMessage =
  | { type: 'toast-preview-settings'; settings: ToastLabSettings }
  | { type: 'toast-preview-play'; scenario: ToastScenario };

/** Messages the preview frame sends back to the lab. */
export type ToastPreviewEvent =
  | { type: 'toast-preview-ready' }
  | { type: 'toast-preview-state'; cancellable: boolean }
  | ({ type: 'toast-preview-announcement' } & ToastAnnouncement);
