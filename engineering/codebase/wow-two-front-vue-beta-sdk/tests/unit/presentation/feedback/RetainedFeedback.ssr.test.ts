import { describe, expect, it } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createFeedbackBus, NoticeTone } from '@src/feedback';
import NotificationCenterGroup from '@src/presentation/display/notificationCenterGroup/NotificationCenterGroup.vue';

describe('retained center SSR', () => {
  it('renders an explicit snapshot without DOM globals or toast replay', async () => {
    const bus = createFeedbackBus({
      initialRetained: [{ id: 'earlier', title: 'Review required', tone: NoticeTone.Warning }],
    });
    const html = await renderToString(createSSRApp({ render: () => h(NotificationCenterGroup, { bus }) }));
    expect(html).toContain('Review required');
    expect(html).toContain('Delete notification');
    expect(html).not.toContain('Close notifications');
  });
});
