import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import UploadPage from '@/pages/UploadPage.vue';
import AccountPage from '../pages/Account.vue'

function requireAuth(to, from, next) {
    const tok = localStorage.getItem('token');
    if (!tok) return next({ name: 'login', query: { redirect: to.fullPath } });
    next();
}

const routes = [
    {
        path: '/',
        name: 'Home',
        component: HomePage
    },
    {
        name: 'account',
        path: '/account',
        component: AccountPage,
        beforeEnter: requireAuth
    },
    { path: '/upload',
        name: 'upload',
        component: UploadPage,
        beforeEnter: requireAuth
    },
    // src/router/index.js
    { path: '/graph/:datasetId', name: 'graph', component: () => import('../pages/GraphView.vue') }
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router
