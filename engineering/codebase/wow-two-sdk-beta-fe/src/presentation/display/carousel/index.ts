export { default as Carousel, type CarouselProps } from './Carousel.vue';
/* React attached these as `Carousel.Viewport` / `.Slides` / `.Slide` / `.Prev` /
   `.Next` / `.Dots` / `.Dot` via `Object.assign`. An SFC's generated default export
   cannot carry statics cleanly, so they ship as siblings. */
export { default as CarouselViewport, type CarouselViewportProps } from './CarouselViewport.vue';
export { default as CarouselSlides, type CarouselSlidesProps } from './CarouselSlides.vue';
export { default as CarouselSlide, type CarouselSlideProps } from './CarouselSlide.vue';
export { default as CarouselPrev } from './CarouselPrev.vue';
export { default as CarouselNext } from './CarouselNext.vue';
export { default as CarouselDots, type CarouselDotsProps } from './CarouselDots.vue';
export { default as CarouselDot, type CarouselDotProps } from './CarouselDot.vue';
export { useCarouselContext, type CarouselContextValue, type CarouselNavButtonProps } from './CarouselContext';
export { default } from './Carousel.vue';
