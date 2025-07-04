<template>
  <div class="graph-page">
    <div class="protein-info-container">
      <ProteinInfo v-if="selectedProtein"
                   :protein="selectedProtein"
                   :crosslinkCount="crosslinkCount"
                   :intraCount="crosslinkIntraCount"
                   :interCount="crosslinkInterCount"
                   :uniqueCount="uniqueCrosslinkCount"
      />
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

  </div>

</template>

<script setup>

import {ref,onMounted, watch, onBeforeUnmount, nextTick} from 'vue'
import { useDataStore } from '@/store/dataStore'
import ProteinInfo from '@/components/ProteinInfo.vue'
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';

cytoscape.use(coseBilkent);

const props = defineProps({
  refreshTrigger: {
    type: Number,
    default: 0
  }
})

const cyContainer = ref(null);
let cy = null;
const store = useDataStore();
const selectedProtein = ref(null)
const crosslinkCount = ref(0);
const crosslinkIntraCount = ref(0);
const crosslinkInterCount = ref(0);
const totalCrosslinkCount = ref(0);
const uniqueCrosslinkCount = ref(0);

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
    evt.preventDefault?.(); //a essayer
    const node = evt.target;
    const id = node.data('id').toUpperCase();

    selectedProtein.value = fastaMap.get(id) || null;
    const fasta = fastaMap.get(id);

    if (!fasta || !fasta.sequence) {
      console.warn(`Séquence introuvable pour ${id}`);
      return;
    }

    crosslinkCount.value = validLinks.filter(link =>
        link.Protein1.trim().toUpperCase() === id ||
        link.Protein2.trim().toUpperCase() === id
    ).length;

    const uniqueSet = new Set();
    let intraUnique = 0;
    let interUnique = 0;

    validLinks.forEach(link => {
      const p1 = (link.Protein1 || '').trim().toUpperCase();
      const p2 = (link.Protein2 || '').trim().toUpperCase();
      const pos1 = parseInt(link.AbsPos1);
      const pos2 = parseInt(link.AbsPos2);

      if (p1 !== id && p2 !== id) return;

      const [protA, protB] = p1 < p2 ? [p1, p2] : [p2, p1];
      const [absA, absB] = pos1 < pos2 ? [pos1, pos2] : [pos2, pos1];

      const key = `${protA}|${protB}|${absA}|${absB}`;

      if (!uniqueSet.has(key)) {
        uniqueSet.add(key);

        if (protA === protB && protA === id) {
          intraUnique++;
        } else if (protA === id || protB === id) {
          interUnique++;
        }
      }
    });
    uniqueCrosslinkCount.value = uniqueSet.size;
    crosslinkIntraCount.value = intraUnique;
    crosslinkInterCount.value = interUnique;



    const sequenceLength = fasta.sequence.length;
    const position = node.renderedPosition();

    console.log(`Click sur ${id}, longueur ${sequenceLength}`, position);

    showSequenceTrack(position, sequenceLength, id, validLinks);
  });

}
function showSequenceTrack(position, length, proteinId, validLinks) {
  const container = document.getElementById('sequence-overlay');
  container.innerHTML = '';

  const scaleWidth = 400;
  const pxPerAA = scaleWidth / length;

  const line = document.createElement('div');
  line.style.position = 'absolute';
  line.style.left = `${position.x - scaleWidth/2}px`;
  line.style.top = `${position.y + 30}px`;
  line.style.width = `${scaleWidth}px`;
  line.style.height = '2px';
  /*line.style.background = 'black';*/
  line.style.background = 'red';  // Rouge vif pour test

  container.appendChild(line);

  // Graduation tous les 100 AA
  for (let i = 0; i <= length; i += 100) {
    const mark = document.createElement('div');
    mark.style.position = 'absolute';
    mark.style.left = `${position.x - scaleWidth/2 + i * pxPerAA}px`;
    mark.style.top = `${position.y + 35}px`;
    mark.innerText = i;
    mark.style.fontSize = '10px';
    container.appendChild(mark);
  }

  // Dernière position
  const finalMark = document.createElement('div');
  finalMark.style.position = 'absolute';
  finalMark.style.left = `${position.x - scaleWidth/2 + length * pxPerAA}px`;
  finalMark.style.top = `${position.y + 35}px`;
  finalMark.innerText = length;
  finalMark.style.fontSize = '10px';
  container.appendChild(finalMark);

  // Afficher les crosslinks
  drawCrosslinks(proteinId, position, pxPerAA, validLinks);
}


function drawCrosslinks(proteinId, position, pxPerAA, validLinks) {
  const container = document.getElementById('sequence-overlay');

  validLinks.forEach(link => {
    const p1 = link.Protein1.toUpperCase().trim();
    const p2 = link.Protein2.toUpperCase().trim();
    const pos1 = parseInt(link.AbsPos1);
    const pos2 = parseInt(link.AbsPos2);

    if (p1 === proteinId && p2 === proteinId) {
      // Intra-protéine : arc entre pos1 et pos2
      const arc = document.createElement('div');
      const startX = position.x - 200 + pos1 * pxPerAA;
      const endX = position.x - 200 + pos2 * pxPerAA;
      const width = Math.abs(endX - startX);

      arc.style.position = 'absolute';
      arc.style.left = `${Math.min(startX, endX)}px`;
      arc.style.top = `${position.y + 10}px`;
      arc.style.width = `${width}px`;
      arc.style.height = '20px';
      arc.style.borderTop = '2px solid purple';
      arc.style.borderRadius = `${width/2}px / 10px`;
      container.appendChild(arc);
    }

    if (p1 === proteinId && p2 !== proteinId) {

      const targetNode = cy.nodes().filter(n => n.data('id').toUpperCase() === p2);
      if (targetNode.length) {
        const targetPos = targetNode[0].renderedPosition();
        const x1 = position.x - 200 + pos1 * pxPerAA;
        const y1 = position.y + 30;

        const line = document.createElement('div');
        line.style.position = 'absolute';
        line.style.left = `${Math.min(x1, targetPos.x)}px`;
        line.style.top = `${Math.min(y1, targetPos.y)}px`;
        line.style.width = `${Math.abs(targetPos.x - x1)}px`;
        line.style.height = `${Math.abs(targetPos.y - y1)}px`;
        line.style.border = '1px dashed green';
        container.appendChild(line);
      }
    }
  });
}


onMounted(async () => {
  generateGraph();
  window.addEventListener('resize', handleResize);
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
}

.total-crosslinks {
  margin-top: 10px;
  font-weight: bold;
  font-size: 1.1em;
  color: #333;
}
</style>
