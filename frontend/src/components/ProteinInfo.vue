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
      <li><strong>Number of Crosslinks:</strong> {{ crosslinkCount }}</li>
      <li class="crosslink-sub">- Crosslinks Intra-protéine: {{ intraCount }}</li>
      <li class="crosslink-sub">- Crosslinks Inter-protéine: {{ interCount }}</li>    </ul>
  </div>


  <div v-else class="placeholder">
    <p>Sélectionnez une protéine pour voir les détails.</p>
  </div>
</template>

<script setup>
defineProps({
  protein: {
    type: Object,
    default: null
  },
  crosslinkCount: {
    type: Number,
    default: 0
  },
  intraCount: {
    type: Number,
    default: 0
  },
  interCount: {
    type: Number,
    default: 0
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
  background: #3e3e47;
  max-height: 200px;
  overflow: auto;
}
.placeholder {
  padding: 1rem;
  width: 300px;
  margin-top: 30px;
  color: #777;
}
.crosslink-sub {
  margin-left: 20px;
  font-size: 0.9em;
  color: gray;
}

</style>
