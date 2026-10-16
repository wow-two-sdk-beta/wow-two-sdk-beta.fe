// The test double — a sink that ships nowhere and remembers everything.
//
// `records` surfaces through a getter typed `readonly`, so a test reads the live capture without being able
// to push into it, and the array identity stays stable across a `reset` (mirrors `memoryAnalyticsProvider`).
// Records are stored by reference, not copied: they are already frozen in shape and fully `readonly`, and a
// copy would defeat the assertion that every sink in a fan-out received the SAME object.

import type { LogRecord } from './LogRecord';
import type { LogSink } from './LogSink';

/** Defines the in-memory sink returned by {@link memoryLogSink} — a sink plus the capture it records. */
export interface MemoryLogSink extends LogSink {
  /** Every record written, in emit order. */
  readonly records: ReadonlyArray<LogRecord>;

  /** Clears the capture — for a `beforeEach` reset of a shared instance. */
  reset(): void;
}

/** Creates an in-memory sink capturing every record — the test double for asserting what an app logs. */
export function memoryLogSink(): MemoryLogSink {
  const records: LogRecord[] = [];

  return {
    name: 'memory',

    get records() {
      return records;
    },

    write: (record) => {
      records.push(record);
    },

    reset: () => {
      records.length = 0;
    },
  };
}
