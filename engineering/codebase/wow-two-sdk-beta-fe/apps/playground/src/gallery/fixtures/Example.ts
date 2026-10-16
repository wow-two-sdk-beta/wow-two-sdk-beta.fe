/** Typed fixtures shared by the interactive gallery and render regression tests. */
import type { Component, VNode } from 'vue';

export type PropsOf<C> = C extends abstract new (...args: never[]) => { $props: infer P }
  ? P
  : C extends (props: infer P, ...args: never[]) => unknown
    ? P
    : never;

type ComponentLike = (abstract new (...args: never[]) => { $props: object }) | ((...args: never[]) => unknown);

export interface SmokeCase {
  readonly name: string;
  readonly component: Component;
  readonly props: Record<string, unknown>;

  readonly slot?: boolean;

  readonly wrap?: (node: VNode) => VNode;

  readonly skipSsr?: string;

  readonly skipMount?: string;
}

interface SmokeOptions {
  readonly slot?: boolean;
  readonly wrap?: (node: VNode) => VNode;
  readonly skipSsr?: string;
  readonly skipMount?: string;
}

export function smokeCase<C extends ComponentLike>(
  name: string,
  component: C,
  props: PropsOf<C>,
  options: SmokeOptions = {},
): SmokeCase {
  return {
    name,
    component: component as unknown as Component,
    props: props as Record<string, unknown>,
    ...options,
  };
}
