<template>
  <div class="home">
    <h1>Welcome to Interactomes !</h1>
    <UploadPanel />
  </div>
</template>

<script setup>
import UploadPanel from '@/components/UploadPanel.vue'
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
