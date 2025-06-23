import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import EventosView from '../views/EventosView.vue'
import LogInView from '@/views/LogInView.vue'
import SignUpView from '@/views/SignUpView.vue'
import SobreNosotrosView from '@/views/SobreNosotrosView.vue'
import DashboardView from '@/views/Admin/DashboardView.vue'
import EventsView from '@/views/Admin/EventsView.vue'
import CuentaView from '@/views/CuentaView.vue'
import OrganizadoresView from '@/views/Admin/OrganizadoresView.vue'
import ProyectosView from '@/views/Admin/ProyectosView.vue'
import EventDetailView from '@/views/Admin/EventDetailView.vue'


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
    },
    {
      path: '/admin/organizadores',
      name: 'Organizadores',
      component: OrganizadoresView,
      meta: {
        title: 'Organizadores',
      },
    },
    {
      path: '/admin/proyectos',
      name: 'Proyectos',
      component: ProyectosView,
      meta: {
        title: 'Proyectos',
      },
    },
    {
      path: '/admin/eventos/:id',
      name: 'Detalle evento',
      component: EventDetailView,
      props: true,
      meta: {
        title: 'Eventos - id',
      },
    },
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
