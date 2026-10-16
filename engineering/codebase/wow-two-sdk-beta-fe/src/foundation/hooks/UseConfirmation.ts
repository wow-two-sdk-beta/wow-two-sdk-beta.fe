import { onScopeDispose, shallowRef, type ShallowRef } from 'vue';

/** The state and decisions for one imperative confirmation host. */
export interface ConfirmationController<TRequest> {
  request: ShallowRef<TRequest | null>;
  confirm: (request: TRequest) => Promise<boolean>;
  accept: () => void;
  cancel: () => void;
}

/** Owns asynchronous confirmation requests without invoking browser-native UI. */
export function useConfirmation<TRequest>(): ConfirmationController<TRequest> {
  const request = shallowRef<TRequest | null>(null);
  let resolveRequest: ((accepted: boolean) => void) | null = null;

  onScopeDispose(() => settle(false));

  /** Opens a request and resolves after the host reports an explicit choice. */
  function confirm(next: TRequest): Promise<boolean> {
    settle(false);
    request.value = next;
    return new Promise((resolve) => {
      resolveRequest = resolve;
    });
  }

  /** Accepts the active request. */
  function accept(): void {
    settle(true);
  }

  /** Cancels the active request. */
  function cancel(): void {
    settle(false);
  }

  /** Resolves and clears the active request. */
  function settle(accepted: boolean): void {
    const resolve = resolveRequest;
    resolveRequest = null;
    request.value = null;
    resolve?.(accepted);
  }

  return { request, confirm, accept, cancel };
}
