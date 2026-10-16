export { default as CommentThreadGroup, type CommentThreadGroupProps } from './CommentThreadGroup.vue';
/* React attached this as `CommentThreadGroup.Comment` via `Object.assign`. An SFC's
   generated default export cannot carry statics cleanly, so it ships as a sibling. */
export { default as Comment, type CommentProps } from './Comment.vue';
