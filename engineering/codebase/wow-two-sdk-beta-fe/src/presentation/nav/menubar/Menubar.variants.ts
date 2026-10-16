import { tv, type VariantProps } from '../../../foundation/styles';

export const menubarVariants = tv({
  base: 'flex items-center gap-1 rounded-md border border-border bg-background p-1',
});

export const menubarTriggerVariants = tv({
  base: 'inline-flex select-none items-center rounded-sm px-3 py-1 text-sm font-medium text-foreground outline-hidden transition-colors hover:bg-muted focus-visible:bg-muted data-[state=open]:bg-muted',
});

export type MenubarVariants = VariantProps<typeof menubarVariants>;
