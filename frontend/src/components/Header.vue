<template>
  <header class="app-header">
    <div class="header-left">
      <img src="@/assets/logo/logo-Interactomes.png" alt="Logo Interactomes" class="logo" />
      <h1 class="title">Interactomes</h1>
    </div>
    <div class="header-right">
      <button class="profile-button" aria-label="Profil">
        <svg xmlns="http://www.w3.org/2000/svg" class="icon-profile" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" />
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup>
// Pas besoin d'importer l'image si elle est utilisée dans src (par chemin relatif)
</script>

<style scoped>
.app-header {
  width: 100%;
  padding: 1rem 2rem;
  background-color: #1e1e1e;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #333;
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  height: 60px;
  margin-right: 1rem;
}

.title {
  color: #fff;
  font-size: 1.5rem;
  font-weight: bold;
}

.header-right {
  display: flex;
  align-items: center;
}

.profile-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: #fff;
}

.icon-profile {
  width: 28px;
  height: 28px;
}
</style>
