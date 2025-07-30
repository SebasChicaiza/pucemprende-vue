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
import CrearProyectosView from '@/views/Admin/CrearProyectosView.vue'
import UsersView from '@/views/Admin/UsersView.vue'
import UserGlobal from '@/views/Admin/UserGlobal.vue'
import UserEvent from '@/views/Admin/UserEvent.vue'
import FormsView from '@/views/Admin/FormsView.vue'
import UserManagement from '@/views/Admin/UserManagement.vue'


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
    {
      path: '/admin/crearProyecto/:eventoId',
      name: 'crearProyecto',
      component: CrearProyectosView,
      props: true,
    },
    {
      path: '/admin/usuarios',
      name: 'Usuarios',
      component: UsersView,
      meta: {
        title: 'Usuarios',
      },
    },
    {
      path: '/admin/usuarios/generales',
      name: 'UsuariosSistema',
      component: UserGlobal,
      meta: {
        title: 'Usuarios - Usuarios del Sistema',
      },
    },
    {
      path: '/admin/usuarios/eventos',
      name: 'UsuariosEventos',
      component: UserEvent,
      meta: {
        title: 'Usuarios - Usuarios de Eventos',
      },
    },

    {
      path: '/admin/formularios',
      name: 'Formularios',
      component: FormsView,
      meta: {
        title: 'Formularios',
      },
    },
    {
      path: '/admin/proyectos/:id',
      name: 'ProyectoDetalle',
      component: () => import('@/views/Admin/ProyectoDetalleView.vue'),
      meta: {
        title: 'Proyecto Detalle',
      },
    },
    {
      path: '/admin/usuario',
      name: 'Usuario',
      component: UserManagement,
      meta: {
        title: 'Usuario',
      },
    },
    {
      path: '/admin/proyectos/:id/editar',
      name: 'ProyectoEditar',
      component: () => import('@/views/Admin/ProyectoFormulario.vue'),
      meta: {
        title: 'Editar Proyecto',
      },
    },


  ],
})

export default router
