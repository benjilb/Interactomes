<template>

  <div class="graph-page">
    <div class="protein-info-container">
      <ProteinInfo v-if="selectedProtein"
                   :protein="selectedProtein"
                   :crosslinkCount="crosslinkCount"
                   :intraCount="crosslinkIntraCount"
                   :interCount="crosslinkInterCount"
      />
    </div>

    <div class="graph-container">
      <h3>Crosslink Graph</h3>
      <div ref="cyContainer" class="cytoscape cytoscape-graph"></div>
      <div class="total-crosslinks">
        <p>Total crosslinks : {{ totalCrosslinkCount }}</p>
      </div>
    </div>

  </div>

</template>

<script setup>

import {ref,onMounted, onBeforeUnmount, nextTick} from 'vue'
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';

cytoscape.use(coseBilkent);
import { useDataStore } from '@/store/dataStore'
import ProteinInfo from '@/components/ProteinInfo.vue'


const cyContainer = ref(null);
let cy = null;
const store = useDataStore();
const selectedProtein = ref(null)
const crosslinkCount = ref(0);
const crosslinkIntraCount = ref(0);
const crosslinkInterCount = ref(0);
const totalCrosslinkCount = ref(0);




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
  const edgeMap = new Map();
  const involvedProteinIds = new Set();
  // Map FASTA par id en majuscule pour vérif rapide
  const fastaMap = new Map(fastaData.map(p => [p.uniprot_id.toUpperCase(), p]));

  const validLinks = csvData.filter(link => {
    const source = (link.Protein1 || '').trim().toUpperCase();
    const target = (link.Protein2 || '').trim().toUpperCase();
    return source && target && fastaMap.has(source) && fastaMap.has(target);
  });
  totalCrosslinkCount.value = validLinks.length;

  validLinks.forEach(link => {
    const source = (link.Protein1 || '').trim().toUpperCase();
    const target = (link.Protein2 || '').trim().toUpperCase();

    if (!source || !target) return;
    if (!fastaMap.has(source) || !fastaMap.has(target)) return;

    involvedProteinIds.add(source);
    involvedProteinIds.add(target);

    const key = source < target ? `${source}|${target}` : `${target}|${source}`;

    if (!edgeMap.has(key)) {
      edgeMap.set(key, { source, target, count: 1 });
    } else {
      edgeMap.get(key).count++;
    }

  });

  console.log(`Total protéines impliquées : ${involvedProteinIds.size}`);

    // Création des nœuds uniquement pour les protéines impliquées

  // Calculer degré pondéré des protéines (nœuds)
  const degreeMap = new Map();
  fastaData.forEach(p => {
    degreeMap.set(p.uniprot_id.toUpperCase(), 0);
  });
  edgeMap.forEach(({ source, target, count }) => {
    degreeMap.set(source, (degreeMap.get(source) || 0) + count);
    degreeMap.set(target, (degreeMap.get(target) || 0) + count);
  });

  // Normalisation des tailles des nœuds
  const degrees = Array.from(degreeMap.values());
  const minDegree = Math.min(...degrees);
  const maxDegree = Math.max(...degrees);
  const normalizeSize = degree => {
    const minSize = 20;
    const maxSize = 60;
    if (maxDegree === minDegree) return minSize;
    return minSize + ((degree - minDegree) / (maxDegree - minDegree)) * (maxSize - minSize);
  };

  // Créer nœuds avec taille normalisée
  const nodes = Array.from(involvedProteinIds)
      .filter(id => fastaMap.has(id))
      .map(id => {
        const degree = degreeMap.get(id) || 0;
        const size = normalizeSize(degree);
        return {
          data: {
            id,
            label: id,
            size
          }
        };
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
      name: 'cose-bilkent',
      animate: 'end',
      componentSpacing: 200,
      animationDuration: 1000,
      fit: false,
      padding: 100,
      randomize: false,
      nodeRepulsion: 45000,            // Augmente l'espacement entre nœuds
      idealEdgeLength: 150,            // Longueur cible des liens
      edgeElasticity: 0.4,             // Souplesse des liens
      nestingFactor: 0.9,              // Compacité des clusters
      gravity: 0.25,                   // Gravité vers le centre
      numIter: 3000,
      tile: true,
      tilingPaddingVertical: 10,
      tilingPaddingHorizontal: 10,
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
          'curve-style': 'bezier'
        }
      }
    ]
  });

  cy.ready(() => {
    forceCanvasAlignment();

    setTimeout(() => {
      forceCanvasAlignment();
      cy.resize();

      const baseZoom = 0.31;
      const zoomFactor = cy.nodes().length < 50 ? 1.5 : 1.1;

      cy.zoom(baseZoom * zoomFactor);
      const offsetX = (cy.width() / 2);
      const offsetY = cy.height() / 2;

      cy.pan({ x: offsetX, y: offsetY });

    }, 100);
  });



  cy.on('tap', 'node', evt => {
    const node = evt.target;
    const id = node.data('id').toUpperCase();

    selectedProtein.value = fastaMap.get(id) || null;

    // Calcul du vrai nombre de crosslinks depuis csvData brut
    crosslinkCount.value = validLinks.filter(link =>
        link.Protein1.trim().toUpperCase() === id ||
        link.Protein2.trim().toUpperCase() === id
    ).length;

    crosslinkIntraCount.value = validLinks.filter(link =>
        (link.Protein1 || '').trim().toUpperCase() === id &&
        (link.Protein2 || '').trim().toUpperCase() === id
    ).length;

    crosslinkInterCount.value = validLinks.filter(link =>
        (link.Protein1 || '').trim().toUpperCase() === id ^
        (link.Protein2 || '').trim().toUpperCase() === id
    ).length;
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
  margin-right: 300px;
}
.protein-info-container {
  width: 300px;
  min-width: 300px;
  max-width: 300px;
  overflow-y: auto;
  padding: 10px;
}

.graph-container {
  flex: 1;
  width: 1000px;
  height: 600px;
  position: relative;
  overflow: visible; /* éviter débordements */
}

.cytoscape {
  flex: 1;
  width: 100%;
  height: 100%; /* prendre toute la hauteur */
  border: 3px solid #ccc;
  position: relative;
  transform-style: preserve-3d;
}
.cytoscape-graph canvas {
  left: 0 !important;
}

.total-crosslinks {
  margin-top: 10px;
  font-weight: bold;
  font-size: 1.1em;
  color: #333;
}

</style>
