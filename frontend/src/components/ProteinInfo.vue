<template>
  <div class="protein-info" v-if="protein">
    <h3>Proteine Informations</h3>
    <ul>
      <li><strong>Uniprot ID:</strong> {{ protein.uniprot_id }}</li>
      <li><strong>Name:</strong> {{ protein.protein_name }}</li>
      <li><strong>Gene:</strong> {{ protein.gene_name }}</li>
      <li><strong>Organism:</strong> {{ protein.organism }}</li>
      <li><strong>Organism ID:</strong> {{ protein.organism_id }}</li>
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
  padding: 1rem;
  width: 300px;
  overflow: auto;
  margin-top: 30px;
}

.protein-info ul {
  list-style: none;
  padding:0;
  margin: 0;
}

.protein-info li {
  margin-bottom: 0.5rem;
  text-align: left; /* Sécurité supplémentaire pour les li */
}

.sequence {
  white-space: pre-wrap;
  word-break: break-word;
  padding: 0.5rem;
  border-radius: 4px;

}

</style>
