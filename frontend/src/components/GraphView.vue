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

const fastaMap = new Map();
const edgeMap = new Map();
const degreeMap = new Map();
let minDegree = 0, maxDegree = 1;

let lastFriseNodeId = null;
let lastFriseForProtein = null;


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

function recreateGlobalEdges() {
  const edgeCounts = Array.from(edgeMap.values()).map(e => e.count);
  const [minCount, maxCount] = [Math.min(...edgeCounts), Math.max(...edgeCounts)];

  const edges = Array.from(edgeMap.values()).map((edgeData, i) => ({
    group: 'edges',
    data: {
      id: `link-${i}`,
      source: edgeData.source,
      target: edgeData.target,
      label: '',
      width: normalizeWidth(edgeData.count, minCount, maxCount)
    }
  }));

  cy.add(edges);
}


function buildGraphData() {
  fastaMap.clear();
  edgeMap.clear();
  degreeMap.clear();

  const fastaData = store.fastaData;
  const csvData = store.csvData;

  if (!fastaData.length || !csvData.length) {
    console.warn('No data loaded');
    return { nodes: [], edges: [] };
  }

  fastaData.forEach(p => fastaMap.set(p.uniprot_id.toUpperCase(), p));

  const involvedProteinIds = new Set();

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

    involvedProteinIds.add(source);
    involvedProteinIds.add(target);

    const key = source < target ? `${source}|${target}` : `${target}|${source}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, { source, target, count: 1 });
    } else {
      edgeMap.get(key).count++;
    }
  });

  // Calcul des degrés
  fastaData.forEach(p => degreeMap.set(p.uniprot_id.toUpperCase(), 0));
  edgeMap.forEach(({ source, target, count }) => {
    degreeMap.set(source, (degreeMap.get(source) || 0) + count);
    degreeMap.set(target, (degreeMap.get(target) || 0) + count);
  });

  const degrees = Array.from(degreeMap.values());
  [minDegree, maxDegree] = [Math.min(...degrees), Math.max(...degrees)];

  const nodes = Array.from(involvedProteinIds)
      .filter(id => {
        if (!fastaMap.has(id)) return false;
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
          data: { id, label, size }
        };
      });

  const edgeCounts = Array.from(edgeMap.values()).map(e => e.count);
  const [minCount, maxCount] = [Math.min(...edgeCounts), Math.max(...edgeCounts)];

  const edges = Array.from(edgeMap.values())
      .filter(({ source, target }) => {
        if (filteredProteinIds.value.length === 0) return true;
        return filteredProteinIds.value.includes(source) && filteredProteinIds.value.includes(target);
      })
      .map((edgeData, i) => ({
        data: {
          id: `link-${i}`,
          source: edgeData.source,
          target: edgeData.target,
          label: '',
          width: normalizeWidth(edgeData.count, minCount, maxCount)
        }
      }));

  return { nodes, edges };
}



// ===== Graph =====
const generateGraph = async () => {
  if (cy) {
    cy.destroy();
    cy = null;
  }

  const { nodes, edges } = buildGraphData();
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
        selector: 'node[label]',
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
        selector: 'edge[type="inter"]',
        style: {
          'line-color': '#c819fd',
          width: 2,
          label: 'data(label)',
          'font-size': 8,
          'text-rotation': 'autorotate',
          'curve-style': 'bezier'
        }
      },
      {
        selector: 'edge[type="intra"]',
        style: {
          'curve-style': 'unbundled-bezier',
          'control-point-distance': 30,
          'control-point-weight': 0.5,
          'loop-direction': -45,
          'loop-sweep': 60,
          'line-color': '#f39c12',
          width: 2,
          'target-arrow-shape': 'none',
          label: 'data(abs1)',
          'font-size': 6,
          'text-margin-y': -10
        }
      },
      {
        selector: 'node[type="frise"]',
        style: {
          shape: 'rectangle',
          width: 'data(sequenceLength)',
          height: 50,
          'background-color': '#000',
          'background-opacity': 0.15,
          'border-color': '#aaa',
          'border-width': 1,
          label: 'data(label)',
          'text-valign': 'center',
          'text-halign': 'left',
          'text-margin-x': -10,
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
      },
      {
        selector: 'node.ghost',
        style: {
          width: 0.1,
          height: 0.1,
          opacity: 0,
          'background-opacity': 0
        }
      },
      {
        selector: 'edge.flag-head',
        style: {
          'curve-style': 'straight',
          'target-arrow-shape': 'triangle',
          'target-arrow-color': '#f0a31a',
          'arrow-scale': 1.5,
          'line-color': '#f0a31a',
          'width': 2
        }
      },
      {
        selector: 'edge.flag-mast',
        style: {
          'curve-style': 'straight',
          'line-color': '#f0a31a',
          'width': 3,
          'target-arrow-shape': 'none'
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

    cy.on('dragfree', 'node', evt => {
      const dragged = evt.target;

      // Si aucun noeud sélectionné, on quitte
      if (!selectedProtein.value || !selectedProtein.value.uniprot_id) return;

      const selected = selectedProtein.value.uniprot_id.toUpperCase();
      const friseNode = cy.getElementById('frise-node');

      // Si le nœud déplacé est le nœud original (désormais supprimé), on ne fait rien
      if (dragged.data('id') !== selected) return;

      // Sinon, mettre à jour la position de la frise si elle existe
      if (friseNode.nonempty()) {
        const pos = dragged.position();
        friseNode.position({
          x: pos.x,
          y: pos.y + 120
        });
      }
    });


  });

  cy.on('tap', 'node', evt => {
    evt.preventDefault?.();

    cy.nodes().style('display', 'element').style('width', '40px').style('height', '40px').style('opacity', 1);
    cy.edges().style('display', 'element').style('opacity', 1);

    const node = evt.target;
    const rawId = node.data('id');
    // Ignore ghost nodes
    if (rawId.startsWith('ghost-') || rawId.startsWith('flag-')) {
      return;
    }
    const isFrise = rawId.startsWith('frise-');
    const id = isFrise ? rawId.replace('frise-', '') : rawId;

    if (isFrise) {
      const friseNode = cy.getElementById(rawId);
      if (friseNode.nonempty()) {
        const pos = friseNode.position();

        // 🧹 Supprimer tous les edges liés à cette frise
        cy.edges().filter(e =>
            ['intra', 'inter', 'flag'].includes(e.data('type')) &&
            (e.data('source') === rawId || e.data('target') === rawId)
        ).remove();

        // 🧹 Supprimer tous les ghost/flag nodes liés
        cy.nodes().filter(n =>
            n.id().startsWith(`ghost-${id}-`) || n.id().startsWith(`flag-`) || n.id().startsWith(`flag-tip-`)
        ).remove();

        // Supprimer le nœud frise
        cy.remove(friseNode);

        // Restaurer le nœud protéine original
        const fastaEntry = store.fastaData.find(p => p.uniprot_id.toUpperCase() === id);
        const degree = degreeMap.get(id) || 1;
        const size = normalizeSize(degree, minDegree, maxDegree);
        const label = fastaEntry?.gene_name || id;

        cy.add({
          group: 'nodes',
          data: { id, label, size },
          position: pos
        });

        // 💫 Recréer les edges globaux normaux
        recreateGlobalEdges();

        selectedProtein.value = null;
        selectedProteinCrosslinks.value = [];
        lastFriseNodeId = null;
        lastFriseForProtein = null;
      }
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



    // Si une frise est déjà affichée, restaurer son nœud d'origine
    // ✅ Place this entire block in your cy.on('tap', 'node', evt => { ... })
//     BEFORE removing the clicked node and adding the new frise

    if (lastFriseNodeId && lastFriseForProtein && lastFriseForProtein !== id) {
      const oldFasta = store.fastaData.find(p => p.uniprot_id.toUpperCase() === lastFriseForProtein);
      const oldFriseNode = cy.getElementById(lastFriseNodeId);
      if (oldFasta && oldFriseNode.nonempty()) {
        const pos = oldFriseNode.position();

        cy.remove(`edge[source = \"${lastFriseNodeId}\"]`);
        cy.remove(`edge[target = \"${lastFriseNodeId}\"]`);
        cy.remove(oldFriseNode);

        const degree = degreeMap.get(lastFriseForProtein) || 1;
        const size = normalizeSize(degree, minDegree, maxDegree);
        const label = oldFasta?.gene_name || lastFriseForProtein;

        cy.add({
          group: 'nodes',
          data: { id: lastFriseForProtein, label, size },
          position: pos
        });

        recreateGlobalEdges();

        lastFriseNodeId = null;
        lastFriseForProtein = null;
      }
    }

    cy.remove(`node[id="${id}"]`);


    const position = node.position();
    const sequenceLength = fasta.sequence.length;
    const pxPerAA = 0.5;
    const friseWidth = sequenceLength * pxPerAA;
    const friseNodeId = `frise-${id}`;
    const label = fasta?.gene_name;
    // Ajouter le nœud frise
    cy.add({
      group: 'nodes',
      data: {
        id: friseNodeId,
        label,
        type: 'frise',
        proteinId: id,
        sequenceLength: friseWidth
      },
      position: {
        x: position.x,
        y: position.y
      },
      grabbable: true,
      selectable: true
    });

    cy.on('position', 'node[id="' + friseNodeId + '"]', e => {
      const newPos = e.target.position();
      store.csvData.forEach(link => {
        const p1 = (link.Protein1 || '').trim().toUpperCase();
        const p2 = (link.Protein2 || '').trim().toUpperCase();
        const pos1 = parseInt(link.AbsPos1);
        const pos2 = parseInt(link.AbsPos2);
        if (!p1 || !p2 || isNaN(pos1) || isNaN(pos2)) return;

        if (p1 === id && p2 === id) {
          const ghost1 = cy.getElementById(`ghost-${id}-${pos1}`);
          const ghost2 = cy.getElementById(`ghost-${id}-${pos2}`);
          const x1 = newPos.x - friseWidth / 2 + pos1 * pxPerAA;
          const x2 = newPos.x - friseWidth / 2 + pos2 * pxPerAA;
          if (ghost1.nonempty()) ghost1.position({ x: x1, y: newPos.y });
          if (ghost2.nonempty()) ghost2.position({ x: x2, y: newPos.y });
        }

        if ((p1 === id && p2 !== id) || (p2 === id && p1 !== id)) {
          const pos = p1 === id ? pos1 : pos2;
          const ghost = cy.getElementById(`ghost-${id}-${pos}`);
          const x = newPos.x - friseWidth / 2 + pos * pxPerAA;
          if (ghost.nonempty()) ghost.position({ x, y: newPos.y });
        }

        if (pos1 === pos2 && (p1 === id || p2 === id)) {
          const flag = cy.getElementById(`flag-${id}-${pos1}`);
          if (flag.nonempty()) {
            const x = newPos.x - friseWidth / 2 + pos1 * pxPerAA;
            flag.position({ x, y: newPos.y });
          }
        }
      });
    });


    lastFriseNodeId = friseNodeId;
    lastFriseForProtein = id;
    const edgeSeen = new Set();

    // Créer edges "virtuels" pour visualiser les crosslinks
    store.csvData.forEach((link, i) => {
      const p1 = (link.Protein1 || '').trim().toUpperCase();
      const p2 = (link.Protein2 || '').trim().toUpperCase();
      const pos1 = parseInt(link.AbsPos1);
      const pos2 = parseInt(link.AbsPos2);

      const key = [p1, p2, pos1, pos2].sort().join('|');
      if (edgeSeen.has(key)) return;
      edgeSeen.add(key);

      const pxPerAA = 0.5;
      const x1 = position.x - friseWidth / 2 + pos1 * pxPerAA;
      const x2 = position.x - friseWidth / 2 + pos2 * pxPerAA;
      const y = position.y;
      // Crosslink Intra
      if (p1 === id && p2 === id) {
        //position 1 et 2 identique
        if (pos1 === pos2) {
          const flagId = `flag-${id}-${pos1}`;
          const x = position.x - friseWidth / 2 + pos1 * pxPerAA;
          const y = position.y;

// 1. Nœud à la base
          if (cy.getElementById(flagId).length === 0) {
            cy.add({
              group: 'nodes',
              data: { id: flagId },
              position: { x, y },
              grabbable: false,
              selectable: false,
              classes: 'ghost'
            });
          }

// 2. Nœud fantôme au sommet du mât
          const ghostTopId = `flag-top-${id}-${pos1}`;
          if (cy.getElementById(ghostTopId).length === 0) {
            cy.add({
              group: 'nodes',
              data: { id: ghostTopId },
              position: { x, y: y - 40 },
              grabbable: false,
              selectable: false,
              classes: 'ghost'

            });
          }

// 3. Nœud fantôme pour la pointe du drapeau (à droite)
          const flagTipId = `flag-tip-${id}-${pos1}`;
          if (cy.getElementById(flagTipId).length === 0) {
            cy.add({
              group: 'nodes',
              data: { id: flagTipId },
              position: { x: x + 11.5, y: y - 40 },
              grabbable: false,
              selectable: false,
              classes: 'ghost'

            });
          }

// 4. Mât
          cy.add({
            group: 'edges',
            data: {
              id: `flag-mast-${i}`,
              source: flagId,
              target: ghostTopId
            },
            classes: 'crosslink flag-mast'
          });

// 5. Tête du drapeau (triangle)
          cy.add({
            group: 'edges',
            data: {
              id: `flag-head-${i}`,
              source: ghostTopId,
              target: flagTipId
            },
            classes: 'crosslink flag-head'
          });


          return;

        }

        // position 1 et 2 diff
        else {
          const ghostId1 = `ghost-${id}-${pos1}`;
          const ghostId2 = `ghost-${id}-${pos2}`;
          const x1 = position.x - friseWidth / 2 + pos1 * pxPerAA;
          const x2 = position.x - friseWidth / 2 + pos2 * pxPerAA;

          // Ajout des deux noeuds invisibles si nécessaires
          if (cy.getElementById(ghostId1).length === 0) {
            cy.add({
              group: 'nodes',
              data: {id: ghostId1},
              position: {x: x1, y: position.y},
              grabbable: false,
              selectable: false,
              classes: 'ghost',

            });
          }

          if (cy.getElementById(ghostId2).length === 0) {
            cy.add({
              group: 'nodes',
              data: {id: ghostId2},
              position: {x: x2, y: position.y},
              grabbable: false,
              selectable: false,
              classes: 'ghost',

            });
          }
          const dx = Math.abs(x2 - x1) + 30;
          const arcHeight = -dx * 1.5;
          // Ajout de l’arche (arc de cercle) entre les deux positions
          cy.add({
            group: 'edges',
            data: {
              id: `intra-${i}`,
              source: ghostId1,
              target: ghostId2,
              type: 'intra',
              abs1: pos1,
              abs2: pos2
            },
            style: {
              'curve-style': 'unbundled-bezier',
              'control-point-distances': [arcHeight],
              'control-point-weights': [0.5],
              'line-color': '#f0a31a',
              'width': 2,
              'target-arrow-shape': 'none'
            },
            classes: 'crosslink'
          });

          return;
        }

      }
      // Inter
      if ((p1 === id && p2 !== id) || (p2 === id && p1 !== id)) {
        const pos = p1 === id ? pos1 : pos2;
        const targetId = p1 === id ? p2 : p1;
        const ghostId = `ghost-${id}-${pos}`;

        // Ajouter un noeud invisible si pas déjà là
        if (cy.getElementById(ghostId).length === 0) {
          const x = position.x - friseWidth / 2 + pos * pxPerAA;
          cy.add({
            group: 'nodes',
            data: { id: ghostId },
            position: { x, y },
            grabbable: false,
            selectable: false,
            classes: 'ghost'
          });
        }


        const targetNode = cy.getElementById(targetId);
        if (targetNode.nonempty()) {
          cy.add({
            group: 'edges',
            data: {
              id: `inter-${i}`,
              source: ghostId,
              target: targetId,
              type: 'inter',
              abs: pos,
              label: `p${pos}`
            },
            classes: 'crosslink'
          });
        }
      }


    });
  });
}


function filterGraph(query) {
  if (!cy) return;

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
  height: 90vh;
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
  height: 41px;
  box-sizing: border-box;
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
