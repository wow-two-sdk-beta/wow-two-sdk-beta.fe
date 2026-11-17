import type { ToastGroupLatest } from './ToastGroupLatest';

/** Represents the live notices a single toast stands for. */
export interface ToastGroup {
  /** The number of live notices in the group. */
  readonly count: number;

  /** The newest notice, previewed while the group merges. */
  readonly latest: ToastGroupLatest;
}
