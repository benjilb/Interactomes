<template>

  <div class="upload-panel">
    <h2>Upload Files</h2>

    <!-- FASTA upload -->
    <div>
      <label for="fasta-upload">Upload FASTA file:</label>
      <input
          id="fasta-upload"
          type="file"
          accept=".fasta,.fa"
          @change="handleFastaUpload"
      />
    </div>

    <!-- CSV upload -->
    <div>
      <label for="csv-upload">Upload CSV file:</label>
      <input
          id="csv-upload"
          type="file"
          accept=".csv"
          @change="handleCsvUpload"
      />
    </div>

    <!-- Bouton Generate -->
    <button
        :disabled="!canGenerate"
        @click="showGraph = true"
    >
      Generate Graph
    </button>

    <!-- GraphView affiché dynamiquement -->

    <div v-if="showGraph">
      <GraphView/>
    </div>
  </div>


</template>

<script setup>
import { ref, computed } from 'vue'
import { parseCsv } from '@/utils/CsvParser'
import { parseFasta } from '@/utils/FastaParser'
import { useDataStore } from '@/store/dataStore'
import GraphView from "@/components/GraphView.vue";

const store = useDataStore()
const showGraph = ref(false)

const handleFastaUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  const content = await file.text()
  const parsed = parseFasta(content)
  console.log('FASTA parsed:', parsed)
  store.fastaData = parseFasta(content)
}

const handleCsvUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  const content = await file.text()
  const parsed = parseCsv(content)
  console.log('CSV parsed:', parsed)
  store.csvData = parseCsv(content)
}

const canGenerate = computed(() => store.isFastaLoaded && store.isCsvLoaded)

</script>
