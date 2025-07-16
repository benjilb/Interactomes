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
        <pre class="sequence" v-html="styledSequence"></pre>
      </li>
      <li><strong>Number of unique crosslinks: </strong> {{ uniqueCount }}</li>
      <li class="crosslink-sub">- Intra-protein Crosslinks: {{ intraCount }}</li>
      <li class="crosslink-sub">- Inter-protein Crosslinks: {{ interCount }}</li>
      <li><strong>Number of Crosslinks with copy:</strong> {{ crosslinkCount }}</li>
    </ul>
  </div>

  <div v-else class="placeholder">
    <p>Sélectionnez une protéine pour voir les détails.</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useDataStore } from '@/store/dataStore'
const store = useDataStore();

const { protein } = defineProps({
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
  },
  uniqueCount: {
    type: Number,
    default: 0
  }
})

const crosslinkMap = computed(() => {
  const map = {}
  const proteinId = protein?.uniprot_id
  if (!proteinId || !store.csvData) {
    console.log("Pas de proteinId ou csvData")
    return map
  }

  console.log("Analyse des crosslinks pour :", proteinId)

  store.csvData.forEach((entry, index) => {
    const {
      Protein1,
      Protein2,
      AbsPos1,
      AbsPos2
    } = entry


    if ( (!Protein1 || !Protein2 || !AbsPos1 || !AbsPos2 || isNaN(AbsPos1) || isNaN(AbsPos2)) && (Protein1 === proteinId || Protein2 === proteinId) ) {
      console.warn(`Crosslink ignoré à la ligne ${index + 1} : entrée invalide !`, entry)
      return
    }

    const isIntra = Protein1 === Protein2

    if (Protein1 === proteinId) {
      const pos = Number(AbsPos1)
      if (!map[pos]) map[pos] = new Set()
      map[pos].add(isIntra ? 'intra' : 'inter')
    }

    if (Protein2 === proteinId) {
      const pos = Number(AbsPos2)
      if (!map[pos]) map[pos] = new Set()
      map[pos].add(isIntra ? 'intra' : 'inter')
    }
  })

  // Debug
  Object.entries(map).forEach(([pos, types]) => {
    console.log(`Pos ${pos} →`, Array.from(types).join(', '))
  })

  return map
})

const styledSequence = computed(() => {
  if (!protein?.sequence) {
    console.log("Pas de séquence protéique")
    return ''
  }

  return protein.sequence.split('').map((aa, idx) => {
    const pos = idx + 1
    const types = crosslinkMap.value[pos]

    let style = ''
    if (types?.has('intra') && types?.has('inter')) {
      style = 'color: green; font-weight: bold;'
    } else if (types?.has('intra')) {
      style = 'color: yellow; font-weight: bold;'
    } else if (types?.has('inter')) {
      style = 'color: blue; font-weight: bold;'
    }

    if (types) {
      console.log(`Surlignage Acide Aminé ${aa} at position ${pos} has: ${Array.from(types).join(', ')}`)
    }

    return `<span style="${style}">${aa}</span>`
  }).join('')
})


</script>

<style scoped>
.protein-info {
  padding: 1rem;
  width: 300px;
  overflow: auto;
  align-self: flex-start;
}
h3 {
  margin-top: 0;

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
