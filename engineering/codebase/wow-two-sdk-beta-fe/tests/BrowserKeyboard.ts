import { server, userEvent } from 'vitest/browser';

/**
 * Presses Tab in the test frame. A fresh test window starts with focus on the runner page around the frame, where
 * Firefox's first Tab lands on the frame's document instead of its first control, so the frame takes focus first.
 * WebKit on macOS uses Option-Tab for all controls when system keyboard navigation is disabled.
 */
export async function nativeTab(options: { shift?: boolean } = {}): Promise<void> {
  if (!document.hasFocus()) window.focus();
  if (server.browser === 'webkit' && server.platform === 'darwin') {
    await userEvent.keyboard(options.shift ? '{Alt>}{Shift>}{Tab}{/Shift}{/Alt}' : '{Alt>}{Tab}{/Alt}');
  } else {
    await userEvent.tab(options);
  }
}
