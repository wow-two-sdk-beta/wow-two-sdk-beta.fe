import { inject, type InjectionKey } from 'vue';

/**
 * The seam between `Carousel` and its `Viewport` / `Slides` / `Prev` / `Next` /
 * `Dots` / `Dot` children.
 *
 * React attached those as `Carousel.Viewport` / `.Slides` / … statics over a
 * `createContext`. An SFC's generated default export cannot carry statics
 * cleanly, so they ship as sibling components and share state through
 * provide/inject instead.
 *
 * Every non-function field is a live getter — read it, don't destructure.
 */
export interface CarouselContextValue {
  /** The active slide index. */
  readonly index: number;
  /** Moves to a slide, clamped or wrapped per `loop`. */
  setIndex: (index: number) => void;
  /** The slide count. */
  readonly count: number;
  /** Publishes the slide count — `CarouselSlides` owns this. */
  setCount: (count: number) => void;
  /** The wrap-around state. */
  readonly loop: boolean;
  /** Moves one slide back. */
  prev: () => void;
  /** Moves one slide forward. */
  next: () => void;
  /** The auto-play pause state — hover / focus sets it. */
  readonly paused: boolean;
  /** Sets the pause state. */
  setPaused: (paused: boolean) => void;
  /** The auto-play interval in ms, when enabled. */
  readonly autoPlay: number | undefined;
}

export const CarouselKey: InjectionKey<CarouselContextValue> = Symbol('wow-two.carousel');

export function useCarouselContext(): CarouselContextValue {
  const context = inject(CarouselKey, null);
  if (!context) throw new Error('Carousel.* must be used inside <Carousel>');
  return context;
}

/* eslint-disable-next-line @typescript-eslint/no-empty-object-type -- kept as an
   exported name: React declared `CarouselNavButtonProps` and consumers import it.
   Its only member was `aria-label`, which stays a FALLTHROUGH attr here — declaring
   a hyphenated prop name would have Vue camelize it to `ariaLabel` and the default
   would never apply. Shared by `CarouselPrev` and `CarouselNext`, so it lives here
   rather than in either SFC. */
export interface CarouselNavButtonProps {}
