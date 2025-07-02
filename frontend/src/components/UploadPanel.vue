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

    <!-- Bouton Generate Graph Test -->
    <button @click="generateGraphTest">
      Generate Graph Test
    </button>

    <!-- GraphView affiché dynamiquement -->
  </div>
    <div v-if="showGraph">
      <GraphView/>
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
  store.fastaData = parsed
}

const handleCsvUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  const content = await file.text()
  const parsed = parseCsv(content)
  console.log('CSV parsed:', parsed)
  store.csvData = parsed
}

const canGenerate = computed(() => store.isFastaLoaded && store.isCsvLoaded)

const generateGraphTest = async () => {
  try {
    const fastaResponse = await fetch('/test-data/uniprotkb_cyanophora_paradoxa_2024_02_20.fasta')
    const fastaContent = await fastaResponse.text()
    store.fastaData = parseFasta(fastaContent)

    const csvResponse = await fetch('/test-data/cyanophoraXL_combmethod bis.csv')
    const csvContent = await csvResponse.text()
    store.csvData = parseCsv(csvContent)

    showGraph.value = true
  } catch (error) {
    console.error("Erreur lors du chargement des fichiers de test :", error)
  }
}

</script>

<style scoped>

</style>
