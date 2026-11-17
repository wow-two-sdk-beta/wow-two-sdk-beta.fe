import { expect, it } from 'vitest';
import Button from '@src/presentation/actions/button/Button.vue';
import { smokeCase } from '../../../../apps/playground/src/gallery/fixtures/Example';
import { assertRendersOnServer } from '../../../support/Smoke';

it('server-renders an unavailable button with its description in place', async () => {
  const html = await assertRendersOnServer(
    smokeCase('Button', Button, {
      variant: 'glass',
      shape: 'circle',
      isUnavailable: true,
      unavailableLabel: 'No link to the original',
      'aria-label': 'Open the original',
    }),
  );
  const describedBy = /aria-describedby="([^"]+)"/u.exec(html)?.[1];
  expect(html).toContain('aria-disabled="true"');
  expect(html).toContain('data-state="unavailable"');
  expect(describedBy).toBeDefined();
  expect(html).toContain(`<span id="${describedBy}" hidden>No link to the original</span>`);
});
