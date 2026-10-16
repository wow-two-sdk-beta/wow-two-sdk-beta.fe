import type { AppErrorType } from '../AppErrorType';

/** Represents a transport-independent, display-safe failure. */
export interface AppError {
  /** The failure category. */
  readonly type: AppErrorType;
  /** The safe fallback message; localize at the presentation boundary. */
  readonly message: string;
  /** The optional diagnostic context; never render it without validation. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}
