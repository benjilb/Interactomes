<template>
  <nav style="display:flex; gap:12px; align-items:center; padding:10px; border-bottom:1px solid #333;">
    <RouterLink to="/">Accueil</RouterLink>
    <RouterLink to="/account">Mon compte</RouterLink>

    <div style="margin-left:auto; display:flex; gap:10px; align-items:center;">
      <template v-if="isLoggedIn">
        <span>👋 {{ user?.first_name }} {{ user?.last_name }}</span>
        <button @click="handleLogout">Se déconnecter</button>
      </template>
      <template v-else>
        <button @click="$emit('open-login')">Se connecter</button>
        <button @click="$emit('open-register')">Créer un compte</button>
      </template>
    </div>
  </nav>
</template>

<script setup>
import { useAuth } from '../services/auth';
import { useRouter } from 'vue-router';

defineEmits(['open-login','open-register']);

const { user, isLoggedIn, logout } = useAuth();
const router = useRouter();

function handleLogout() {
  logout();
  router.push('/');
}
</script>
