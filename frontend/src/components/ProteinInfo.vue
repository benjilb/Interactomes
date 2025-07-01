<template>
  <div class="protein-info" v-if="protein">
    <h3>Proteine Informations</h3>
    <ul>
      <li><strong>Uniprot ID:</strong> {{ protein.uniprot_id }}</li>
      <li><strong>Name:</strong> {{ protein.protein_name }}</li>
      <li><strong>Sequence:</strong>
        <pre class="sequence">{{ protein.sequence }}</pre>
      </li>
    </ul>
  </div>
</template>

<script setup>
defineProps({
  protein: {
    type: Object,
    default: null
  }
})
</script>

<style scoped>
.protein-info {
  border-right: 1px solid #ccc;
  padding: 1rem;
  width: 300px;
  overflow: auto;
}

.sequence {
  white-space: pre-wrap;
  word-break: break-word;
  background: #f9f9f9;
  padding: 0.5rem;
  border-radius: 4px;
}
</style>
