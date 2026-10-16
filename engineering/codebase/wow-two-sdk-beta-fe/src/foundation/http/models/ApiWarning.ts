/** Represents an advisory finding a successful write returns beside its data, such as an insecure destination. */
export interface ApiWarning {
  /** The field path the finding concerns, such as `rules[0].content.url`. */
  readonly property: string;
  /** The display-safe message. */
  readonly message: string;
  /** The stable finding code. */
  readonly code: string;
  /** The server's severity word; `warning` when absent. */
  readonly severity: string;
}

/** Represents a decoded success together with the advisory warnings its envelope carried. */
export interface ApiWarned<T> {
  /** The decoded data. */
  readonly data: T;
  /** The advisory findings; empty when the envelope carried none. */
  readonly warnings: ReadonlyArray<ApiWarning>;
}
