import {
  inject,
  provide,
  shallowRef,
  type InjectionKey,
  onMounted,
  onScopeDispose,
  readonly,
  ref,
  shallowReadonly,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';

/* The Google Identity Services client. Loaded once per document and cached at module scope — the
   script installs a single `window.google.accounts.id` namespace, so a second <script> is wasted
   bytes and a second onload race. */
const GoogleIdentityScriptSrc = 'https://accounts.google.com/gsi/client';

/** Defines the load state of the Google Identity Services client. */
export const GoogleIdentityStatus = {
  /** No client id configured — nothing was loaded, and the caller renders nothing. */
  Unresolved: 'unresolved',

  /** The GIS script is in flight. */
  Loading: 'loading',

  /** The GIS client is initialized and can render a button or raise a prompt. */
  Ready: 'ready',

  /** The script failed to load, or `initialize` threw. */
  Failed: 'failed',
} as const;

/** Defines the load state of the Google Identity Services client. */
export type GoogleIdentityStatus = (typeof GoogleIdentityStatus)[keyof typeof GoogleIdentityStatus];

/** Defines the credential GIS hands back after a successful sign-in. */
export interface GoogleCredentialResponse {
  /** The signed JWT ID token to send to the backend for verification. Absent on a dismissed prompt. */
  readonly credential?: string;

  /** How the credential was selected (`btn`, `auto`, …) — GIS's own vocabulary, passed through unmapped. */
  readonly select_by?: string;
}

/*
 * The GIS button is rendered by Google into a host element, and its options are Google's wire
 * contract — snake_case keys, fixed string values. They are declared verbatim rather than mapped to
 * house casing: a renamed key is silently ignored by GIS, which fails as a default-looking button
 * rather than an error.
 */

/** Defines the appearance options GIS accepts when rendering its own sign-in button. */
export interface GoogleButtonOptions {
  /** The button surface — `outline` · `filled_blue` · `filled_black`. Default `outline`. */
  readonly theme?: 'outline' | 'filled_blue' | 'filled_black';

  /** The button height band — `large` · `medium` · `small`. Default `large`. */
  readonly size?: 'large' | 'medium' | 'small';

  /** The label wording — `signin_with` · `signup_with` · `continue_with` · `signin`. */
  readonly text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';

  /** The button outline — `rectangular` · `pill` · `circle` · `square`. */
  readonly shape?: 'rectangular' | 'pill' | 'circle' | 'square';

  /** The rendered width in px. GIS caps this at 400. */
  readonly width?: number;

  /** The logo placement — `left` · `center`. */
  readonly logo_alignment?: 'left' | 'center';

  /** The BCP-47 locale for the button copy. Defaults to the browser's. */
  readonly locale?: string;
}

/** Defines the subset of `window.google.accounts.id` this module drives. */
interface GoogleAccountsId {
  initialize(config: Record<string, unknown>): void;
  renderButton(target: HTMLElement, options: GoogleButtonOptions): void;
  prompt(): void;
  disableAutoSelect(): void;
}

declare global {
  var google: { accounts?: { id?: GoogleAccountsId } } | undefined;
}

/* One in-flight promise per document. Never rejected-and-cached: a failed load is dropped so a
   later mount (a flaky network on the first paint) can retry rather than inherit the failure. */
const scriptPromises = new WeakMap<Document, Promise<GoogleAccountsId>>();
const documentOwners = new WeakMap<Document, symbol>();
const GoogleIdentityKey: InjectionKey<GoogleIdentityApi> = Symbol('google-identity');

/**
 * Loads the Google Identity Services client, returning the shared `accounts.id` namespace.
 *
 * Resolves immediately when the script is already present. Rejects (and clears the cache) when the
 * script fails to load, so the next caller retries. Throws under SSR — call it from `onMounted`.
 */
export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('Google Identity Services needs a document.'));
  }

  const loaded = globalThis.google?.accounts?.id;
  if (loaded) return Promise.resolve(loaded);
  const cached = scriptPromises.get(document);
  if (cached) return cached;

  const ownerDocument = document;
  const scriptPromise = new Promise<GoogleAccountsId>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GoogleIdentityScriptSrc}"]`);
    const script = existing ?? document.createElement('script');

    const cleanup = (): void => {
      clearTimeout(timer);
      script.removeEventListener('load', settle);
      script.removeEventListener('error', fail);
    };
    const fail = (): void => {
      cleanup();
      script.remove();
      reject(new Error('Google Identity Services failed to load.'));
    };
    const settle = (): void => {
      cleanup();
      const api = globalThis.google?.accounts?.id;
      if (api) resolve(api);
      else {
        script.remove();
        reject(new Error('Google Identity Services loaded without an accounts.id client.'));
      }
    };

    const timer = setTimeout(fail, 15_000);
    script.addEventListener('load', settle, { once: true });
    script.addEventListener('error', fail, { once: true });

    if (!existing) {
      script.src = GoogleIdentityScriptSrc;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  scriptPromises.set(ownerDocument, scriptPromise);
  // A rejected load must not poison later mounts.
  void scriptPromise.catch(() => {
    if (scriptPromises.get(ownerDocument) === scriptPromise) scriptPromises.delete(ownerDocument);
  });

  return scriptPromise;
}

/** Defines the options {@link provideGoogleIdentity} takes. */
export interface ProvideGoogleIdentityOptions {
  /** OAuth client id. Empty / undefined keeps the status `unresolved` and loads nothing — app stays guest-only. */
  readonly clientId: MaybeRefOrGetter<string | undefined>;

  /** Receives the ID token on a successful sign-in. */
  readonly onCredential: (credential: string, response: GoogleCredentialResponse) => void;

  /** Receives a load / initialize failure. The status is `failed` by the time this fires. */
  readonly onError?: (error: Error) => void;

  /** Whether GIS may sign a returning user in without a click. Default `false`. */
  readonly autoSelect?: MaybeRefOrGetter<boolean | undefined>;

  /** Whether a click outside the One Tap prompt dismisses it. Default `true`. */
  readonly cancelOnTapOutside?: MaybeRefOrGetter<boolean | undefined>;
}

/** Defines the handle {@link useGoogleIdentity} returns. */
export interface GoogleIdentityApi {
  /** The current load state. */
  readonly status: Readonly<Ref<GoogleIdentityStatus>>;

  /** The load / initialize failure, or `null`. */
  readonly error: Readonly<Ref<Error | null>>;

  /** Renders the Google-owned sign-in button into the host element. No-op until the status is `ready`. */
  readonly renderButton: (target: HTMLElement, options?: GoogleButtonOptions) => void;

  /** Raises the One Tap prompt. No-op until the status is `ready`. */
  readonly prompt: () => void;

  /** Clears the auto-select grant — call on sign-out so the next visit asks again. */
  readonly disableAutoSelect: () => void;
}

/**
 * Provides one app-level Google Identity Services owner — script load, `initialize`, and the
 * credential callback.
 *
 * Headless by design: this module renders nothing, and never talks to the backend. The ID token is
 * handed to `onCredential`, and posting it (to `/api/auth/google` or wherever the product's identity
 * endpoint lives) stays app-side, the same boundary the rest of `auth` keeps.
 *
 * The client id is a `MaybeRefOrGetter` — pass a getter (`() => props.clientId`) to keep it reactive;
 * a change re-initializes against the new id.
 */
export function provideGoogleIdentity(options: ProvideGoogleIdentityOptions): GoogleIdentityApi {
  const status = ref<GoogleIdentityStatus>(GoogleIdentityStatus.Unresolved);
  const error = ref<Error | null>(null);
  const client = shallowRef<GoogleAccountsId | null>(null);
  const owner = Symbol('google-owner');
  let ownerDocument: Document | undefined;

  let disposed = false;
  let generation = 0;

  function fail(cause: Error): void {
    if (disposed) return;
    client.value = null;
    error.value = cause;
    status.value = GoogleIdentityStatus.Failed;
    options.onError?.(cause);
  }

  async function initialize(clientId: string | undefined): Promise<void> {
    const current = ++generation;
    ownerDocument = document;
    const activeOwner = documentOwners.get(ownerDocument);
    if (activeOwner && activeOwner !== owner) {
      fail(new Error('Google Identity already has an app-level owner in this document.'));
      return;
    }
    documentOwners.set(ownerDocument, owner);
    const isCurrent = (): boolean => !disposed && current === generation && toValue(options.clientId) === clientId;
    client.value = null;
    if (!clientId) {
      client.value = null;
      error.value = null;
      status.value = GoogleIdentityStatus.Unresolved;
      return;
    }

    status.value = GoogleIdentityStatus.Loading;
    error.value = null;

    try {
      const api = await loadGoogleIdentity();

      // The client id may have changed (or the scope torn down) while the script was in flight.
      if (!isCurrent()) return;

      api.initialize({
        client_id: clientId,
        callback: (response: GoogleCredentialResponse) => {
          if (isCurrent() && response.credential) options.onCredential(response.credential, response);
        },
        auto_select: toValue(options.autoSelect) ?? false,
        cancel_on_tap_outside: toValue(options.cancelOnTapOutside) ?? true,
      });

      client.value = api;
      status.value = GoogleIdentityStatus.Ready;
    } catch (cause) {
      if (isCurrent()) fail(cause instanceof Error ? cause : new Error('Google Identity Services failed to load.'));
    }
  }

  // Mount-only: `initialize` reaches for `document`, so it must not run during SSR.
  onMounted(() => {
    watch(
      () => [toValue(options.clientId), toValue(options.autoSelect), toValue(options.cancelOnTapOutside)] as const,
      ([clientId]) => void initialize(clientId),
      { immediate: true, flush: 'sync' },
    );
  });

  onScopeDispose(() => {
    disposed = true;
    generation += 1;
    if (ownerDocument && documentOwners.get(ownerDocument) === owner) documentOwners.delete(ownerDocument);
    client.value = null;
  });

  const handle: GoogleIdentityApi = {
    status: readonly(status),
    error: shallowReadonly(error),
    renderButton: (target, buttonOptions) => client.value?.renderButton(target, buttonOptions ?? {}),
    prompt: () => client.value?.prompt(),
    disableAutoSelect: () => client.value?.disableAutoSelect(),
  };
  provide(GoogleIdentityKey, handle);
  return handle;
}

/** Reads the app-level identity owner; buttons never initialize or replace Google configuration. */
export function useGoogleIdentity(): GoogleIdentityApi {
  const owner = inject(GoogleIdentityKey, null);
  if (!owner) throw new Error('useGoogleIdentity requires provideGoogleIdentity in an ancestor.');
  return owner;
}
