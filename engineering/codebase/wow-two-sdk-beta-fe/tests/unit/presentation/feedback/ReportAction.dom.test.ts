import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import ReportAction, { toReference } from '@src/presentation/feedback/reportAction/ReportAction.vue';
import ToastHost, { toastHost } from '@src/presentation/feedback/toastHost/ToastHost.vue';
import FeedbackToastHost from '@src/presentation/feedback/feedbackToastHost/FeedbackToastHost.vue';
import { createFeedbackBus, feedbackQueryErrors } from '@src/feedback';
import { ApiFailureFactory, type ApiFailure } from '@src/foundation/http';
import { createReporter, memoryReportSink, ReportDeliveryError, type ReportSend } from '@src/reporting';

const wrappers: VueWrapper[] = [];

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  toastHost.dismissAll();
  document.body.innerHTML = '';
});

const Receipt = { id: '0190a3b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b' } as const;

const action = (send: ReportSend) => {
  const wrapper = mount(ReportAction, { props: { send }, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
};

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};

describe('ReportAction', () => {
  it('walks Report → Sending… → Reported with the reference, sending once', async () => {
    const pending = deferred<typeof Receipt>();
    const send = vi.fn<ReportSend>(() => pending.promise);
    const wrapper = action(send);
    const button = wrapper.get('button');
    expect(button.text()).toContain('Report');

    await button.trigger('click');
    expect(wrapper.attributes('data-state')).toBe('sending');
    expect(button.text()).toContain('Sending…');
    expect(document.activeElement).toBe(button.element);
    await button.trigger('click');

    pending.resolve(Receipt);
    await flushPromises();
    expect(wrapper.attributes('data-state')).toBe('sent');
    expect(button.text()).toContain('Reported');
    expect(button.attributes('aria-disabled')).toBe('true');
    expect(wrapper.get('[role="status"]').text()).toBe('Report sent. Ref 3E4F5A6B');
    await button.trigger('click');
    expect(send).toHaveBeenCalledOnce();
    expect(wrapper.emitted('sent')).toEqual([[Receipt]]);
  });

  it('offers a retry when delivery fails, and sends again', async () => {
    const send = vi
      .fn<ReportSend>()
      .mockRejectedValueOnce(new ReportDeliveryError(0))
      .mockResolvedValue({ id: 'FB-12' });
    const wrapper = action(send);

    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(wrapper.attributes('data-state')).toBe('failed');
    expect(wrapper.get('button').text()).toContain('Retry');
    expect(wrapper.get('[role="status"]').text()).toBe("Couldn't send");

    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(send).toHaveBeenCalledTimes(2);
    expect(wrapper.get('[role="status"]').text()).toContain('Ref FB-12');
  });

  it('resets for a new incident and ignores the old one settling late', async () => {
    const first = deferred<typeof Receipt>();
    const wrapper = action(() => first.promise);
    await wrapper.get('button').trigger('click');
    await wrapper.setProps({ send: () => Promise.resolve({ id: 'FB-2' }) });
    expect(wrapper.attributes('data-state')).toBe('idle');
    first.resolve(Receipt);
    await flushPromises();
    expect(wrapper.attributes('data-state')).toBe('idle');
  });

  it('shortens a GUID reference to its random tail and keeps any other id', () => {
    expect(toReference(Receipt.id)).toBe('3E4F5A6B');
    expect(toReference('FB-12')).toBe('FB-12');
  });
});

describe('one-click reports on toasts', () => {
  it('puts a Report action on a toast that carries a send', async () => {
    const wrapper = mount(ToastHost, { attachTo: document.body });
    wrappers.push(wrapper);
    const send = vi.fn<ReportSend>(async () => Receipt);
    toastHost.toast({ title: 'Deploy failed', severity: 'danger', report: send });
    await nextTick();
    await nextTick();

    const report = document.querySelector<HTMLElement>('[data-report-ignore] button')!;
    report.click();
    await flushPromises();
    expect(send).toHaveBeenCalledOnce();
    expect(document.querySelector('[role="status"]:not([aria-live])')?.textContent).toContain('3E4F5A6B');
  });

  it('carries a failed query all the way from the bridge to a delivered report', async () => {
    const bus = createFeedbackBus();
    const sink = memoryReportSink();
    const reporter = createReporter({ app: { name: 'wheelhouse' }, sink });
    const wrapper = mount(FeedbackToastHost, { props: { bus }, attachTo: document.body });
    wrappers.push(wrapper);
    const onError = feedbackQueryErrors(bus, { reporter });

    const failure: ApiFailure = {
      ...ApiFailureFactory.create('http', { status: 500, headers: new Headers() }, { traceId: 'abc' }),
      request: { method: 'GET', url: '/api/servers' },
    };
    onError(failure);
    onError(ApiFailureFactory.create('validation'));
    await nextTick();
    await nextTick();

    const reports = document.querySelectorAll<HTMLElement>('[data-report-ignore] button');
    expect(reports).toHaveLength(1);
    reports[0]!.click();
    await flushPromises();
    expect(sink.reports).toHaveLength(1);
    expect(sink.reports[0]).toMatchObject({
      app: { name: 'wheelhouse' },
      error: { status: 500, traceId: 'abc' },
      request: { method: 'GET', url: '/api/servers', status: 500 },
    });
  });
});
