import { afterEach, describe, expect, it } from 'vitest';
import { createReporter, describeClickTarget, memoryReportSink } from '@src/reporting';

const stops: Array<() => void> = [];

afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
  document.body.innerHTML = '';
});

const render = (html: string): void => {
  document.body.innerHTML = html;
};

const click = (selector: string): void => {
  document.querySelector(selector)!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

describe('click capture', () => {
  it('names the control a click landed in, the way a person retells it', () => {
    const reporter = createReporter({ app: { name: 'atlas' }, sink: memoryReportSink() });
    stops.push(reporter.captureClicks());
    render(`
      <button id="save"><svg id="glyph"></svg>  Save   changes </button>
      <a id="settings" href="/settings">Settings</a>
      <div role="menuitem" id="archive" aria-label="Archive order">⋯</div>
      <label>Remember me <input id="remember" type="checkbox"></label>
      <p id="prose">Just text</p>
    `);

    click('#glyph');
    click('#settings');
    click('#archive');
    click('#remember');
    click('#prose');

    expect(reporter.breadcrumbs().map((crumb) => [crumb.category, crumb.message])).toEqual([
      ['click', 'button "Save changes"'],
      ['click', 'link "Settings"'],
      ['click', 'menuitem "Archive order"'],
      ['click', 'checkbox "Remember me"'],
    ]);
  });

  it('honours explicit labels, ignored subtrees and text-free naming', () => {
    render(`
      <button id="labelled" data-report-label="Open invoice">Invoice #4411 — Jane Roe</button>
      <div data-report-ignore><button id="ignored">Report</button></div>
      <button id="private" title="Customer">Jane Roe</button>
    `);
    const target = (selector: string) => document.querySelector(selector);

    expect(describeClickTarget(target('#labelled'))).toBe('button "Open invoice"');
    expect(describeClickTarget(target('#ignored'))).toBeUndefined();
    expect(describeClickTarget(target('#private'), { isTextNamed: false })).toBe('button "Customer"');
    expect(describeClickTarget(null)).toBeUndefined();
  });

  it('stops recording once the capture is stopped', () => {
    const reporter = createReporter({ app: { name: 'atlas' }, sink: memoryReportSink() });
    const stop = reporter.captureClicks();
    render('<button id="go">Go</button>');
    click('#go');
    stop();
    click('#go');
    expect(reporter.breadcrumbs()).toHaveLength(1);
  });
});

describe('error capture', () => {
  it('records uncaught errors and unhandled rejections', () => {
    const reporter = createReporter({ app: { name: 'atlas' }, sink: memoryReportSink() });
    stops.push(reporter.captureErrors(window));

    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'x is not a function',
        filename: 'https://app.test/main.js?sig=1',
        lineno: 7,
      }),
    );
    const rejection = new Event('unhandledrejection') as Event & { reason?: unknown };
    rejection.reason = new Error('quota exceeded');
    window.dispatchEvent(rejection);

    expect(reporter.breadcrumbs()).toMatchObject([
      {
        category: 'error',
        level: 'error',
        message: 'x is not a function',
        data: { source: 'https://app.test/main.js?sig=[redacted]', line: 7 },
      },
      { category: 'error', message: 'Unhandled rejection: quota exceeded' },
    ]);
  });
});

describe('page context', () => {
  it('reads the page, the client and a blob screenshot when a report is sent', async () => {
    const sink = memoryReportSink();
    const reporter = createReporter({
      app: { name: 'atlas' },
      sink,
      screenshot: async () => new Blob(['png'], { type: 'image/png' }),
    });
    history.replaceState(null, '', '/orders/42?token=abc#/details');
    document.title = 'Order 42';

    await reporter.report(new Error('render failed'));

    const [report] = sink.reports;
    expect(report!.page).toEqual({
      url: expect.stringMatching(/\/orders\/42\?token=\[redacted\]#\/details$/u),
      title: 'Order 42',
    });
    expect(report!.client).toMatchObject({ language: expect.any(String), viewport: expect.any(Object) });
    expect(report!.screenshot).toMatchObject({
      type: 'image/png',
      dataUrl: expect.stringMatching(/^data:image\/png/u),
    });
    expect(report!.fingerprint).toEqual(['atlas', 'Error', '/details']);
  });
});
