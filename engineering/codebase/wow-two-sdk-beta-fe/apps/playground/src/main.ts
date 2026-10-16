import { createApp } from 'vue';
import App from './App.vue';
import './styles.css';
import { componentName, record } from './diagnostics';
import { installThemesCss } from './theme';

/* The themes stylesheet is emitted at BUILD time into `dist/themes.css`. The
   gallery runs against source, so it emits the same CSS at boot from the live
   registry — which also exercises the ported themes engine on every load. */
const disposeThemes = installThemesCss();

const app = createApp(App);

/* Vue's warnings go to the console AND into an in-page panel: prop-type
   mismatches and missing required props are exactly the class of defect a
   mount-only test suite cannot see, and scrolling a 200-section page while
   watching devtools is not a workflow. */
app.config.warnHandler = (msg, instance, trace) => {
  const where = componentName(instance, trace);
  record('warn', msg, where);
  console.warn(`[vue warn] ${where}: ${msg}${trace ? `\n${trace}` : ''}`);
};

app.config.errorHandler = (err, instance, info) => {
  const message = err instanceof Error ? `${err.message} (${info})` : `${String(err)} (${info})`;
  record('error', message, componentName(instance));
  console.error('[vue error]', err);
};

app.mount('#app');

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    app.unmount();
    disposeThemes();
  });
}
