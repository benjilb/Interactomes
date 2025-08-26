<template>
  <Modal @close="$emit('close')">
    <h3 style="margin-top:0">Create an account</h3>
    <form @submit.prevent="submit" style="display:grid; gap:10px; margin-top:12px;">
      <input v-model="first_name" placeholder="First name" required />
      <input v-model="last_name" placeholder="Name" required />
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Password" required />
      <button :disabled="loading" type="submit">
        {{ loading ? 'Creation…' : "Sign up" }}
      </button>
      <p v-if="err" style="color:#e66; margin:0">{{ err }}</p>
    </form>
  </Modal>
</template>

<script setup>
import { ref } from 'vue';
import Modal from '../Modal.vue';
import { register, useAuth } from '@/services/auth.js';

const emit = defineEmits(['close','success']);
const { loading } = useAuth();

const first_name = ref('');
const last_name  = ref('');
const email      = ref('');
const password   = ref('');
const err        = ref('');

async function submit() {
  err.value = '';
  try {
    await register({
      first_name: first_name.value.trim(),
      last_name:  last_name.value.trim(),
      email:      email.value.trim(),
      password:   password.value
    });
    emit('success');
    emit('close');
  } catch (e) {
    err.value = e?.response?.data?.error || "Registration failed";
  }
}
</script>
