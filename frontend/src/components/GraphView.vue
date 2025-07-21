<template>
  <input
      v-model="searchQuery"
      type="text"
      placeholder="search for a gene name, protein name, uniprot ID, sequence..."
      class="search-input"
  />
  <div class="graph-page">
    <div class="protein-info-container">
      <ProteinInfo :protein="selectedProtein" />
    </div>

    <div class="graph-container">
      <h3>Crosslink Graph</h3>

      <div id="cytoscape-wrapper">
        <div ref="cyContainer" class="cytoscape cytoscape-graph"></div>
        <div id="sequence-overlay"></div>
      </div>
      <div class="total-crosslinks">
        <p>Total crosslinks : {{ totalCrosslinkCount }}</p>
      </div>
    </div>
    <div class="crosslink-table-container">
      <CrosslinkTable
          v-show="selectedProtein && selectedProteinCrosslinks.length"
          :crosslinks="selectedProteinCrosslinks"
          :selectedProtein="selectedProtein"
      />
    </div>
  </div>

</template>

<script setup>
import {ref,onMounted, watch, onBeforeUnmount, nextTick} from 'vue'
import { useDataStore } from '@/store/dataStore'
import ProteinInfo from '@/components/ProteinInfo.vue'
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import CrosslinkTable from '@/components/CrosslinkTable.vue';

cytoscape.use(coseBilkent);

const props = defineProps({
  refreshTrigger: {
    type: Number,
    default: 0
  }
})
// References
const cyContainer = ref(null);
let cy = null;

const store = useDataStore();

const selectedProtein = ref(null)
const selectedProteinCrosslinks = ref([]);

const totalCrosslinkCount = ref(0);

const searchQuery = ref('');
const filteredProteinIds = ref([]);

// ===== Utils =====
const normalizeWidth = (count, min, max) => {
  const minWidth = 2, maxWidth = 8;
  if (min === max) return (minWidth + maxWidth) / 2;
  return minWidth + ((count - min) / (max - min)) * (maxWidth - minWidth);
};

const normalizeSize = (degree, min, max) => {
  const minSize = 20, maxSize = 60;
  if (max === min) return minSize;
  return minSize + ((degree - min) / (max - min)) * (maxSize - minSize);
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

// ===== Graph =====
const generateGraph = async () => {
  if (cy) {
    cy.destroy();
    cy = null;
  }

  const fastaData = store.fastaData;
  const csvData = store.csvData;

  if (!fastaData.length || !csvData.length) {
    console.warn('No data loaded for graph');
    return;
  }

  const fastaMap = new Map(fastaData.map(p => [p.uniprot_id.toUpperCase(), p]));
  const edgeMap = new Map();
  const involvedProteinIds = new Set();


  const validLinks = csvData.filter(link => {
    const source = (link.Protein1 || '').trim().toUpperCase();
    const target = (link.Protein2 || '').trim().toUpperCase();
    return source && target && fastaMap.has(source) && fastaMap.has(target);
  });

  totalCrosslinkCount.value = validLinks.length;

//Parcours des crosslinks valides pour : enregistrer les protéines impliquées (nœuds du graphe) construire une table d'arêtes unique (edgeMap) en regroupant les interactions symétriques
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
  const [minDegree, maxDegree] = [Math.min(...degrees), Math.max(...degrees)];



  // Créer nœuds avec taille normalisée
  const nodes = Array.from(involvedProteinIds)
      .filter(id => {
        if (!fastaMap.has(id)) return false;
        // ✅ Si on a un filtre actif, on limite les nœuds affichés
        if (filteredProteinIds.value.length > 0) {
          return filteredProteinIds.value.includes(id);
        }
        return true;
      })
      .map(id => {
        const size = normalizeSize(degreeMap.get(id), minDegree, maxDegree);
        const fastaEntry = fastaMap.get(id);
        const label = fastaEntry?.gene_name || id;
        return {
          data: {
            id,
            label,
            size
          }
        };
      });



  // Normaliser largeur des arêtes
  const edgeCounts = Array.from(edgeMap.values()).map(e => e.count);
  const [minCount, maxCount] = [Math.min(...edgeCounts), Math.max(...edgeCounts)];



  const edges = Array.from(edgeMap.values())
      .filter(({ source, target }) => {
        if (filteredProteinIds.value.length === 0) return true;
        return (
            filteredProteinIds.value.includes(source) &&
            filteredProteinIds.value.includes(target)
        );
      })
      .map((edgeData, i) => ({
        data: {
          id: `link-${i}`,
          source: edgeData.source,
          target: edgeData.target,
          label: '',
          width: normalizeWidth(edgeData.count,minCount , maxCount)
        }
      }));

  await nextTick();

  // Initialiser Cytoscape
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
      },
      {
        selector: 'node[type="frise"]',
        style: {
          shape: 'rectangle',
          width: 'data(sequenceLength)', // ou transforme en pixels selon une échelle
          height: 20,
          'background-color': '#222',
          'border-color': '#aaa',
          'border-width': 1,
          label: 'data(proteinId)',
          'text-valign': 'center',
          'text-halign': 'center',
          color: '#fff',
          'font-size': 10
        }
      },
      {
        selector: 'node.matched',
        style: {
          'background-color': 'green',
          'text-outline-color': 'green'
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
      const offsetX = cy.width() / 2;
      const offsetY = cy.height() / 2;
      cy.pan({ x: offsetX, y: offsetY });
    }, 100);
  });

  cy.on('tap', 'node', evt => {
    evt.preventDefault?.();

    cy.nodes().style('display', 'element').style('width', '40px').style('height', '40px').style('opacity', 1);
    cy.edges().style('display', 'element').style('opacity', 1);

    const node = evt.target;
    const id = node.data('id').toUpperCase();

    if (selectedProtein.value && selectedProtein.value.uniprot_id.toUpperCase() === id) {
      // Si on reclique, on ferme la frise
      cy.remove('#frise-node');
      cy.remove('edge[type="inter"]');
      cy.remove('edge[type="intra"]');
      selectedProtein.value = null;
      selectedProteinCrosslinks.value = [];
      return;
    }

    const fasta = store.fastaData.find(p => p.uniprot_id.toUpperCase() === id);
    if (!fasta || !fasta.sequence) {
      console.warn(`Séquence introuvable pour ${id}`);
      return;
    }

    selectedProtein.value = fasta;

    // 1. Filtrer les lignes du CSV impliquant la protéine sélectionnée
    let links = store.csvData.filter(link => {
      const p1 = (link.Protein1 || '').trim().toUpperCase();
      const p2 = (link.Protein2 || '').trim().toUpperCase();
      if (!p1 || !p2) return false;
      return p1 === id || p2 === id;
    });

// 2. Supprimer les doublons identiques sur la même protéine et positions
    const seen = new Map();

    links.forEach(link => {
      const p1 = (link.Protein1 || '').trim().toUpperCase();
      const p2 = (link.Protein2 || '').trim().toUpperCase();
      const abs1 = parseInt(link.AbsPos1);
      const abs2 = parseInt(link.AbsPos2);
      const score = parseFloat(link.Score) || 0;
      if (!p1 || !p2 || isNaN(abs1) || isNaN(abs2)) return;
      const protA = p1 < p2 ? p1 : p2;
      const protB = p1 < p2 ? p2 : p1;
      const posA = abs1 < abs2 ? abs1 : abs2;
      const posB = abs1 < abs2 ? abs2 : abs1;

      const key = `${protA}|${protB}|${posA}|${posB}`;

      if (!seen.has(key) || seen.get(key).score < score) {
        seen.set(key, {
          Protein1: p1,
          Protein2: p2,
          AbsPos1: abs1,
          AbsPos2: abs2,
          Score: score,
        });
      }
    });

// Trier par paire de protéines (ordre alpha)
    selectedProteinCrosslinks.value = Array.from(seen.values()).sort((a, b) => {
      const keyA = [a.Protein1, a.Protein2].sort().join('|');
      const keyB = [b.Protein1, b.Protein2].sort().join('|');
      return keyA.localeCompare(keyB);
    });


    // Supprimer ancienne frise et edges associés
    cy.remove('#frise-node');
    cy.remove('edge[type="inter"]');
    cy.remove('edge[type="intra"]');

    const position = node.renderedPosition();
    const sequenceLength = fasta.sequence.length;
    const pxPerAA = 0.5;
    const friseWidth = sequenceLength * pxPerAA;

    // Ajouter le nœud frise
    cy.add({
      group: 'nodes',
      data: {
        id: 'frise-node',
        label: id,
        type: 'frise',
        proteinId: id,
        sequenceLength: friseWidth
      },
      position: {
        x: position.x,
        y: position.y + 100
      },
      selectable: false,
      grabbable: false,
      locked: true
    });

    // Créer edges "virtuels" pour visualiser les crosslinks
    store.csvData.forEach((link, i) => {
      const p1 = (link.Protein1 || '').trim().toUpperCase();
      const p2 = (link.Protein2 || '').trim().toUpperCase();
      const pos1 = parseInt(link.AbsPos1);
      const pos2 = parseInt(link.AbsPos2);

      if (p1 === id && p2 === id) {
        // intra
        cy.add({
          group: 'edges',
          data: {
            id: `intra-${i}`,
            source: 'frise-node',
            target: 'frise-node',
            type: 'intra',
            abs1: pos1,
            abs2: pos2
          }
        });
      }

      if (p1 === id && p2 !== id) {
        const target = p2;
        const targetNode = cy.nodes().filter(n => n.data('id').toUpperCase() === target);
        if (targetNode.length) {
          cy.add({
            group: 'edges',
            data: {
              id: `inter-${i}`,
              source: 'frise-node',
              target: targetNode.id(),
              type: 'inter',
              abs: pos1
            }
          });
        }
      }

      if (p2 === id && p1 !== id) {
        const target = p1;
        const targetNode = cy.nodes().filter(n => n.data('id').toUpperCase() === target);
        if (targetNode.length) {
          cy.add({
            group: 'edges',
            data: {
              id: `inter-${i}`,
              source: 'frise-node',
              target: targetNode.id(),
              type: 'inter',
              abs: pos2
            }
          });
        }
      }
    });


  });
}



function filterGraph(query) {
  if (!cy) return;

  const fastaMap = new Map(store.fastaData.map(p => [p.uniprot_id.toUpperCase(), p]));

  if (!query) {
    // Si la recherche est vide → tout afficher, retirer les mises en évidence
    filteredProteinIds.value = [];
    cy.nodes().forEach(node => {
      node.style('display', 'element');
      node.removeClass('matched');
    });
    cy.edges().style('display', 'element');
    return;
  }

  // 🔍 Protéines qui correspondent au texte saisi
  const matchedProteins = store.fastaData.filter(p => {
    const fields = [
      p.uniprot_id,
      p.protein_name,
      p.gene_name,
      p.organism,
      p.organism_id,
      p.sequence
    ];
    return fields.some(field =>
        typeof field === 'string' && field.toLowerCase().includes(query)
    );
  });

  const matchedIds = new Set(matchedProteins.map(p => p.uniprot_id.toUpperCase()));
  const linkedIds = new Set();

  // 🔗 Trouver les voisines (protéines liées aux matches via des crosslinks)
  store.csvData.forEach(link => {
    const p1 = (link.Protein1 || '').trim().toUpperCase();
    const p2 = (link.Protein2 || '').trim().toUpperCase();
    if (matchedIds.has(p1)) linkedIds.add(p2);
    if (matchedIds.has(p2)) linkedIds.add(p1);
  });

  const finalVisibleIds = new Set([...matchedIds, ...linkedIds]);
  filteredProteinIds.value = Array.from(finalVisibleIds);

  // 🎯 Affichage et marquage des nœuds
  cy.nodes().forEach(node => {
    const id = node.id().toUpperCase();
    const visible = finalVisibleIds.has(id);
    node.style('display', visible ? 'element' : 'none');

    // Appliquer la mise en évidence (vert) uniquement aux correspondances directes
    if (matchedIds.has(id)) {
      node.addClass('matched');
    } else {
      node.removeClass('matched');
    }
  });

  // 🎯 Affichage des arêtes uniquement si les deux extrémités sont visibles
  cy.edges().forEach(edge => {
    const source = edge.data('source').toUpperCase();
    const target = edge.data('target').toUpperCase();
    const visible = finalVisibleIds.has(source) && finalVisibleIds.has(target);
    edge.style('display', visible ? 'element' : 'none');
  });
}

// ===== Resize handler =====
const handleResize = () => {
  if (cy) {
    cy.resize();
    cy.fit();
    cy.center();
  }
};

// ===== Lifecycle =====
onMounted(async () => {
  await generateGraph();
  window.addEventListener('resize', handleResize);
  if (cy) {
    cy.resize();
    cy.fit();
  }
});

watch(searchQuery, (newQuery) => {
  console.log(newQuery);
  filterGraph(newQuery.trim().toLowerCase());
});


watch(() => props.refreshTrigger, () => {
  generateGraph()
})


onBeforeUnmount(() => {
  if(cy) cy.destroy();
  window.removeEventListener('resize', handleResize);
});


</script>

<style scoped >
.graph-page {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  width: 100vw;
  min-height: 100vh;     /* ✅ permet de grandir si nécessaire */
  overflow: hidden;
}

.graph-container {
  flex: 1 1 auto;
  height: 100%;
  overflow: hidden;
  padding: 1rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}



.protein-info-container,
.crosslink-table-container{
  width: 20%;
  min-width: 220px;
  max-width: 400px;
  height: 100%;
  padding: 0.1rem;
  box-sizing: border-box;
  margin-top: 40px;
  overflow-y: auto;

}


.cytoscape-graph {
  flex: 1 1 auto;
  height: 100%;
  width: 100%;
  border: 3px solid #ccc;
  transform-style: preserve-3d;
}

.cytoscape-graph canvas {
  left: 0 !important;
}

#cytoscape-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

#sequence-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 100000000000000000000000000;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.total-crosslinks {
  margin-top: 10px;
  font-weight: bold;
  font-size: 1.1em;
  color: #333;
}


.search-input {
  width: 100%;
  max-width: 500px; /* Limite la largeur de la barre de recherche */
  padding: 10px 20px; /* Espacement interne pour rendre le texte plus lisible */
  font-size: 16px; /* Taille du texte */
  border: 2px solid #ccc; /* Bordure grise */
  border-radius: 30px; /* Coins arrondis */
  background-color: #424242; /* Couleur de fond claire */
  transition: border-color 0.3s ease, box-shadow 0.3s ease; /* Effet de transition pour les changements */
  outline: none; /* Enlève l'effet de contour par défaut */
}

.search-input:focus {
  border-color: #4CAF50; /* Bordure verte quand l'input est sélectionné */
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.4); /* Ombre autour de l'input */
}

.search-input::placeholder {
  color: #aaa; /* Couleur du texte de placeholder */
  font-style: italic; /* Style en italique */
}



</style>
