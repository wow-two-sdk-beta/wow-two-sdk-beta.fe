import { onScopeDispose, shallowRef, type Ref } from 'vue';
import type { QueryClient } from '@tanstack/vue-query';
import { ApiError, ApiFailureFactory } from '../../../foundation/http';
import {
  awaitRequest,
  createRequestScope,
  type RequestScope,
  type RequestSnapshot,
} from '../../../foundation/http/RequestScope';

const scopes = new WeakMap<QueryClient, RequestScope>();

/** The query client's private lifetime; independent clients and SSR requests never share state. */
export function queryScope(client: QueryClient): RequestScope {
  let scope = scopes.get(client);
  if (!scope) {
    scope = createRequestScope();
    scopes.set(client, scope);
    scope.subscribe(() => client.clear());
  }
  return scope;
}

/** Guards callbacks and transports at a captured session boundary. */
export function assertQueryCurrent(origin: RequestSnapshot): void {
  if (!origin.isCurrent()) throw new ApiError(ApiFailureFactory.create('cancelled'));
}

/** Stops waiting for an obsolete operation and observes its eventual settlement. */
export async function withinQueryScope<T>(origin: RequestSnapshot, run: () => Promise<T>): Promise<T> {
  assertQueryCurrent(origin);
  try {
    const value = await awaitRequest(run, origin.signal);
    assertQueryCurrent(origin);
    return value;
  } catch (error) {
    assertQueryCurrent(origin);
    throw error;
  }
}

/** Rebinds live observers to the cleared cache after a session boundary. */
export function useQueryRevision(client: QueryClient): Ref<number> {
  const scope = queryScope(client);
  const revision = shallowRef(scope.capture().revision);
  const unsubscribe = scope.subscribe(() => {
    revision.value = scope.capture().revision;
  });
  onScopeDispose(unsubscribe);
  return revision;
}
