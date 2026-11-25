import { beforeAll } from 'vitest';
import { server, userEvent } from 'vitest/browser';

/*
 * Setup file of the browser project. The browser keeps one real pointer per page, and it outlives a test and, when a
 * page runs the next file, a test file. If it rests where a trigger mounts, the browser fires a trusted `pointerenter`
 * or `:hover` on that trigger after the first layout (a hover-revealed carousel arrow shows without a hover, a tooltip
 * is taken over mid-test). Each Chromium file therefore starts with the pointer in the top-left corner, where a fresh
 * page rests it and where no test mounts a trigger.
 *
 * Touch emulation is deliberately left alone here: on Linux, switching it off is what breaks `(hover: hover)`.
 */
beforeAll(async () => {
  if (server.browser !== 'chromium') return;
  const corner = document.createElement('div');
  corner.style.cssText = 'position: fixed; left: 0; top: 0; width: 8px; height: 8px';
  document.body.append(corner);
  await userEvent.hover(corner);
  corner.remove();
});
