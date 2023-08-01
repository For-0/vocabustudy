import { createApp } from 'vue';
import App from './App.vue';
import './assets/main.css';
import { createPinia } from 'pinia';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

const router = await import("./router"); // we need to import router after pinia is created because it uses pinia

app.use(router.default);

app.mount('#app');
