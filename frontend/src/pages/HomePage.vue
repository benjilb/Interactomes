<template>
  <div class="home">
    <section style="max-width:800px; margin:40px auto;">
      <h1>Bienvenue 👋</h1>
      <p>Cette page est publique. Vous pouvez consulter le site sans être connecté.</p>
      <ul>
        <li>Créez un compte ou connectez-vous via les boutons en haut.</li>
        <li>Une fois connecté, accédez à <RouterLink to="/account">Mon compte</RouterLink>.</li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import UploadPanel from '@/components/UploadPanel.vue'
import Header from "@/components/Header.vue";
import GraphiqueHomePage from "@/components/GraphiqueHomePage.vue";

</script>

<style scoped>
h1 {
  margin-top: 0;
}

/* Home.vue */
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* width: 100vw; height: 100vh;  ← SUPPRIMER */
  width: 100%;
  min-height: calc(100vh - var(--header-height)); /* cohérent avec les autres pages */
  box-sizing: border-box;
}

</style>
