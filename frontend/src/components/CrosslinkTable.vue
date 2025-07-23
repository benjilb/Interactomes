<template>
  <div v-if="crosslinks?.length" class="crosslink-table">
    <h3 class="mb-2 text-lg font-semibold text-gray-700">
      Crosslinks pour {{ proteinLabel }}
    </h3>
    <DataTable :value="crosslinks" scrollable scrollHeight="600px" class="p-datatable-sm">
      <Column field="Protein1" header="Protein1" />
      <Column field="Protein2" header="Protein2" />
      <Column field="AbsPos1" header="AbsPos1" />
      <Column field="AbsPos2" header="AbsPos2" />
      <Column field="Score" header="Score" />
    </DataTable>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

const props = defineProps({
  selectedProtein: {
    type: Object,
    required: false,
    default: null
  },
  crosslinks: {
    type: Array,
    required: true,
  }

});

// Affiche le nom ou l'ID si pas de nom
const proteinLabel = computed(() =>
    props.selectedProtein?.gene_name || props.selectedProtein?.uniprot_id || 'Protéine sélectionnée'
);
</script>

<style scoped>

.crosslink-table {
  width: 100%;
  padding: 1rem;
  background: #242424;
  height: 800px;
}

.crosslink-table ::v-deep(.p-datatable-thead> tr > th) {
  background-color: #242424 !important;
  color: white;
  position: sticky;
  top: 0;
  z-index: 1;
}

.crosslink-table ::v-deep(.p-datatable-thead > tr > th),
.crosslink-table ::v-deep(.p-datatable-tbody > tr > td) {
  border-right: 1px solid #888; /* bordure verticale à droite de chaque cellule */
}

.crosslink-table ::v-deep(.p-datatable-thead > tr > th:first-child),
.crosslink-table ::v-deep(.p-datatable-tbody > tr > td:first-child) {
  border-left: 1px solid #888;
}
.crosslink-table ::v-deep(.p-datatable-thead > tr>th) {
  border-top: 1px solid #888;
}
</style>
