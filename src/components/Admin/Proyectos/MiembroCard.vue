<template>
  <div class="miembro-card">
    <div class="icono">
      <span>{{ iniciales }}</span>
    </div>
    <div class="info">
      <h6>{{ miembro.nombre }}</h6>
      <small>{{ miembro.rol }}</small>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  miembro: {
    type: Object,
    required: true,
  },
})

const iniciales = props.miembro.nombre
  .split(' ')
  .map((n) => n[0])
  .join('')
</script>

<style scoped>
.miembro-card {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: #174384;
  color: white;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.icono {
  background: #fff3;
  color: white;
  font-weight: bold;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.info h6 {
  margin: 0;
  font-size: 0.95rem;
}
.info small {
  font-size: 0.8rem;
  color: #cbe2ff;
}
</style>
