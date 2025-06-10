<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import { ref } from 'vue'
import ModalCrearEvento from '@/components/Admin/Eventos/ModalCrearEvento.vue'

const abrir = ref(false)

function guardarEvento(data) {
  console.log('Datos del evento:', data)
  abrir.value = false
}
</script>

<template>
  <div class="d-flex">
    <Sidebar />

    <div class="flex-grow-1" style="min-height: 100vh">
      <PageHeaderRoute />

      <div class="p-4">
        <p>Eventos del admin</p>
        <button @click="abrir = true" class="bg-blue-600 text-white px-4 py-2 rounded-md">
          Crear Evento
        </button>
        <ModalCrearEvento :show="abrir" @close="abrir = false" @submit="guardarEvento" />
      </div>
    </div>
  </div>
</template>
