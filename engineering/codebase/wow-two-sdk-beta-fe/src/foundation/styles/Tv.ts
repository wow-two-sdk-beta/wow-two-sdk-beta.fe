// Re-export tailwind-variants under a stable internal name. If we later swap
// implementations or wrap with a default config, consumers don't need to change.
export { tv, type VariantProps } from 'tailwind-variants';
