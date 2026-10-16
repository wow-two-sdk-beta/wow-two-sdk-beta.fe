import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ToastSimple from '@src/presentation/feedback/toastSimple/ToastSimple.vue';

// Vitest stubs stylesheet imports, so the published file is read from disk.
const stylesheet = readFileSync(resolve(process.cwd(), 'src/presentation/feedback/toastHost/styles.css'), 'utf8');

describe('component-only toast stylesheet', () => {
  it('lists every class the toast card renders for each severity', () => {
    const listed = new Set(stylesheet.match(/@source inline\('([^']*)'\)/)?.[1]?.split(/\s+/) ?? []);
    for (const severity of ['neutral', 'info', 'success', 'warning', 'danger'] as const) {
      const wrapper = mount(ToastSimple, { props: { severity } });
      const rendered = wrapper.element.className.split(/\s+/).filter(Boolean);
      expect(rendered.length).toBeGreaterThan(0);
      for (const className of rendered) expect(listed, `${severity}: ${className}`).toContain(className);
      wrapper.unmount();
    }
  });
});
