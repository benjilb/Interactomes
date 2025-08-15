<template>
  <div class="upload-panel">
    <h2>Upload Files</h2>

    <div class="upload-section">
      <div>
        <label for="fasta-upload">Upload FASTA file:</label>
        <input
            id="fasta-upload"
            type="file"
            accept=".fasta,.fa"
            @change="handleFastaUpload"
        />
      </div>

      <div>
        <label for="csv-upload">Upload CSV file:</label>
        <input
            id="csv-upload"
            type="file"
            accept=".csv"
            @change="handleCsvUpload"
        />
      </div>
    </div>


    <div class="button-section">
      <button :disabled="!canGenerate" @click="generateGraph">Generate Graph</button>

      <button @click="generateGraphTest">Generate Graph Test</button>

    </div>
  </div>

  <div v-if="showGraph">
    <GraphView :refreshTrigger="refreshTrigger" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '@/store/dataStore'
import GraphView from "@/pages/GraphView.vue";
import { parseCsv } from '@/utils/CsvParser'
import { parseFasta } from '@/utils/FastaParser'

const store = useDataStore()
const showGraph = ref(false)

const refreshTrigger = ref(0)


const handleFastaUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  const content = await file.text()
  store.fastaData = parseFasta(content)
}

const handleCsvUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  const content = await file.text()
  store.csvData = parseCsv(content)
}

const canGenerate = computed(() => store.isFastaLoaded && store.isCsvLoaded)


const generateGraph = () => {
  refreshTrigger.value++  // Incrémente pour déclencher la maj dans GraphView
  showGraph.value = true
}

const generateGraphTest = async () => {
  try {
    const fastaResponse = await fetch('/test-data/uniprotkb_cyanophora_paradoxa_2024_02_20.fasta')
    store.fastaData = parseFasta(await fastaResponse.text())

    const csvResponse = await fetch('/test-data/cyanophoraXL_combmethod bis.csv')
    store.csvData = parseCsv(await csvResponse.text())

    generateGraph()
  } catch (error) {
    console.error("Erreur lors du chargement des fichiers de test :", error)
  }
}
</script>

<style scoped>

.upload-panel {

  padding-top: 0px; /* Enlève l'espace intérieur en haut */
  padding-bottom: 30px;
  padding-left: 30px;
  padding-right: 30px;
  position: relative;
  background: linear-gradient(135deg, #59595c, #1d3467);
  border: 2px solid #59595c;
  border-radius: 14px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  max-width: 700px;
  text-align: center;
  margin-top: 0;
}

.upload-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url('https://www.transparenttextures.com/patterns/paper-fibers.png');
  opacity: 0.1;
  pointer-events: none;
  border-radius: 12px;
  margin: 0;
  margin-top: 5px;
}

h2 {
  font-size: 1.2rem; /* ou une autre taille plus petite */
  margin-top: 10px;  /* réduit l'espace avec le haut */
  margin-bottom: 10px; /* réduit l'espace en dessous aussi */
}

.upload-section {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 20px;
}

.upload-section div {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.button-section {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.upload-panel button {
  flex: 1;
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.upload-panel button:hover {
  background-color: #45a049;
}

.upload-panel button:disabled {
  background-color: #9e9e9e;
  cursor: not-allowed;
}
</style>
