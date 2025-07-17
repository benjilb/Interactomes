import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import './assets/global.css'
import PrimeVue from 'primevue/config';



const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(PrimeVue);
app.mount('#app');
