import { createSyncChannel, type SyncChannel, type SyncChannelOptions } from '../foundation/channels';
import { AppErrorFactory, ResultExtensions, type AppError, type Result } from '../foundation/results';
import { AuthStatus, type AuthSession, type AuthStrategyHost } from './AuthSession';
import { BffSessionExtensions, type BffUser } from './BffSession';

/** Names what one tab tells the others. The message is a hint to re-read the session, never a credential. */
export const BffSyncKind = {
  SignedIn: 'signed-in',
  SignedOut: 'signed-out',
} as const;
export type BffSyncKind = (typeof BffSyncKind)[keyof typeof BffSyncKind];

/** Defines the cross-tab message. A peer is another copy of the page: receivers re-read the server, not the message. */
export interface BffSyncMessage {
  readonly kind: BffSyncKind;
}

/** Defines the cross-tab sync options; the channel is `BroadcastChannel`, falling back to the `storage` event. */
export interface BffSyncOptions extends SyncChannelOptions {
  /** The channel name shared by this app's tabs. Default `wow-two.auth.bff`. */
  readonly channelName?: string;

  /** Opens this tab's endpoint. Default `createSyncChannel(channelName, options)`; tests inject a hub channel. */
  readonly open?: (name: string) => SyncChannel<BffSyncMessage>;
}

/** Defines when a signed-in session is re-read without the person doing anything. */
export interface BffRefreshOptions {
  /** How long before `expiresAt` the pre-expiry refresh runs. Default 60 s. */
  readonly leadMs?: number;

  /** The least time between two timer-driven refreshes — the floor under any schedule. Default 15 s. */
  readonly minIntervalMs?: number;

  /** How old the last read must be before a focus or visibility change re-reads it. Default 30 s. */
  readonly staleAfterMs?: number;

  /** The first retry delay after a failed refresh; it doubles up to 5 min. Default 30 s. */
  readonly retryMs?: number;

  /** Consecutive failed refreshes after which the timer stops until the next focus or peer hint. Default 5. */
  readonly maxRetries?: number;
}

const DefaultChannelName = 'wow-two.auth.bff';
const RefreshDefaults = { leadMs: 60_000, minIntervalMs: 15_000, staleAfterMs: 30_000, retryMs: 30_000, maxRetries: 5 };
const MaxRetryDelayMs = 300_000;
/** The longest `setTimeout` delay browsers honour (a 32-bit signed millisecond count). */
const MaxTimerMs = 2_147_483_647;

/** Defines the options of {@link connectBffSession}. */
export interface BffSessionLinkOptions {
  readonly sync: BffSyncOptions | false;
  readonly refresh: BffRefreshOptions | false;
  readonly now: () => number;
}

/** Defines the live connection of one strategy to its provider. */
export interface BffSessionLink {
  /** Tells the other tabs the session ended. Silent while this tab applies a peer's hint, so tabs never echo. */
  readonly announce: (kind: BffSyncKind) => void;
  readonly dispose: () => void;
}

/** `lead`: the refresh before `expiresAt`; `expiry`: the one check at it. A stage never repeats for one `expiresAt`. */
type Stage = 'lead' | 'expiry';

const isHint = (message: unknown): message is BffSyncMessage =>
  typeof message === 'object' &&
  message !== null &&
  ((message as BffSyncMessage).kind === BffSyncKind.SignedIn ||
    (message as BffSyncMessage).kind === BffSyncKind.SignedOut);

/**
 * Connects a BFF strategy to its provider for the life of a mounted app:
 *
 * - Tab sync: a sign-in here tells the other tabs, a sign-out or expiry here tells them, and a tab that hears a hint
 *   re-reads `GET /auth/session`. The hint carries no identity, and a tab applying one never announces, so two tabs
 *   cannot ping-pong.
 * - Refresh: one timer per `expiresAt` fires at most twice (`lead`, then `expiry`) and never again for the same
 *   value, so a server that does not extend its session cannot make it loop; a new `expiresAt` earns a new pair, and
 *   `minIntervalMs` floors the pace. A failed refresh retries with doubling delay and stops after `maxRetries`.
 * - Wake: a focus or visibility change re-reads a session older than `staleAfterMs`, signed in or out.
 */
export function connectBffSession(host: AuthStrategyHost<BffUser>, options: BffSessionLinkOptions): BffSessionLink {
  const refresh = options.refresh === false ? null : { ...RefreshDefaults, ...options.refresh };
  const now = options.now;
  const disposers: Array<() => void> = [];

  let closed = false;
  // `undefined` before the first settled snapshot, `null` while signed out, else the signed-in identity key.
  let lastKey: string | null | undefined;
  let peerDepth = 0;
  let lastLoadedAt = Number.NEGATIVE_INFINITY;
  let lastFireAt = Number.NEGATIVE_INFINITY;
  let fired: { readonly expiresAt: string | null; readonly stage: Stage } | null = null;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const sync = options.sync === false ? null : options.sync;
  let channel: SyncChannel<BffSyncMessage> | null = null;
  if (sync) {
    const name = sync.channelName ?? DefaultChannelName;
    channel = sync.open ? sync.open(name) : createSyncChannel<BffSyncMessage>(name, sync);
  }

  let pending: Promise<Result<BffUser | null, AppError>> | null = null;
  /**
   * Re-reads the session; callers that arrive mid-read share it. A throwing strategy counts as a failure, so a timer
   * never leaks an unhandled rejection.
   */
  function revalidate(): Promise<Result<BffUser | null, AppError>> {
    if (pending) return pending;
    const read = (async (): Promise<Result<BffUser | null, AppError>> => {
      try {
        const outcome = await host.revalidate();
        if (outcome.ok) lastLoadedAt = now();
        return outcome;
      } catch {
        return ResultExtensions.fail(AppErrorFactory.unexpected());
      }
    })().finally(() => {
      if (pending === read) pending = null;
    });
    pending = read;
    return read;
  }

  function clearTimer(): void {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  }

  /** Arms the timer for `stage` at `target`, never sooner than `minIntervalMs` after the previous fire. */
  function arm(stage: Stage, target: number): void {
    clearTimer();
    if (!refresh || closed) return;
    const due = Math.max(target, lastFireAt + refresh.minIntervalMs);
    const wake = (): void => {
      timer = undefined;
      if (closed) return;
      // A clamped or early timer fires before `due`: wait out the rest instead of firing early.
      if (now() < due) timer = setTimeout(wake, Math.min(Math.max(due - now(), 1), MaxTimerMs));
      else void fire(stage);
    };
    timer = setTimeout(wake, Math.min(Math.max(due - now(), 0), MaxTimerMs));
  }

  /** Schedules the next stage for the current session, or nothing when it has no end or both stages ran. */
  function schedule(session: AuthSession<BffUser>): void {
    clearTimer();
    if (!refresh || closed || session.status !== AuthStatus.Authenticated || session.user === null) return;
    const expiresAt = BffSessionExtensions.expiresAtMs(session.user);
    if (expiresAt === null) return;
    const done = fired?.expiresAt === session.user.expiresAt ? fired.stage : null;
    if (done === 'expiry') return;
    if (done === 'lead') arm('expiry', expiresAt);
    else arm('lead', expiresAt - refresh.leadMs);
  }

  async function fire(stage: Stage): Promise<void> {
    const session = host.getSession();
    if (session.status !== AuthStatus.Authenticated || session.user === null) return;
    const before = fired;
    // Recorded before the read: the read republishes the session, and the republish must see this stage as done.
    fired = { expiresAt: session.user.expiresAt, stage };
    lastFireAt = now();
    const outcome = await revalidate();
    if (closed) return;
    if (outcome.ok) {
      failures = 0;
      return;
    }
    // A cancelled read was superseded by a sign-in, sign-out or newer read, which reschedules on its own.
    if (outcome.failure.type === 'cancelled') return;
    fired = before;
    failures += 1;
    if (!refresh || failures > refresh.maxRetries) return;
    arm(stage, now() + Math.min(refresh.retryMs * 2 ** (failures - 1), MaxRetryDelayMs));
  }

  function onSession(session: AuthSession<BffUser>): void {
    if (closed) return;
    if (session.status !== AuthStatus.Authenticated && session.status !== AuthStatus.Anonymous) return;
    lastLoadedAt = now();
    const key =
      session.status === AuthStatus.Authenticated && session.user !== null
        ? BffSessionExtensions.identity(session.user)
        : null;
    const previous = lastKey;
    lastKey = key;
    // A signed-out change is announced by the strategy once the server has processed it; announcing here would race it.
    if (key !== null && key !== previous && peerDepth === 0) channel?.post({ kind: BffSyncKind.SignedIn });
    schedule(session);
  }

  /** Re-reads when the last read is stale. Both a focus and a visibility event arrive; the second finds it fresh. */
  function wake(): void {
    if (closed || !refresh) return;
    const session = host.getSession();
    if (session.status !== AuthStatus.Authenticated && session.status !== AuthStatus.Anonymous) return;
    if (now() - lastLoadedAt < refresh.staleAfterMs) return;
    failures = 0;
    void revalidate();
  }

  async function applyHint(): Promise<void> {
    peerDepth += 1;
    failures = 0;
    try {
      await revalidate();
    } finally {
      peerDepth -= 1;
    }
  }

  disposers.push(host.subscribe(onSession));
  onSession(host.getSession());

  if (channel) {
    const open = channel;
    disposers.push(
      open.subscribe((message) => {
        if (isHint(message)) void applyHint();
      }),
      () => open.close(),
    );
  }

  if (refresh && typeof window !== 'undefined' && typeof document !== 'undefined') {
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') wake();
    };
    window.addEventListener('focus', wake);
    document.addEventListener('visibilitychange', onVisibility);
    disposers.push(
      () => window.removeEventListener('focus', wake),
      () => document.removeEventListener('visibilitychange', onVisibility),
    );
  }

  return {
    announce: (kind) => {
      if (closed || peerDepth > 0) return;
      channel?.post({ kind });
    },
    dispose: () => {
      if (closed) return;
      closed = true;
      clearTimer();
      for (const dispose of disposers.splice(0)) dispose();
    },
  };
}
