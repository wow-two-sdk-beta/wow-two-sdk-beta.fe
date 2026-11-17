import { toastHost } from './ToastHostStore';
import type { ToastOptions } from './ToastOptions';
import type { ToastPromiseOptions } from './ToastPromiseOptions';

/** Manages the imperative toast API, bound to the app-wide store. */
export function useToastHost() {
  return {
    toast: (opts: ToastOptions) => toastHost.toast(opts),
    update: (id: string, patch: Partial<ToastOptions>) => toastHost.update(id, patch),
    promise: <T>(promise: Promise<T>, opts: ToastPromiseOptions<T>) => toastHost.promise(promise, opts),
    dismiss: (id: string) => toastHost.dismiss(id),
    dismissAll: () => toastHost.dismissAll(),
  };
}
