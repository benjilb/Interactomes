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
    evt.preventDefault?.();

    // Réaffiche tous les noeuds et arêtes avant de gérer le clic
    cy.nodes().style('display', 'element').style('width', '40px').style('height', '40px').style('opacity', 1);
    cy.edges().style('display', 'element').style('opacity', 1);

    const node = evt.target;
    const id = node.data('id').toUpperCase();

    if (selectedProtein.value && selectedProtein.value.uniprot_id.toUpperCase() === id) {
      // Si on reclique sur la protéine déjà sélectionnée, on ferme la frise et restaure
      hideSequenceTrackAndRestore();
      return;
    }

    selectedProtein.value = fastaMap.get(id) || null;
    const fasta = fastaMap.get(id);

    if (!fasta || !fasta.sequence) {
      console.warn(`Séquence introuvable pour ${id}`);
      return;
    }

    // Animation disparition du noeud (taille + opacité)
    node.animate({
      style: { 'width': 0, 'height': 0, 'opacity': 0 }
    }, {
      duration: 500,
      complete: () => {
        // Cache le noeud et ses arêtes
        node.style('display', 'none');
        node.connectedEdges().style('display', 'none');

        // Calculs crosslink (inchangés)
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

        // Affiche la frise (positionné sur le noeud) avec fade-in
        showSequenceTrack(position, sequenceLength, id, validLinks);
        const container = document.getElementById('sequence-overlay');
        container.style.opacity = 0;
        container.style.transition = 'opacity 0.5s ease';
        void container.offsetWidth; // force reflow pour activer transition
        container.style.opacity = 1;
      }
    });
  });
}


function showSequenceTrack(position, length, proteinId, validLinks) {
  const container = document.getElementById('sequence-overlay');
  container.innerHTML = '';

  const pxPerAA = 0.5; // 0.5 pixels par AA
  const scaleWidth = length * pxPerAA;
  const friseLeft = position.x - scaleWidth / 2;

  // Label à gauche de la frise
  const label = document.createElement('div');
  label.innerText = proteinId;
  label.style.position = 'absolute';

  const baseLeft = friseLeft - 60;  // ta position de base
  const charWidth = 9;              // largeur estimée d’un caractère en px
  const maxCharsWithoutShift = 6;   // seuil

  let shift = 0;
  if (proteinId.length > maxCharsWithoutShift) {
    shift = (proteinId.length - maxCharsWithoutShift) * charWidth;
  }

  label.style.left = `${baseLeft - shift}px`;  label.style.top = `${position.y - 6}px`; // Centré verticalement avec la frise
  label.style.fontWeight = 'bold';
  label.style.fontSize = '14px';
  label.style.color = '#ffffff';
  label.style.textAlign = 'right';
  label.style.width = '50px'; // pour aligner proprement
  container.appendChild(label);

  // Bande de la frise
  const track = document.createElement('div');
  track.style.position = 'absolute';
  track.style.left = `${friseLeft}px`;
  track.style.top = `${position.y - 6}px`;
  track.style.width = `${scaleWidth}px`;
  track.style.height = '20px';
  track.style.background = 'transparent';
  track.style.border = '1px solid #aaa';
  //track.style.borderRadius = '6px'; ask to caitie her preference
  container.appendChild(track);

  // Position 1 (au tout début) — sans trait, juste texte
  const tickLabel1 = document.createElement('div');
  tickLabel1.style.position = 'absolute';
  tickLabel1.style.left = `${friseLeft - 8}px`;
  tickLabel1.style.top = `${position.y + 15}px`;
  tickLabel1.style.fontSize = '10px';
  tickLabel1.style.color = '#ffffff';
  tickLabel1.innerText = '1';
  container.appendChild(tickLabel1);

  // Graduation tous les 100 AA, en commençant à 100
  for (let i = 100; i <= length; i += 100) {
    const tick = document.createElement('div');
    tick.style.position = 'absolute';
    tick.style.left = `${friseLeft + i * pxPerAA}px`;
    tick.style.top = `${position.y + 10}px`;
    tick.style.width = '1px';
    tick.style.height = '5px';
    tick.style.background = '#ffffff';
    container.appendChild(tick);

    const tickLabel = document.createElement('div');
    tickLabel.style.position = 'absolute';
    tickLabel.style.left = `${friseLeft + i * pxPerAA - 10}px`;
    tickLabel.style.top = `${position.y + 15}px`;
    tickLabel.style.fontSize = '10px';
    tickLabel.style.color = '#ffffff';
    tickLabel.innerText = i;
    container.appendChild(tickLabel);
  }

  // Dernière position (valeur exacte)
  const finalMark = document.createElement('div');
  finalMark.style.position = 'absolute';
  finalMark.style.left = `${friseLeft + length * pxPerAA - 10}px`;
  finalMark.style.top = `${position.y + 15}px`;
  finalMark.innerText = length;
  finalMark.style.fontSize = '10px';
  finalMark.style.color = '#ffffff';
  container.appendChild(finalMark);

  // Dessine les liens
  drawCrosslinks(proteinId, position, pxPerAA, validLinks, length);
}


function drawCrosslinks(proteinId, position, pxPerAA, validLinks, length) {
  const container = document.getElementById('sequence-overlay');

  // Supprimer ancien SVG
  let svg = document.getElementById('overlay-svg');
  if (svg) svg.remove();

  // Nouveau SVG
  svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('id', 'overlay-svg');
  svg.style.position = 'absolute';
  svg.style.left = '0';
  svg.style.top = '0';
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.pointerEvents = 'none';
  container.appendChild(svg);

  const startX = position.x - (length * pxPerAA) / 2;

  validLinks.forEach(link => {
    const p1 = link.Protein1.toUpperCase().trim();
    const p2 = link.Protein2.toUpperCase().trim();
    const pos1 = parseInt(link.AbsPos1);
    const pos2 = parseInt(link.AbsPos2);

    // Intra-protéine
    if (p1 === proteinId && p2 === proteinId) {
      const x1 = startX + pos1 * pxPerAA;
      const x2 = startX + pos2 * pxPerAA;
      const midX = (x1 + x2) / 2;
      const topY = position.y;
      const arcHeight = Math.max(10, Math.abs(x2 - x1) * 0.2);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${x1} ${topY} Q ${midX} ${topY - arcHeight}, ${x2} ${topY}`);
      path.setAttribute('stroke', 'purple');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('fill', 'none');
      svg.appendChild(path);
    }

    // Inter-protéine (p1 est la frise)
    if (p1 === proteinId && p2 !== proteinId) {
      const targetNode = cy.nodes().filter(n => n.data('id').toUpperCase() === p2);
      if (targetNode.length) {
        const targetPos = targetNode[0].renderedPosition();
        const x1 = startX + pos1 * pxPerAA;
        const y1 = position.y;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', targetPos.x);
        line.setAttribute('y2', targetPos.y);
        line.setAttribute('stroke', 'green');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '4,2');
        svg.appendChild(line);
      }
    }

    // Inter-protéine (p2 est la frise)
    if (p2 === proteinId && p1 !== proteinId) {
      const targetNode = cy.nodes().filter(n => n.data('id').toUpperCase() === p1);
      if (targetNode.length) {
        const targetPos = targetNode[0].renderedPosition();
        const x1 = startX + pos2 * pxPerAA;
        const y1 = position.y;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', targetPos.x);
        line.setAttribute('y2', targetPos.y);
        line.setAttribute('stroke', 'green');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '4,2');
        svg.appendChild(line);
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

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('sequence-overlay');
  if (!overlay) {
    console.warn('⚠️ L’élément #sequence-overlay est introuvable dans le DOM.');
    return;
  }
  console.log('✅ Listener attaché à #sequence-overlay');
  overlay.addEventListener('click', (evt) => {
    console.log('clic sur frise');
    overlay.style.transition = 'opacity 0.5s ease';
    overlay.style.opacity = 0;

    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.innerHTML = '';

      cy.nodes().style('display', 'element');
      cy.edges().style('display', 'element');

      cy.nodes().animate({
        style: { width: '40px', height: '40px', opacity: 1 }
      }, { duration: 500 });

      cy.edges().animate({
        style: { opacity: 1 }
      }, { duration: 500 });

      crosslinkCount.value = 0;
      uniqueCrosslinkCount.value = 0;
      crosslinkIntraCount.value = 0;
      crosslinkInterCount.value = 0;
    }, 500);
  });
});

</script>

<style scoped >

.graph-page {
  display: flex;
  /*height: calc(100vh - 50px);*/
  margin: 0;
  width: 100%;
  overflow: visible;
  box-sizing: border-box;
  height: 700px;
}


.protein-info-container {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;

  width: 367px;
  overflow: auto;
  padding: 10px;
  margin-top: 40px;
  height: 600px;
  box-sizing: border-box;
}

.graph-container {
  flex: 1;
  width: 1000px;
  height: 600px;
  position: relative;
  overflow: visible;
}


.cytoscape {
  flex: 1;
  width: 100%;
  height: 100%;
  max-width: 100%;
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
  z-index: 100000000000000000000000000;
  cursor: pointer;
}

.total-crosslinks {
  margin-top: 10px;
  font-weight: bold;
  font-size: 1.1em;
  color: #333;
}

#sequence-overlay {
  opacity: 0;
  transition: opacity 0.5s ease;
}
</style>
