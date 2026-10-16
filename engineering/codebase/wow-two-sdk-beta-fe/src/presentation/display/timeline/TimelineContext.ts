import { inject, type InjectionKey } from 'vue';

/** Defines the semantic status tone of a Timeline node. */
export const TimelineStatus = {
  /** Refers to the neutral / default node. */
  Default: 'default',
  /** Refers to the primary brand node. */
  Primary: 'primary',
  /** Refers to the positive / confirmation node. */
  Success: 'success',
  /** Refers to the caution node. */
  Warning: 'warning',
  /** Refers to the destructive / error node. */
  Destructive: 'destructive',
  /** Refers to the informational node. */
  Info: 'info',
} as const;

export type TimelineStatus = (typeof TimelineStatus)[keyof typeof TimelineStatus];

/** Defines which side the Timeline rail sits on. */
export const TimelineAlign = {
  /** Refers to a left-anchored rail. */
  Left: 'left',
  /** Refers to a right-anchored rail. */
  Right: 'right',
} as const;

export type TimelineAlign = (typeof TimelineAlign)[keyof typeof TimelineAlign];

/** The rail state a `Timeline` root shares with its items. */
export interface TimelineContextValue {
  /** The rail side. Live getter — read it, don't destructure it. */
  readonly align: TimelineAlign;

  /** The number of rendered items. Live getter. */
  readonly total: number;
}

export const TimelineKey: InjectionKey<TimelineContextValue> = Symbol('wow-two.timeline');

/**
 * Reads the enclosing `Timeline`, or `null` when an item renders standalone —
 * React's `createContext(null)` default, preserved so a stray `<TimelineItem>`
 * still renders left-aligned rather than throwing.
 */
export function useTimelineContext(): TimelineContextValue | null {
  return inject(TimelineKey, null);
}

export const StatusBackground: Record<TimelineStatus, string> = {
  default: 'bg-muted text-muted-foreground border-border',
  primary: 'bg-primary text-primary-foreground border-primary',
  success: 'bg-success text-success-foreground border-success',
  warning: 'bg-warning text-warning-foreground border-warning',
  destructive: 'bg-destructive text-destructive-foreground border-destructive',
  info: 'bg-info text-info-foreground border-info',
};
