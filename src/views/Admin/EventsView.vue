<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios';
import ModalCrearEvento from '@/components/Admin/Eventos/ModalCrearEvento.vue'
import AdminEventCard from '@/components/Admin/Eventos/AdminEventCard.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import { useRouter } from 'vue-router';

const router = useRouter();

const showCreateEditModal = ref(false)
const currentEventToEdit = ref(null)

const events = ref([])
const error = ref('')
const loading = ref(false)
const searchQuery = ref('')

const currentPage = ref(1)
const itemsPerPage = ref(12)
const totalEvents = ref(0) // This is where the total count from the backend will go

const totalPages = computed(() => Math.ceil(totalEvents.value / itemsPerPage.value))

async function fetchEvents() {
    const token = localStorage.getItem('token');

    if (!token) {
        error.value = 'Token de autenticación no encontrado.';
        loading.value = false;
        events.value = [];
        totalEvents.value = 0;
        return;
    }

    loading.value = true;
    error.value = '';

    const offset = (currentPage.value - 1) * itemsPerPage.value;
    let url = `${import.meta.env.VITE_URL_BACKEND}/api/eventos/limit-offset?limit=${itemsPerPage.value}&offset=${offset}`;

    if (searchQuery.value) {
        url += `&search=${searchQuery.value}`;
    }

    try {
        const response = await axios.get(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        // ⭐⭐⭐ KEY CHANGE HERE ⭐⭐⭐
        // Now that the backend returns { data: [...], total: N }
        events.value = Array.isArray(response.data.data) ? response.data.data : [];
        totalEvents.value = typeof response.data.total === 'number' ? response.data.total : 0;
        // ⭐⭐⭐ END KEY CHANGE ⭐⭐⭐

        error.value = null;

    } catch (err) {
        if (err.response) {
            console.error('Error del servidor (Axios):', err.response.data);
            const errorMessage = err.response.data?.message || err.response.statusText || `HTTP Error ${err.response.status}`;
            error.value = `Error al cargar los eventos: ${errorMessage}`;
        } else if (err.request) {
            console.error('No se recibió respuesta del servidor (Axios):', err.request);
            error.value = 'No se pudo conectar con el servidor. Verifique su conexión de red.';
        } else {
            console.error('Error al configurar la solicitud (Axios):', err.message);
            error.value = `Fallo en la solicitud: ${err.message}`;
        }
        events.value = [];
        totalEvents.value = 0;
    } finally {
        loading.value = false;
    }
}

watch(searchQuery, (newVal, oldVal) => {
    if (newVal !== oldVal) {
        currentPage.value = 1;
    }
    fetchEvents();
});

watch(currentPage, () => {
    fetchEvents();
});

onMounted(fetchEvents)

const openCreateModal = () => {
    currentEventToEdit.value = null;
    showCreateEditModal.value = true;
};

async function fetchEventDetailsForEdit(eventId) {
    const token = localStorage.getItem('token');
    if (!token) {
        error.value = 'Token de autenticación no encontrado.';
        return null;
    }

    loading.value = true;
    try {
        const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/eventos-cronogramas/${eventId}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });
        console.log('Detailed Event Data for Edit:', response.data);
        currentEventToEdit.value = response.data;
        showCreateEditModal.value = true;
        return response.data;
    } catch (err) {
        console.error('Error fetching detailed event for edit:', err.response?.data || err.message);
        error.value = `Error al cargar detalles del evento: ${err.response?.data?.message || err.message}`;
        return null;
    } finally {
        loading.value = false;
    }
}

const handleEditEvent = (eventData) => {
    if (eventData && eventData.id) {
        fetchEventDetailsForEdit(eventData.id);
    } else {
        console.error('No event ID found for editing.');
    }
};

const handleModalClose = () => {
    showCreateEditModal.value = false;
    currentEventToEdit.value = null;
};

const handleModalSubmit = async (emittedEventData) => {
    showCreateEditModal.value = false;
    currentEventToEdit.value = null;

    await fetchEvents();
    console.log('Event list refreshed after modal submission.');
};

const handleViewEvent = (eventId) => {
    router.push({ path: `/admin/eventos/${eventId}` });
};

const goToPage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
    }
};

const nextPage = () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++;
    }
};

const prevPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--;
    }
};
</script>

<template>
    <LoaderComponent v-if="loading"/>
    <div class="d-flex" style="height: 100vh; overflow: hidden">
        <Sidebar />

        <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
            <PageHeaderRoute />

            <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
                <div class="d-flex align-items-center mb-3 gap-2">
                    <input v-model="searchQuery" type="text" placeholder="Buscar por nombre" class="form-control"/>
                    <button class="btn btn-default" @click="openCreateModal">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <p v-if="error" class="error-text">{{ error }}</p>
                <div class="container">
                    <div class="row" v-if="!loading">
                        <div
                            class="col-12 col-sm-12 col-md-6 col-lg-3 mb-3"
                            v-for="event in events"
                            :key="event.id"
                        >
                            <AdminEventCard
                                :event="event"
                                @edit-event="handleEditEvent"
                                @view-event="handleViewEvent"
                            />
                        </div>
                        <div v-if="events.length === 0 && !loading" class="col-12 text-center text-muted mt-5">
                            No se encontraron eventos.
                        </div>
                    </div>
                    <div v-else class="text-center text-muted mt-5">
                        Cargando eventos...
                    </div>

                    <nav aria-label="Page navigation" v-if="totalPages > 1 && !loading">
                        <ul class="pagination justify-content-center">
                            <li class="page-item" :class="{ disabled: currentPage === 1 }">
                                <a class="page-link" href="#" @click.prevent="prevPage">Anterior</a>
                            </li>
                            <li class="page-item" v-for="page in totalPages" :key="page" :class="{ active: page === currentPage }">
                                <a class="page-link" href="#" @click.prevent="goToPage(page)">{{ page }}</a>
                            </li>
                            <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                                <a class="page-link" href="#" @click.prevent="nextPage">Siguiente</a>
                            </li>
                        </ul>
                    </nav>
                </div>
                <ModalCrearEvento
                    :show="showCreateEditModal"
                    :eventData="currentEventToEdit"
                    @close="handleModalClose"
                    @submit="handleModalSubmit"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
.error-text {
    color: red;
    font-weight: bold;
}

.form-control {
    flex-grow: 1;
}

.btn-default {
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    color: #495057;
}

.btn-default:hover {
    background-color: #e2e6ea;
    border-color: #dae0e5;
}

.pagination {
    margin-top: 20px;
}

.page-item.active .page-link {
    background-color: #174384;
    border-color: #174384;
    color: white;
}

.page-link {
    color: #174384;
}

.page-link:hover {
    color: #0d284a;
}
</style>
