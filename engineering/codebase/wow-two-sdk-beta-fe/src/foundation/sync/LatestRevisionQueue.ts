export type RevisionQueueStatus = 'saving' | 'synced' | 'offline' | 'conflict';

export interface RevisionedSnapshot {
  revision: number;
}

export interface LatestRevisionQueueOptions<T extends RevisionedSnapshot> {
  initialRevision: number;
  write(snapshot: T, signal: AbortSignal): Promise<T>;
  onStatus(status: RevisionQueueStatus, detail?: { error?: Error; revision?: number; acknowledged?: T }): void;
  isConflict?(error: unknown): boolean;
  timeoutMs?: number;
}

/** Serializes revisioned writes and collapses queued work to the latest snapshot. */
export class LatestRevisionQueue<T extends RevisionedSnapshot> {
  #desired: T | undefined;
  #revision: number;
  #running = false;
  #failed = false;
  #stopped = false;
  #abort = new AbortController();

  constructor(private readonly options: LatestRevisionQueueOptions<T>) {
    this.#revision = options.initialRevision;
  }

  push(snapshot: T): void {
    this.#desired = snapshot;
    if (!this.#failed) void this.#drain();
  }

  retry(): void {
    this.#failed = false;
    void this.#drain();
  }

  stop(): void {
    this.#stopped = true;
    this.#abort.abort();
  }

  async #drain(): Promise<void> {
    if (this.#running || this.#stopped || !this.#desired) return;
    this.#running = true;
    this.options.onStatus('saving');
    let acknowledged: T | undefined;
    try {
      while (this.#desired && !this.#stopped) {
        const next: T = this.#desired;
        const timeout = AbortSignal.timeout(this.options.timeoutMs ?? 15_000);
        const result = await this.options.write(
          { ...next, revision: this.#revision },
          AbortSignal.any([this.#abort.signal, timeout]),
        );
        if (this.#stopped) return;
        this.#revision = result.revision;
        acknowledged = next;
        if (this.#desired === next) this.#desired = undefined;
      }
      if (!this.#stopped) this.options.onStatus('synced', { revision: this.#revision, acknowledged });
    } catch (cause) {
      if (!this.#stopped) {
        this.#failed = true;
        const error = cause instanceof Error ? cause : new Error(String(cause));
        this.options.onStatus(this.options.isConflict?.(cause) ? 'conflict' : 'offline', { error });
      }
    } finally {
      this.#running = false;
    }
  }
}
