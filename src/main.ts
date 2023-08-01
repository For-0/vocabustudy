import { createApp, type Component } from 'vue';
import App from './App.vue';
import './assets/main.css';
import { createPinia } from 'pinia';
import createRouter from "./router";

const app = createApp(App as Component);
const pinia = createPinia();

app.use(pinia);
app.use(createRouter());

app.mount('#app');
