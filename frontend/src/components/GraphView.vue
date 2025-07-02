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

  // Ensemble des protéines (IDs en majuscule)
  const proteinIds = new Set(fastaData.map(p => (p.uniprot_id || '').trim().toUpperCase()));

  // Map pour retrouver la protéine par ID
  const proteinIdMap = new Map(fastaData.map(p => [p.uniprot_id.toUpperCase(), p]));

  // Regrouper les arêtes entre mêmes protéines, compter les crosslinks
  const edgeMap = new Map();

  csvData.forEach(link => {
    const source = (link.Protein1 || '').trim().toUpperCase();
    const target = (link.Protein2 || '').trim().toUpperCase();

    if (!proteinIds.has(source) || !proteinIds.has(target)) {
      return; // lien non valide
    }

    // Clé unique indépendamment de l’ordre source/target (pour graphe non orienté)
    const key = source < target ? `${source}|${target}` : `${target}|${source}`;

    if (!edgeMap.has(key)) {
      edgeMap.set(key, { source, target, count: 1 });
    } else {
      edgeMap.get(key).count++;
    }
  });

  // Normaliser largeur des arêtes
  const counts = Array.from(edgeMap.values()).map(e => e.count);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);
  const minWidth = 2;
  const maxWidth = 8;


  const normalizeWidth = (count) => {
    if (maxCount === minCount) return (minWidth + maxWidth) / 2;
    return minWidth + ((count - minCount) / (maxCount - minCount)) * (maxWidth - minWidth);
  };

  // Calculer degré pondéré des protéines (nœuds)
  const degreeMap = new Map();
  fastaData.forEach(p => {
    degreeMap.set(p.uniprot_id.toUpperCase(), 0);
  });
  edgeMap.forEach(({ source, target, count }) => {
    degreeMap.set(source, (degreeMap.get(source) || 0) + count);
    degreeMap.set(target, (degreeMap.get(target) || 0) + count);
  });

  // Normaliser taille des nœuds
  const degrees = Array.from(degreeMap.values());
  const minDegree = Math.min(...degrees);
  const maxDegree = Math.max(...degrees);
  const minSize = 20;
  const maxSize = 50;
  const normalizeSize = (deg) => {
    if (maxDegree === minDegree) return (minSize + maxSize) / 2;
    return minSize + ((deg - minDegree) / (maxDegree - minDegree)) * (maxSize - minSize);
  };

  // Créer nœuds avec taille normalisée
  const nodes = fastaData.map(protein => {
    const id = protein.uniprot_id.toUpperCase();
    const degree = degreeMap.get(id) || 0;
    const size = normalizeSize(degreeMap.get(id) || 0);
    return {
      data: {
        id,
        label: id,
        size
      }
    };
  });

  // Créer arêtes avec largeur normalisée, sans label
  const edges = Array.from(edgeMap.values()).map((edgeData, i) => ({
    data: {
      id: `link-${i}`,
      source: edgeData.source,
      target: edgeData.target,
      label: '',
      width: normalizeWidth(edgeData.count) /*2 + (edgeData.count - 1) * 2*/
    }
  }));
  await nextTick();

  cy = cytoscape({
    container: cyContainer.value,
    elements: [...nodes, ...edges],
    layout: {
      name: 'cose',
      animate: true,
      padding: 10,               // plus d’espace autour du graphe
      nodeRepulsion: 100000000000000,       // double la répulsion pour plus d’espacement
      idealEdgeLength: 200000,      // liens plus longs
      edgeElasticity: 0.7,       // plus rigide (moins d’étirement)
      gravity: 0.15,             // moins d’attraction vers le centre
      numIter: 3000,             // plus d’itérations pour convergence
      tile: true,
      tilingPaddingVertical: 20,
      tilingPaddingHorizontal: 20
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
          'text-outline-color': '#0074D9',
          width: 'data(size)',
          height: 'data(size)'
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
          label: 'data(label)', // vide => rien affiché
          'font-size': '8px',
          'text-rotation': 'autorotate',
          'text-wrap': 'wrap',
          'text-max-width': 80
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
    selectedProtein.value = proteinIdMap.get(id) || null;
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
