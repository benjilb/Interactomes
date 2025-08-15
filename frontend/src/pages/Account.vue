<template>
  <div style="max-width:600px; margin:40px auto;">
    <h2>Mon compte</h2>
    <div v-if="loading">Chargement…</div>
    <div v-else-if="user">
      <ul>
        <li><b>ID:</b> {{ user.id }}</li>
        <li><b>Prénom:</b> {{ user.first_name }}</li>
        <li><b>Nom:</b> {{ user.last_name }}</li>
        <li><b>Email:</b> {{ user.email }}</li>
        <li><b>Créé le:</b> {{ new Date(user.created_at).toLocaleString() }}</li>
      </ul>
    </div>
    <div v-else>
      <p>Non connecté.</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useAuth, me } from '../services/auth.js';

const { user, loading } = useAuth();

onMounted(async () => {
  try { await me(); } catch {}
});
</script>
