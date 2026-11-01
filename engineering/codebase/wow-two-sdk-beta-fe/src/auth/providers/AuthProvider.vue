<script lang="ts">
import type { AuthBridge, AuthBridgeOwner } from '../AuthBridge';
import { AuthStatus, type AuthSession, type AuthStrategy, type AuthStrategyHost } from '../AuthSession';

const AnonymousSession = { status: AuthStatus.Anonymous, user: null } as const;

/** Defines the props for {@link AuthProvider}. */
export interface AuthProviderProps<TUser = unknown, TSignInInput = unknown> {
  /**
   * The transport strategy (cookie / bearer / redirect factory, or bespoke delegates). Read live
   * on every call. A swap cancels old work and re-resolves when canResolveOnMount is enabled.
   */
  readonly strategy: AuthStrategy<TUser, TSignInInput>;

  /** The app-owned bridge wiring the non-Vue seams — api-client 401s flip this session; router guards read it. */
  readonly bridge?: AuthBridge<TUser>;

  /**
   * Whether to run the me-resolve on mount. Default `true`; with `false` the session stays
   * `unknown` until `refresh()` or an action settles it.
   */
  readonly canResolveOnMount?: boolean;
  /** @deprecated Use `canResolveOnMount`; this alias is removed next release. */
  readonly resolveOnMount?: boolean;

  /** Fires after a bridged 401 flips the session to `anonymous`; route an expiry through `bridge.subscribeExpired`. */
  readonly onUnauthorized?: (error?: unknown) => void;

  /** Fires when the me-resolve returns an expected failure — the session still settles `anonymous`. */
  readonly onResolveError?: (error: unknown) => void;

  /** Fires on every session snapshot, including the initial `unknown`. */
  readonly onSessionChange?: (session: AuthSession<TUser>) => void;
}
</script>

<script setup lang="ts" generic="TUser = unknown, TSignInInput = unknown">
import { onMounted, onScopeDispose, provide, shallowRef, watch } from 'vue';

// `AuthStatus` / `AuthSession` are already imported by the plain `<script>` block above — the two
// blocks compile into ONE module, so importing them again here is a duplicate identifier.
import { AuthKey, type AuthApi } from './AuthContext';
import { awaitRequest } from '../../foundation/http/RequestScope';
import { AppErrorFactory, ResultExtensions, type AppError, type Result } from '../../foundation/results';

/**
 * Renders no element of its own — the slot passes straight through — while owning the app session state
 * machine (`unknown → resolving → authenticated | anonymous`). Superseded requests are cancelled.
 * Sign-in/out/refresh actions and the optional AuthBridge connect transport failures to the session;
 * 401s flip the session and router guards can await it. Headless: gates, splash screens, and login UI stay
 * app-side.
 */
defineOptions({ name: 'AuthProvider' });

defineSlots<{
  /** The subtree with access to the session — gates and login UI live here. */
  default(): unknown;
}>();

const props = withDefaults(defineProps<AuthProviderProps<TUser, TSignInInput>>(), {
  bridge: undefined,
  canResolveOnMount: undefined,
  resolveOnMount: undefined,
  onUnauthorized: undefined,
  onResolveError: undefined,
  onSessionChange: undefined,
});

const session = shallowRef<AuthSession<TUser>>({ status: AuthStatus.Unknown, user: null });

let generation = 0;
let controller: AbortController | null = null;
let inflight: Promise<Result<TUser | null, AppError>> | null = null;
let disposed = false;
let mounted = false;
// Sign-ins and sign-outs in flight: a background revalidation yields to them instead of cancelling them.
let actions = 0;
const hostListeners = new Set<(session: AuthSession<TUser>) => void>();

function invalidate(): number {
  generation += 1;
  controller?.abort();
  controller = null;
  inflight = null;
  return generation;
}
function begin(): { current: number; signal: AbortSignal } {
  const current = invalidate();
  controller = new AbortController();
  return { current, signal: controller.signal };
}
function owns(current: number): boolean {
  return !disposed && current === generation;
}
const cancelled = (): Result<never, AppError> => ResultExtensions.fail(AppErrorFactory.cancelled());

let bridgeOwner: AuthBridgeOwner<TUser> | undefined;
watch(
  () => props.bridge,
  (bridge, _previous, onCleanup) => {
    const owner = bridge?.attach();
    bridgeOwner = owner;
    owner?.publishSession(session.value);
    const unsubscribe = owner?.subscribeUnauthorized((error) => {
      invalidate();
      try {
        props.strategy.onUnauthorized?.();
      } finally {
        session.value = AnonymousSession;
        props.onUnauthorized?.(error);
      }
    });
    onCleanup(() => {
      unsubscribe?.();
      owner?.detach();
      if (bridgeOwner === owner) bridgeOwner = undefined;
    });
  },
  { immediate: true, flush: 'sync' },
);
watch(
  session,
  (current) => {
    bridgeOwner?.publishSession(current);
    props.onSessionChange?.(current);
    // A strategy's observer must not break the session it watches.
    for (const listener of [...hostListeners]) {
      try {
        listener(current);
      } catch {
        /* The strategy owns its listener's failures. */
      }
    }
  },
  { immediate: true, flush: 'sync' },
);

/** Ends a signed-in session the server no longer holds — one expiry through the bridge, else a plain flip. */
function endSession(): void {
  const bridge = props.bridge;
  if (bridge) {
    bridge.expire(AppErrorFactory.unauthorized());
    return;
  }
  invalidate();
  try {
    props.strategy.onUnauthorized?.();
  } finally {
    session.value = AnonymousSession;
  }
}

function runResolve(silent = false): Promise<Result<TUser | null, AppError>> {
  if (inflight) return inflight;
  if (silent && actions > 0) return Promise.resolve(cancelled());
  const { current, signal } = begin();
  const strategy = props.strategy;
  const before = session.value;
  // A settled session stays as it is while a background check runs; only a first or explicit resolve shows `resolving`.
  const quiet = silent && (before.status === AuthStatus.Authenticated || before.status === AuthStatus.Anonymous);
  if (!quiet) session.value = { status: AuthStatus.Resolving, user: null };
  const promise = (async (): Promise<Result<TUser | null, AppError>> => {
    try {
      const outcome = await awaitRequest(() => strategy.resolveUser({ signal }), signal);
      if (!owns(current)) return cancelled();
      if (quiet) {
        if (outcome.ok && outcome.value !== null) {
          session.value = { status: AuthStatus.Authenticated, user: outcome.value };
        } else if (outcome.ok && before.status === AuthStatus.Authenticated) {
          try {
            endSession();
          } catch (error) {
            props.onResolveError?.(error);
          }
        } else if (!outcome.ok && outcome.failure.type !== 'cancelled') {
          // A failed check is not proof the session ended: keep it and report.
          props.onResolveError?.(outcome.failure);
        }
        return outcome;
      }
      session.value =
        outcome.ok && outcome.value !== null
          ? { status: AuthStatus.Authenticated, user: outcome.value }
          : AnonymousSession;
      if (!outcome.ok && outcome.failure.type !== 'cancelled') props.onResolveError?.(outcome.failure);
      return outcome;
    } catch (error) {
      if (signal.aborted) return cancelled();
      // A background check that throws is a bug to surface, not proof the session ended.
      if (owns(current) && !quiet) session.value = AnonymousSession;
      throw error;
    }
  })().finally(() => {
    if (inflight === promise) inflight = null;
  });
  inflight = promise;
  return promise;
}
async function resolveInitialSession(): Promise<void> {
  if (props.canResolveOnMount ?? props.resolveOnMount ?? true) await runResolve();
}
const host: AuthStrategyHost<TUser> = {
  getSession: () => session.value,
  subscribe: (listener) => {
    hostListeners.add(listener);
    return () => {
      hostListeners.delete(listener);
    };
  },
  revalidate: () => runResolve(true),
};
let disconnect: (() => void) | undefined;
function connectStrategy(): void {
  const previous = disconnect;
  disconnect = undefined;
  previous?.();
  if (mounted && !disposed) disconnect = props.strategy.connect?.(host);
}
onMounted(() => {
  mounted = true;
  connectStrategy();
  return resolveInitialSession();
});
watch(
  () => props.canResolveOnMount ?? props.resolveOnMount ?? true,
  (enabled) => {
    if (enabled) return resolveInitialSession();
  },
);
watch(
  () => props.strategy,
  () => {
    invalidate();
    session.value = { status: AuthStatus.Unknown, user: null };
    connectStrategy();
    return resolveInitialSession();
  },
  { flush: 'sync' },
);
onScopeDispose(() => {
  disposed = true;
  invalidate();
  disconnect?.();
  disconnect = undefined;
  hostListeners.clear();
});

async function signIn(input?: TSignInInput): Promise<Result<TUser | null, AppError>> {
  const strategy = props.strategy;
  if (!strategy.signIn) return ResultExtensions.fail(AppErrorFactory.unavailable());
  const { current, signal } = begin();
  if (session.value.status === AuthStatus.Resolving) session.value = AnonymousSession;
  let outcome: Result<TUser | null | void, AppError>;
  actions += 1;
  try {
    outcome = await awaitRequest(() => strategy.signIn!(input as TSignInInput, { signal }), signal);
  } catch (error) {
    if (signal.aborted) return cancelled();
    throw error;
  } finally {
    actions -= 1;
  }
  if (!owns(current)) return cancelled();
  if (!outcome.ok) return outcome;
  const user = outcome.value ?? null;
  if (user !== null) session.value = { status: AuthStatus.Authenticated, user };
  return ResultExtensions.ok(user);
}
async function signOut(): Promise<Result<void, AppError>> {
  const strategy = props.strategy;
  const { current, signal } = begin();
  actions += 1;
  session.value = AnonymousSession;
  try {
    return (await awaitRequest(() => strategy.signOut?.({ signal }), signal)) ?? ResultExtensions.ok(undefined);
  } catch (error) {
    if (signal.aborted) return cancelled();
    throw error;
  } finally {
    actions -= 1;
    if (owns(current)) session.value = AnonymousSession;
  }
}
function setUser(user: TUser | null): void {
  invalidate();
  session.value = user === null ? AnonymousSession : { status: AuthStatus.Authenticated, user };
}

// React rebuilt this object through `useMemo` on every session change so consumers saw fresh
// values. Native getters over the `session` ref do it without rebuilding: each read tracks the ref,
// so a template binding or a `computed` re-evaluates on transition. See `AuthApi` for why these are
// getters rather than a `reactive()` wrapper — a proxy would break `user`'s identity.
const api: AuthApi<TUser, TSignInInput> = {
  get status() {
    return session.value.status;
  },
  get user() {
    return session.value.user;
  },
  get isAuthenticated() {
    return session.value.status === AuthStatus.Authenticated;
  },
  get isPending() {
    return session.value.status === AuthStatus.Unknown || session.value.status === AuthStatus.Resolving;
  },
  signIn,
  signOut,
  refresh: () => runResolve(),
  setUser,
};

provide(AuthKey, api as AuthApi<unknown, unknown>);
</script>

<template>
  <slot />
</template>
