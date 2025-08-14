<template>
  <div class="home">

    <Header />
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

.home {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;

  height: 100vh;
  width: 100vw;

  box-sizing: border-box;
}
</style>
