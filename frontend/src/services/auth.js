import { ref, computed } from 'vue';
import api from './api';

const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));
const token = ref(localStorage.getItem('token') || null);
const loading = ref(false);

function setAuth(u, t) {
    user.value = u;
    token.value = t;
    if (u) localStorage.setItem('user', JSON.stringify(u)); else localStorage.removeItem('user');
    if (t) localStorage.setItem('token', t); else localStorage.removeItem('token');
}

export async function register(payload) {
    // payload: { first_name, last_name, email, password }
    loading.value = true;
    try {
        const { data } = await api.post('/auth/register', payload);
        setAuth(data.user, data.token);
        return data.user;
    } finally {
        loading.value = false;
    }
}

export async function login(payload) {
    // payload: { email, password }
    loading.value = true;
    try {
        const { data } = await api.post('/auth/login', payload);
        setAuth(data.user, data.token);
        return data.user;
    } finally {
        loading.value = false;
    }
}

export async function me() {
    loading.value = true;
    try {
        const { data } = await api.get('/auth/me');
        setAuth(data.user, localStorage.getItem('token')); // garde le token
        return data.user;
    } finally {
        loading.value = false;
    }
}

export function logout() {
    setAuth(null, null);
}

export function useAuth() {
    const isLoggedIn = computed(() => !!token.value);
    return { user, token, loading, isLoggedIn, register, login, logout, me };
}
