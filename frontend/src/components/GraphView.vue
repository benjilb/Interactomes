<template>

  <div class="graph-page">
    <ProteinInfo :protein="selectedProtein" />

    <div class="graph-container">
      <h3>Crosslink Graph</h3>
      <div ref="cyContainer" class="cytoscape cytoscape-graph"></div>

    </div>
  </div>
</template>

<script setup>

import {ref,onMounted, onBeforeUnmount, nextTick} from 'vue'
import cytoscape from 'cytoscape'
import { useDataStore } from '@/store/dataStore'
import { toRaw } from 'vue'
import ProteinInfo from '@/components/ProteinInfo.vue'


const cyContainer = ref(null);
let cy = null;
const store = useDataStore();
const selectedProtein = ref(null)


const handleResize = () => {
  if (cy) {
    cy.resize();
    cy.fit();
    cy.center();
  }
};
const forceCanvasAlignment = () => {
  if (!cy || !cyContainer.value) return;

  const canvases = cyContainer.value.querySelectorAll('canvas');
  canvases.forEach(canvas => {
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.transform = 'none';
  });
};
onMounted(async () => {
  const fastaData = store.fastaData;
  const csvData = store.csvData;

  if (!fastaData.length || !csvData.length) {
    console.warn('No data loaded for graph');
    return;
  }

  // Nodes from FASTA
  const nodes = fastaData.map(protein => ({
    data: {
      id: protein.uniprot_id,
      label: protein.uniprot_id
    }
  }));

  const proteinMap = new Map(fastaData.map(p => [p.uniprot_id.toUpperCase(), p]));

  const proteinIds = new Set(fastaData.map(p => (p.uniprot_id || '').trim().toUpperCase()));

  // Regroup edges by pair source-target
  const edgeMap = new Map();

  csvData.forEach((link) => {
    const source = (link.Protein1 || '').trim().toUpperCase();
    const target = (link.Protein2 || '').trim().toUpperCase();

    if (!proteinIds.has(source) || !proteinIds.has(target)) return;

    // Graphe non orienté : trier pour éviter doublons
    const key = [source, target].sort().join('--');

    if (!edgeMap.has(key)) {
      edgeMap.set(key, {
        count: 0,
        source,
        target,
        labels: []
      });
    }

    const edgeData = edgeMap.get(key);
    edgeData.count += 1;
    edgeData.labels.push(`Pos1: ${link.AbsPos1}, Pos2: ${link.AbsPos2}`);
  });
  const counts = Array.from(edgeMap.values()).map(e => e.count);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);

  const minWidth = 2;
  const maxWidth = 8;

  const normalizeWidth = (count) => {
    if (maxCount === minCount) return (minWidth + maxWidth) / 2; // cas où tous égaux
    return minWidth + ((count - minCount) / (maxCount - minCount)) * (maxWidth - minWidth);
  };

  // Construire edges uniques avec largeur variable
  const edges = Array.from(edgeMap.values()).map((edgeData, i) => ({
    data: {
      id: `link-${i}`,
      source: edgeData.source,
      target: edgeData.target,
      label: '',
      /*label: edgeData.labels.join('\n'),*/
      width: normalizeWidth(edgeData.count) /*2 + (edgeData.count - 1) * 2*/

    }
  }));

  await nextTick();

  cy = cytoscape({
    container: cyContainer.value,
    elements: [...nodes, ...edges],
    layout: {
      name: 'concentric',
      concentric: node => node.degree(),
      levelWidth: () => 2,
      padding: 20,
      animate: true
    },
    style: [
      {
        selector: 'node',
        style: {
          label: 'data(label)',
          'background-color': '#0074D9',
          'text-valign': 'center',
          color: '#fff',
          'text-outline-width': 2,
          'text-outline-color': '#0074D9'
        }
      },
      {
        selector: 'edge',
        style: {
          width: 'data(width)',
          'line-color': '#ccc',
          'target-arrow-shape': 'none',
          'target-arrow-color': 'none',
          'curve-style': 'bezier',
          label: 'data(label)', // ici ce sera vide, donc rien affiché
        }
      }

    ]
  });

  cy.ready(() => {
    forceCanvasAlignment();

    setTimeout(() => {
      forceCanvasAlignment();
      cy.resize();
      cy.fit();
    }, 100);
  });

  cy.on('tap', 'node', evt => {
    const node = evt.target;
    const id = node.data('id').toUpperCase();
    selectedProtein.value = proteinMap.get(id) || null;
  });

  window.addEventListener('resize', handleResize);
});


onBeforeUnmount(() => {
  if(cy) cy.destroy();
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped >
.graph-page {
  display: flex;
  height: calc(100vh - 50px);
}
/*.graph-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 500px;
  max-width: 100%;
  height: 100%;
  overflow: visible;
}*/

.graph-container {
  flex: 1;
  min-width: 600px; /* taille minimum */
  max-width: 900px; /* ou la taille max souhaitée */
  height: 600px; /* hauteur fixe */
  position: relative;
  overflow: visible; /* éviter débordements */
}
/*
.cytoscape {
  flex: 1;
  width: 100%;
  min-height: 0;
  border: 3px solid #ccc;
  position: relative;
  transform-style: preserve-3d;
  left: 0;

}*/

.cytoscape {
  width: 100%;
  height: 100%; /* prendre toute la hauteur */
  border: 3px solid #ccc;
  position: relative;
  left: 0;
}
.cytoscape-graph canvas {
  left: 0 !important;
}
</style>
