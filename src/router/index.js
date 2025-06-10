import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import EventosView from '../views/EventosView.vue'
import LogInView from '@/views/LogInView.vue'
import SignUpView from '@/views/SignUpView.vue'
import SobreNosotrosView from '@/views/SobreNosotrosView.vue'
import DashboardView from '@/views/Admin/DashboardView.vue'
import EventsView from '@/views/Admin/EventsView.vue'
import CuentaView from '@/views/CuentaView.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/eventos',
      name: 'eventos',
      component: EventosView,
    },
    {
      path: '/login',
      name: 'login',
      component: LogInView,
    },
    {
      path: '/registro',
      name: 'registro',
      component: SignUpView,
    },
    {
      path: '/sobreNosotros',
      name: 'sobreNosotros',
      component: SobreNosotrosView,
    },
    {
      path: '/admin/dashboard',
      name: 'adminDashboard',
      component: DashboardView,
      meta: {
        title: 'Dashboard',
      },
    },
    {
      path: '/admin/eventos',
      name: 'adminEventos',
      component: EventsView,
      meta: {
        title: 'Eventos',
      },
    },
    {
      path: '/cuenta',
      name: 'MiCuenta',
      component: CuentaView,
      meta: {
        title: 'Cuenta',
      },
    }
    /* EJEMPLO LAZY LOADING
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },*/
  ],
})

export default router
