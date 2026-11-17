import type { ToastSeverity } from './ToastSeverity';

/** Represents the newest notice of a toast's group, as a plain-text preview. */
export interface ToastGroupLatest {
  /** The newest notice's title, when it is plain text. */
  readonly title?: string;

  /** The newest notice's description, when it is plain text. */
  readonly description?: string;

  /** The newest notice's severity. */
  readonly severity?: ToastSeverity;
}
