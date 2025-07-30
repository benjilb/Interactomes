<template>
  <div class="protein-info" v-if="protein">
    <h3>Protein Information</h3>
    <ul>
      <li><strong>Uniprot ID:</strong> {{ protein.uniprot_id }}</li>
      <li><strong>Name:</strong> {{ protein.protein_name }}</li>
      <li><strong>Gene:</strong> {{ protein.gene_name }}</li>
      <li><strong>Organism:</strong> {{ protein.organism }}</li>
      <li><strong>Organism ID:</strong> {{ protein.organism_id }}</li>
      <li class="sequence-header">
        <div class="seq-label">
          <strong>Sequence:</strong>
          <span class="seq-size">{{ protein.sequence.length }} amino acids</span>
        </div>
        <pre class="sequence" v-html="styledSequence"></pre>

        <div class="legend">
          <div class="legend-item">
            <span class="legend-color intra"></span> Intraprotein
          </div>
          <div class="legend-item">
            <span class="legend-color inter"></span> Interprotein
          </div>
          <div class="legend-item">
            <span class="legend-color both"></span> Intra + Inter
          </div>
        </div>
      </li>


      <li><strong>Number of unique crosslinks: </strong> {{ crosslinkStats.uniqueCount }}</li>
      <li class="crosslink-sub">- Intra-protein Crosslinks: {{ crosslinkStats.intraCount }}</li>
      <li class="crosslink-sub">- Inter-protein Crosslinks: {{ crosslinkStats.interCount }}</li>
      <li><strong>Number of Crosslinks with copy:</strong> {{ crosslinkStats.crosslinkCount }}</li>

    </ul>
  </div>

  <div v-else class="placeholder">
    <p>Select a protein to see details.</p>
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
  }

})

const crosslinkMap = computed(() => {
  const map = {}
  const proteinId = protein?.uniprot_id
  if (!proteinId || !store.csvData) {
    console.log("Pas de proteinId ou csvData")
    return map
  }

  //console.log("Analyse des crosslinks pour :", proteinId)

  store.csvData.forEach((entry, index) => {
    const {
      Protein1,
      Protein2,
      AbsPos1,
      AbsPos2
    } = entry

/*
    if ( (!Protein1 || !Protein2 || !AbsPos1 || !AbsPos2 || isNaN(AbsPos1) || isNaN(AbsPos2)) && (Protein1 === proteinId || Protein2 === proteinId) ) {
      console.warn(`Crosslink ignoré à la ligne ${index + 1} : entrée invalide !`, entry)
      return
    }
*/
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
/*
  // Debug
  Object.entries(map).forEach(([pos, types]) => {
    console.log(`Pos ${pos} →`, Array.from(types).join(', '))
  })
*/
  return map
})

const crosslinkStats = computed(() => {
  const stats = {
    crosslinkCount: 0,
    uniqueCount: 0,
    intraCount: 0,
    interCount: 0
  };

  if (!protein?.uniprot_id || !store.csvData || !store.fastaData) return stats;

  const id = protein.uniprot_id.toUpperCase();
  const fastaMap = new Map(store.fastaData.map(p => [p.uniprot_id.toUpperCase(), true]));

  const uniqueSet = new Set();

  store.csvData.forEach(link => {
    const p1 = (link.Protein1 || '').trim().toUpperCase();
    const p2 = (link.Protein2 || '').trim().toUpperCase();
    const pos1 = parseInt(link.AbsPos1);
    const pos2 = parseInt(link.AbsPos2);

    // 🔎 Vérifie que les deux protéines existent dans le fasta
    if (!fastaMap.has(p1) || !fastaMap.has(p2)) return;
    // 🔎 Vérifie que les positions sont valides
    if (isNaN(pos1) || isNaN(pos2)) return;
    // 🔎 Ne concerne pas la protéine sélectionnée
    if (p1 !== id && p2 !== id) return;

    stats.crosslinkCount++; // total pour la protéine

    const [protA, protB] = p1 < p2 ? [p1, p2] : [p2, p1];
    const [absA, absB] = pos1 < pos2 ? [pos1, pos2] : [pos2, pos1];
    const key = `${protA}|${protB}|${absA}|${absB}`;

    if (!uniqueSet.has(key)) {
      uniqueSet.add(key);

      const isSameProtein = protA === protB && protA === id;
      const isInterProtein = (protA === id || protB === id) && protA !== protB;

      // 💡 On compte inter uniquement si positions ≠
      if (isSameProtein) {
        stats.intraCount++;
      } else if (isInterProtein && absA !== absB) {
        stats.interCount++;
      }
    }
  });

  stats.uniqueCount = uniqueSet.size;
  return stats;
});



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
      style = 'color: pink; font-weight: bold;'
    } else if (types?.has('intra')) {
      style = 'color: orange; font-weight: bold;'
    } else if (types?.has('inter')) {
      style = 'color: purple; font-weight: bold;'
    }
/*
    if (types) {
      console.log(`Surlignage Acide Aminé ${aa} at position ${pos} has: ${Array.from(types).join(', ')}`)
    }
*/
    return `<span style="${style}">${aa}</span>`
  }).join('')
})


</script>

<style scoped>
.protein-info {
  padding: 1rem;
  width: 100%;
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

.legend {
  display: flex;
  gap: 10px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  color: white;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 6px;
  display: inline-block;
}

/* Correspondance des couleurs avec le style de la séquence */
.legend-color.intra {
  background-color: orange;
}

.legend-color.inter {
  background-color: purple;
}

.legend-color.both {
  background-color: pink;
}

.sequence-header .seq-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.seq-size {
  color: #ccc;
  font-style: italic;
  font-size: 0.9rem;
}



</style>
