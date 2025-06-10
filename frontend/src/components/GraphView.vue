<template>
  <div class="graph-container">
    <h3>Crosslink Graph</h3>
    <div ref="cyContainer" class="cytoscape"></div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import cytoscape from 'cytoscape'
import { useDataStore } from '@/store/dataStore'

const cyContainer = ref(null);
const store = useDataStore();

onMounted(() => {
  const fastaData = store.fastaData;
  const csvData = store.csvData;
  console.log('csv data', csvData);

  if (!fastaData.length || !csvData.length) {
    console.warn('No data loaded for graph');
    return;
  }

  // Nodes from FASTA
  const nodes = fastaData.map(protein => ({
    data: {
      id: protein.uniprot_id,
      label: protein.protein_name || protein.uniprot_id
    }
  }))
  csvData.forEach((link, i) => {
    console.log(`Edge ${i}:`, link.Protein1, link.Protein2 )
  })

  const proteinIds = new Set(fastaData.map(p => p.uniprot_id.trim().toUpperCase()))
  // Edges from CSV crosslinks
  const edges = csvData.map((link, i) => {
        const source = link.Protein1.trim().toUpperCase();
        const target = link.Protein2.trim().toUpperCase();

        return {
          data: {
            id: `link-${i}`,
            source,
            target,
            label: `Pos1: ${link.AbsPos1 }, Pos2: ${link.AbsPos2}`
          }
        }
      })
      .filter(edge => proteinIds.has(edge.data.source) && proteinIds.has(edge.data.target))


  const invalidLinks = csvData.filter(link => {
    const source = link.Protein1;
    const target = link.Protein2;
    return !proteinIds.has(source) || !proteinIds.has(target)
  })

  console.warn('Invalid links (missing nodes):', invalidLinks)

  cytoscape({
    container: cyContainer.value,
    elements: {
      nodes,
      edges
    },
    style: [
      {
        selector: 'node',
        style: {
          label: 'data(label)',
          'background-color': '#0074D9',
          'text-valign': 'center',
          'color': '#fff',
          'text-outline-width': 2,
          'text-outline-color': '#0074D9'
        }
      },
      {
        selector: 'edge',
        style: {
          width: 2,
          'line-color': '#ccc',
          'target-arrow-color': '#ccc',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          label: 'data(label)',
          'font-size': '8px',
          'text-rotation': 'autorotate'
        }
      }
    ],
    layout: {
      name: 'cose', // force-directed layout
      animate: true
    }
  })
})
</script>

<style scoped>
.graph-container {
  margin-top: 2rem;
}

.cytoscape {
  width: 100%;
  height: 600px;
  border: 1px solid #ccc;
}
</style>
