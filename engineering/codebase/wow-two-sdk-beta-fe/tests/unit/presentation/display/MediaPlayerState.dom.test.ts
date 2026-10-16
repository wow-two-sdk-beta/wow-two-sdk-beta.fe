import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import AudioPlayer from '@src/presentation/display/audioPlayer/AudioPlayer.vue';
import VideoPlayer from '@src/presentation/display/videoPlayer/VideoPlayer.vue';
const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.restoreAllMocks();
});

describe('native media state', () => {
  for (const [label, component, selector] of [
    ['audio', AudioPlayer, 'audio'],
    ['video', VideoPlayer, 'video'],
  ] as const) {
    it(`${label} waits for actual autoplay and clears stale progress on source changes`, async () => {
      const wrapper = mount(component, {
        props: { src: '/first.mp3', autoPlay: true, defaultVolume: 5, defaultPlaybackRate: NaN },
      });
      wrappers.push(wrapper);
      expect(wrapper.find('button[aria-label="Pause"]').exists()).toBe(false);
      const media = wrapper.get(selector).element as HTMLMediaElement;
      expect(media.volume).toBe(1);
      expect(media.playbackRate).toBe(1);
      Object.defineProperty(media, 'duration', { value: 120, configurable: true });
      media.currentTime = 30;
      await wrapper.get(selector).trigger('loadedmetadata');
      await wrapper.get(selector).trigger('timeupdate');
      await wrapper.get(selector).trigger('play');
      expect(wrapper.find('button[aria-label="Pause"]').exists()).toBe(true);
      expect(wrapper.get('input[type="range"]').attributes('max')).toBe('120');
      await wrapper.setProps({ src: '/second.mp3' });
      expect(wrapper.find('button[aria-label="Pause"]').exists()).toBe(false);
      expect(wrapper.get('input[type="range"]').attributes('max')).toBe('0');
      expect(wrapper.get('input[type="range"]').attributes('aria-valuetext')).toBe('0:00');
      Object.defineProperty(media, 'duration', { value: Infinity, configurable: true });
      await wrapper.get(selector).trigger('durationchange');
      expect(wrapper.get('input[type="range"]').attributes('max')).toBe('0');
    });
  }
  it('keeps controls visible while a keyboard action owns focus', async () => {
    const wrapper = mount(VideoPlayer, { props: { src: '/movie.mp4' } });
    wrappers.push(wrapper);
    await wrapper.get('video').trigger('play');
    const button = wrapper.get('button[aria-label="Pause"]');
    await button.trigger('focusin');
    await wrapper.trigger('mouseleave');
    expect(button.element.parentElement?.classList.contains('opacity-100')).toBe(true);
    await button.trigger('focusout');
    await wrapper.trigger('mouseleave');
    expect(button.element.parentElement?.classList.contains('opacity-0')).toBe(true);
  });
  it('toggles one subtitle language without taking ownership of metadata or chapter tracks', async () => {
    const wrapper = mount(VideoPlayer, {
      props: {
        src: '/movie.mp4',
        tracks: [
          { src: '/en.vtt', srcLang: 'en', label: 'English' },
          { src: '/fr.vtt', srcLang: 'fr', label: 'French', default: true },
        ],
      },
    });
    wrappers.push(wrapper);
    const english = { kind: 'captions', language: 'en', label: 'English', mode: 'disabled' };
    const french = { kind: 'subtitles', language: 'fr', label: 'French', mode: 'disabled' };
    const metadata = { kind: 'metadata', mode: 'hidden' };
    const chapters = { kind: 'chapters', mode: 'disabled' };
    Object.defineProperty(wrapper.get('video').element, 'textTracks', {
      value: [english, french, metadata, chapters],
      configurable: true,
    });
    await wrapper.get('video').trigger('loadedmetadata');
    expect([english.mode, french.mode, metadata.mode, chapters.mode]).toEqual([
      'hidden',
      'showing',
      'hidden',
      'disabled',
    ]);
    await wrapper.get('button[aria-label="Hide captions"]').trigger('click');
    expect([english.mode, french.mode, metadata.mode, chapters.mode]).toEqual([
      'hidden',
      'hidden',
      'hidden',
      'disabled',
    ]);
  });
  it('does not exit fullscreen owned by another element', async () => {
    const wrapper = mount(VideoPlayer, { props: { src: '/movie.mp4' } });
    wrappers.push(wrapper);
    const exit = vi.fn(async () => undefined);
    const request = vi.fn(async () => undefined);
    Object.defineProperty(document, 'fullscreenElement', { value: document.createElement('div'), configurable: true });
    Object.defineProperty(document, 'exitFullscreen', { value: exit, configurable: true });
    Object.defineProperty(wrapper.element, 'requestFullscreen', { value: request, configurable: true });
    await wrapper.get('button[aria-label="Enter fullscreen"]').trigger('click');
    await nextTick();
    expect(request).toHaveBeenCalledOnce();
    expect(exit).not.toHaveBeenCalled();
    Reflect.deleteProperty(document, 'fullscreenElement');
    Reflect.deleteProperty(document, 'exitFullscreen');
  });
});
