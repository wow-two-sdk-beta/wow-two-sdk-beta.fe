import type { VNode } from 'vue';

/** Defines a renderable slice of a toast — a string, or a VNode the caller builds with `h()`. */
export type ToastNode = string | VNode;
