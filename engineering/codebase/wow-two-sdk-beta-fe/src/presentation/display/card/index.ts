export { default as Card, type CardProps } from './Card.vue';
/* React attached these as `Card.Header` / `.Title` / … via `Object.assign`. An SFC's
   generated default export cannot carry statics cleanly, so they ship as siblings. */
export { default as CardHeader } from './CardHeader.vue';
export { default as CardTitle } from './CardTitle.vue';
export { default as CardDescription } from './CardDescription.vue';
export { default as CardBody } from './CardBody.vue';
export { default as CardFooter } from './CardFooter.vue';
