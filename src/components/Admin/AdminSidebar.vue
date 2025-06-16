<script setup>
import { ref } from 'vue'

const collapsed = ref(false)

function toggleSidebar() {
  collapsed.value = !collapsed.value
}

const userJsonString = localStorage.getItem('user');
let usernow = null;
if (userJsonString) {
  try {
    usernow = JSON.parse(userJsonString);
  } catch (e) {
    console.error("Error parsing user data from localStorage:", e);
  }
}
</script>


<template>
  <aside class="vh-100" z-index="1000">
    <nav :class="['h-100 d-flex flex-column bg-white border-end shadow-sm sidebar-container', { collapsed }]">

      <div class="p-3 d-flex justify-content-between align-items-center">
        <img
          src="@/assets/logos/pucemprende-logo-nofondo.png"
          class="transition-all logo"
          alt="Logo"
        />
        <i @click="toggleSidebar" :class="['fas', collapsed ? 'fa-angle-right' : 'fa-angle-left']" class="toggle-icon"></i>
      </div>

      <ul class="flex-grow-1 px-3 py-3 border-top list-unstyled">
        <li v-for="(item, index) in [
          { icon: 'fa-solid fa-home', text: 'Dashboard', route: '/admin/dashboard' },
          { icon: 'fa-regular fa-folder-open', text: 'Eventos', route: '/admin/eventos' },
          { icon: 'fa-solid fa-link', text: 'Proyectos', route: '/admin/proyectos' },
          { icon: 'fa-regular fa-file', text: 'Formularios', route: '/admin/formularios' },
          { icon: 'fa-solid fa-users', text: 'Equipos', route: '/admin/equipos' },
          { icon: 'fa-regular fa-user', text: 'Usuarios', route: '/admin/usuarios' },
          { icon: 'fa-regular fa-building', text: 'Organizaciones', route: '/admin/organizaciones' }
        ]" :key="index" class="sidebar-item">

          <router-link :to="item.route" class="d-flex align-items-center py-2 px-3 rounded text-decoration-none sidebar-link">
            <i :class="[item.icon, collapsed ? '' : 'me-2']"></i>
            <span :class="['transition-all sidebar-text sidebar-weight', collapsed ? 'collapsed-text' : 'expanded-text']">{{ item.text }}</span>
            <div v-if="collapsed" class="sidebar-tooltip">{{ item.text }}</div>
          </router-link>

        </li>
      </ul>



      <ul class="px-3 list-unstyled border-top pt-3">
        <li class="sidebar-item">
          <a href="#" class="d-flex align-items-center py-2 px-3 rounded text-decoration-none sidebar-link">
            <i class="fas fa-cog"></i>
            <span :class="['transition-all sidebar-text', collapsed ? 'collapsed-text' : 'expanded-text']">Ajustes</span>
            <div v-if="collapsed" class="sidebar-tooltip">Ajustes</div>
          </a>
        </li>

        <li class="sidebar-item">
          <a href="#" class="d-flex align-items-center py-2 px-3 rounded text-decoration-none sidebar-link text-muted small">
            <i class="fa-solid fa-user"></i>
            <div
              :class="['transition-all sidebar-text', collapsed ? 'collapsed-text' : 'expanded-text']"
              style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
            >
              <strong>{{ usernow.usuario }}</strong><br />
              <span class="sidebar-email">{{ usernow.email }}</span>
            </div>

            <div v-if="collapsed" class="sidebar-tooltip">Usuario</div>
          </a>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<style scoped>

.toggle-icon {
  cursor: pointer;
  font-size: 1rem;
  color: #555;
  transition: color 0.2s;
}
.toggle-icon:hover {
  color: #000;
}

.sidebar-container {
  transition: width 0.3s ease;
  width: 250px;
}
.sidebar-container.collapsed,
.sidebar-container.collapsed .sidebar-text {
  width: 80px;
}
.sidebar-weight {
  font-weight: 600;
}

.logo {
  width: 128px;
  transition: width 0.3s ease;
}
.sidebar-container.collapsed .logo {
  width: 40px;
}

.sidebar-link {
  color: #555;
  position: relative;
  transition: background 0.2s, color 0.2s;
}
.sidebar-link:hover {
  background-color: #e0e7ff;
  color: #3730a3;
}
.sidebar-link i {
  width: 20px;
}
.sidebar-text {
  overflow: hidden;
  white-space: nowrap;
  margin-left: 12px;
}
.sidebar-email {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.collapsed-text {
  width: 0;
  opacity: 0;
  pointer-events: none;
}
.expanded-text {
  width: auto;
  opacity: 1;
}

.sidebar-tooltip {

  position: absolute;
  left: 70px;
  background-color: #e0e7ff;
  color: #3730a3;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  top: 50%;
  transform: translateY(-50%) translateX(-10px);
  transition: opacity 0.2s, transform 0.2s;
  pointer-events: none;
  font-size: 0.85rem;
  z-index: 1000;
}
.sidebar-link:hover .sidebar-tooltip,
.sidebar-item:hover .sidebar-tooltip {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}


.router-link-exact-active {
  background-color: #e0e7ff;
  color: #3730a3;
}

.sidebar-link.router-link-exact-active {
  background-color: #e0e7ff;
  color: #3730a3;
}

</style>
