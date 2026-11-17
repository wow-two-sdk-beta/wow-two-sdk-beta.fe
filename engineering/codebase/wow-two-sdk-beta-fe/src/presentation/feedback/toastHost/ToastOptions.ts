import type { NoticeCompactCopy, NoticePriority, NoticeProgress } from '../../../feedback';
import type { ReportSend } from '../../../reporting';
import type { ToastSurface } from '../toast/ToastSurface';
import type { ToastGroup } from './ToastGroup';
import type { ToastTimer } from './ToastHost.vue';
import type { ToastNode } from './ToastNode';
import type { ToastSeverity } from './ToastSeverity';

/** Defines the content and behaviour of one toast. */
export interface ToastOptions {
  /** The heading line. */
  title?: ToastNode;

  /** The body text below the title. */
  description?: ToastNode;

  /** The short copy shown in the expanded overflow list. */
  compact?: NoticeCompactCopy;

  /** The leading icon. */
  icon?: ToastNode;

  /** The severity palette. */
  severity?: ToastSeverity;

  /** Orders the toast and selects its default lifetime. */
  priority?: NoticePriority;

  /**
   * ms before auto-dismiss. Defaults to the host's priority duration, severity duration, or
   * `defaultDuration`. `Infinity` = sticky.
   */
  duration?: number;

  /** An absolute, unpausable deadline in epoch milliseconds. Overrides the display duration. */
  expiresAtMs?: number;

  /** Overrides the host's pin default for this toast. Sticky and custom-content toasts have no SDK pin. */
  canPin?: boolean;

  /** The action shown under the copy. */
  action?: ToastNode;

  /** Optional content shown under the toast's summary and actions. */
  details?: ToastNode;

  /** @internal The presentation state the feedback adapter supplies for a group of live notices. */
  group?: ToastGroup;

  /** Keeps this toast visible while its async action is pending. The getter may read reactive state. */
  pauseExpiry?: () => boolean;

  /**
   * Sends a one-click report of the failure this toast shows; the toast renders a Report action that walks
   * sending → reported (with the reference) → retry on failure. Pairs with `/reporting`'s `capture(error).send`.
   */
  report?: ReportSend;

  /** Shows the severity's own glyph when no `icon` is given. Default: the ToastHost's `showSeverityIcon`. */
  showSeverityIcon?: boolean;

  /**
   * Fully custom body — replaces the default `Toast` chrome (icon/title/description/close).
   * Still animates + auto-dismisses; the content owns its close via the returned id.
   */
  content?: ToastNode;

  /**
   * Fires when the toast is removed — auto-dismiss, close button, `dismiss(id)`, or `dismissAll()`.
   * Not fired on a dedup-update.
   */
  onDismiss?: () => void;

  /** Fires when the reader deletes an explicitly retained notification; omitted for transient toasts. */
  onDelete?: () => void;

  /**
   * Dedup key — a `toast` whose `key` is already showing updates that toast in place,
   * refreshing its timer instead of stacking a duplicate.
   */
  key?: string;

  /** How this toast shows its time left. Default: the ToastHost's `timer`. */
  timer?: ToastTimer;

  /**
   * A running operation's progress. While set, the toast stays up with no countdown or Pin. An update with
   * `progress: undefined` completes it, and the toast starts its full countdown.
   */
  progress?: NoticeProgress;

  /** The card material for this toast. Default: the ToastHost's `surface`. */
  surface?: ToastSurface;
}
