<template>
  <div style="max-width:400px; margin:40px auto;">
    <h2>Se connecter</h2>
    <form @submit.prevent="submit" style="display:grid; gap:8px;">
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Mot de passe" required />
      <button :disabled="loading" type="submit">
        {{ loading ? 'Connexion...' : 'Se connecter' }}
      </button>
      <p v-if="err" style="color:#e33">{{ err }}</p>
    </form>
    <p style="margin-top:10px;">
      Pas de compte ?
      <RouterLink to="/register">Créer un compte</RouterLink>
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { login, useAuth } from '../services/auth';
import { useRouter, useRoute } from 'vue-router';

const { loading } = useAuth();
const email = ref('');
const password = ref('');
const err = ref('');
const router = useRouter();
const route = useRoute();

async function submit() {
  err.value = '';
  try {
    await login({ email: email.value.trim(), password: password.value });
    const redirect = route.query.redirect || '/account';
    router.push(redirect);
  } catch (e) {
    err.value = e?.response?.data?.error || 'Échec de connexion';
  }
}
</script>
