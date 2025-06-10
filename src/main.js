// Bootstrap
import 'bootstrap/dist/css/bootstrap.min.css'
import '@fortawesome/fontawesome-free/css/all.min.css' // FontAwesome
import 'bootstrap' // JS de Bootstrap (para tooltips, modals, etc.)
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// main.js o App.vue (en <script setup>)
import { defineAsyncComponent } from 'vue'

// Esto precarga la vista como si fuera usada
defineAsyncComponent(() => import('@/views/Admin/EventsView.vue'))


const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
