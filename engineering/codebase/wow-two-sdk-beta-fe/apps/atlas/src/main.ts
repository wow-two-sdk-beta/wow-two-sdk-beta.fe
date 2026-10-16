import { createApp } from 'vue';
import App from './App.vue';
import './styles.css';
import { installTheme } from './theme';

const disposeTheme = installTheme();
const app = createApp(App);
app.mount('#app');

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    app.unmount();
    disposeTheme();
  });
}
