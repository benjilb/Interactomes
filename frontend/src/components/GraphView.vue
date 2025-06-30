<template>
  <h3>Crosslink Graph</h3>

  <div class="graph-container">

    <div ref="cyContainer" class="cytoscape cytoscape-graph"></div>

  </div>
</template>

<script setup>

import {onMounted, ref, onBeforeUnmount, nextTick} from 'vue'
import cytoscape from 'cytoscape'
import { useDataStore } from '@/store/dataStore'
import { toRaw } from 'vue'

const cyContainer = ref(null);
let cy = null;
const store = useDataStore();

const handleResize = () => {
  if (cy) {
    cy.resize();
    cy.fit();
    //cy.center();
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
      label: protein.protein_name || protein.uniprot_id
    }
  }))
  /*  csvData.forEach((link, i) => {
    console.log(`Edge ${i}:`, link.Protein1, link.Protein2 )
  })*/

  //toutes les proteines du fasta sont stocke dans proteinIds
  const proteinIds = new Set(fastaData.map(p => (p.uniprot_id || '').trim().toUpperCase()));
  // Edges from CSV crosslinks
  const edges = csvData.map((link, i) => {
    const source = (link.Protein1 || '').trim().toUpperCase();
    const target = (link.Protein2 || '').trim().toUpperCase();
    const isValid = proteinIds.has(source) && proteinIds.has(target);

    return {
          data: {
            valid: isValid,
            id: `link-${i}`,
            source,
            target,
            label: `Pos1: ${link.AbsPos1 }, Pos2: ${link.AbsPos2}`
          }
        }
      })
  console.log("proteinIds:", [...proteinIds].slice(0, 10)) // aperçu des IDs uniques
  console.log("First few links:", toRaw(csvData).slice(0, 5))

  /*
    console.log("FASTA uniprot_ids:", fastaData.map(p => p.uniprot_id))
    console.log("CSV Protein1 examples:", csvData.slice(0, 5).map(d => d.Protein1))
    console.log("CSV Protein2 examples:", csvData.slice(0, 5).map(d => d.Protein2))
  */

  const invalidEdges = edges.filter(e => !e.data.valid)
  if (invalidEdges.length > 0) {
    console.warn('Invalid edges found:', invalidEdges);
  }

  const validEdges = edges.filter(e => e.data.valid);
  console.log('validEdges:', validEdges);

  await nextTick();

  setTimeout(() => {
    if (cy) {
      cy.resize();
      cy.fit();
    }
  }, 100);

    cy = cytoscape({
      container: cyContainer.value,
      elements: [...nodes, ...validEdges],
      layout: {
        name: 'concentric',
        concentric: node => node.degree(),
        levelWidth: () => 2,
        padding: 10,
        animate: true
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
      ]
    });



    cy.ready(() =>
     {
       forceCanvasAlignment();

       setTimeout(() => {
         forceCanvasAlignment();
         cy.resize();
         cy.fit();
       }, 100);
     });
    window.addEventListener('resize', handleResize);

});

onBeforeUnmount(() => {
  if(cy) cy.destroy();
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped >

.graph-container {
  width: 100%;
  height: calc(100vh - 50px);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: clip;
}
.cytoscape {
  flex: 1;
  width: 100%;
  min-height: 0;
  border: 1px solid #ccc;
  /*border: 2px dashed red;*/
  position: relative;
  transform-style: preserve-3d;
  left: 0;

}
.cytoscape-graph canvas {
  left: 0 !important;
}

* {
  outline: 1px dashed rgba(0, 0, 255, 0.2);
}

</style>
