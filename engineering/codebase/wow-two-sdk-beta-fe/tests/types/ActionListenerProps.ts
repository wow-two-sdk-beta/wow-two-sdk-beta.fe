import type { ButtonProps } from '@src/presentation/actions/button';

/** Compiled by vue-tsc: `@click` stays typed on `Button`, which gates the click at runtime before forwarding it. */
const button = { onClick: (event: MouseEvent): void => void event, variant: 'solid' } satisfies ButtonProps;
void button;
