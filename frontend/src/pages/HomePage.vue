<template>
  <div class="home">
    <GraphiqueHomePage/>
  </div>
</template>

<script setup>
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
