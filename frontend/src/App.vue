<template>
  <Navbar @open-login="showLogin = true" @open-register="showRegister = true" />
  <main style="padding:16px;">
    <RouterView />
  </main>

  <LoginModal
      v-if="showLogin"
      @close="showLogin = false"
      @success="onAuthSuccess"
  />
  <RegisterModal
      v-if="showRegister"
      @close="showRegister = false"
      @success="onAuthSuccess"
  />
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from './components/NavigationBar.vue';
import LoginModal from './components/Auth/LoginModal.vue';
import RegisterModal from './components/Auth/RegisterModal.vue';

const router = useRouter();
const showLogin = ref(false);
const showRegister = ref(false);

function onAuthSuccess() {
  // après login/register réussi : va vers /account
  router.push('/account');
}
</script>
