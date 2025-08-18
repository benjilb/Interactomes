<!-- App.vue -->
<template>
  <Header
      class="app-header-fixed"
      :isLoggedIn="isLoggedIn"
      :user="user"
      @open-login="showLogin = true"
      @open-register="showRegister = true"
      @go-profile="router.push('/account')"
      @logout="doLogout"
  />

  <main class="app-main" :class="{ 'no-gutters': isGraph }">
    <div class="container" :class="{ 'no-gutters': isGraph }">
      <RouterView />
    </div>
  </main>

  <LoginModal v-if="showLogin" @close="showLogin = false" @success="onAuthSuccess" />
  <RegisterModal v-if="showRegister" @close="showRegister = false" @success="onAuthSuccess" />
</template>

<script setup>
import {computed, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import Header from './components/Header.vue'
import LoginModal from './components/Auth/LoginModal.vue'
import RegisterModal from './components/Auth/RegisterModal.vue'

const route = useRoute()
const router = useRouter()


const isGraph = computed(() => route.name === 'graph')


const showLogin = ref(false)
const showRegister = ref(false)

// État d'auth (exemple)
const isLoggedIn = ref(false)
const user = ref(null)

function onAuthSuccess(payload){
  // payload: { user: {first_name, last_name, ...}, token, ... } selon ton implémentation
  isLoggedIn.value = true
  user.value = payload?.user ?? user.value
  showLogin.value = false
  showRegister.value = false
  router.push('/account')
}

function doLogout(){
  // nettoie le token/store ici
  isLoggedIn.value = false
  user.value = null
  router.push('/')
}
</script>