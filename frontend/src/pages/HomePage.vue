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
.home {
  text-align: center;
  padding: 3rem;
}
</style>
