import { server, userEvent } from 'vitest/browser';

/** WebKit on macOS uses Option-Tab for all controls when system keyboard navigation is disabled. */
export async function nativeTab(options: { shift?: boolean } = {}): Promise<void> {
  if (server.browser === 'webkit' && server.platform === 'darwin') {
    await userEvent.keyboard(options.shift ? '{Alt>}{Shift>}{Tab}{/Shift}{/Alt}' : '{Alt>}{Tab}{/Alt}');
  } else {
    await userEvent.tab(options);
  }
}
