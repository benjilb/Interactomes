<template>
  <div class="protein-info" v-if="protein">
    <h3>Protein Information</h3>
    <ul>
      <li><strong>Uniprot ID:</strong> {{ protein.uniprot_id }}</li>
      <li><strong>Name:</strong> {{ protein.protein_name }}</li>
      <li><strong>Gene:</strong> {{ protein.gene_name }}</li>

      <!-- Séquence + légende -->
      <li class="sequence-header">
        <div class="seq-label">
          <strong>Sequence:</strong>
          <span class="seq-size">{{ (protein.sequence?.length ?? 0) }} amino acids</span>
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

      <!-- Statistiques crosslinks -->
      <li><strong>Number of unique crosslinks: </strong> {{ crosslinkStats.uniqueCount }}</li>
      <li class="crosslink-sub">- Intra-protein Crosslinks: {{ crosslinkStats.intraCount }}</li>
      <li class="crosslink-sub">- Inter-protein Crosslinks: {{ crosslinkStats.interCount }}</li>
      <li><strong>Number of Crosslinks with copy:</strong> {{ crosslinkStats.crosslinkCount }}</li>

      <!-- Gene Ontology -->
      <li v-if="parsedGOTerms.length" class="go-section">
        <h4 class="go-title">Gene Ontology</h4>
        <div class="go-summary">
          <template v-for="k in ['F','P','C']" :key="k">
    <span
        v-if="groupedGO[k] && groupedGO[k].length"
        class="go-chip"
        :class="'aspect-' + k"
    >
      <span class="dot"></span>
      {{ ASPECT_INFO[k].label }}
      <b>{{ groupedGO[k].length }}</b>
    </span>
          </template>
        </div>
        <!-- Groupes par aspect : un seul titre par aspect -->
        <div class="go-groups">
          <template v-for="k in ASPECT_ORDER" :key="k">
            <section
                v-if="groupedGO[k] && groupedGO[k].length"
                class="go-group"
                :class="'aspect-' + k"
            >
              <header class="go-group-head">
                <span class="dot"></span>
                <span class="go-group-title">{{ ASPECT_INFO[k].label }}</span>
                <span class="go-count">{{ groupedGO[k].length }}</span>
              </header>

              <div class="go-card-list">
                <article
                    v-for="g in groupedGO[k]"
                    :key="g.id"
                    class="go-card"
                    :class="'aspect-' + k"
                >
                  <header class="go-card-head">
                    <a class="go-id" :href="quickgoUrl(g.id)" target="_blank" rel="noopener noreferrer">
                      {{ g.id }}
                    </a>
                  </header>
                  <div class="go-term">{{ g.term }}</div>
                </article>
              </div>
            </section>
          </template>
        </div>

      </li>

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

/* ---------- Crosslink coloration sur séquence ---------- */
const crosslinkMap = computed(() => {
  const map = {}
  const proteinId = protein?.uniprot_id
  if (!proteinId || !store.csvData) return map

  store.csvData.forEach(entry => {
    const { Protein1, Protein2, AbsPos1, AbsPos2 } = entry
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
  return map
})

const crosslinkStats = computed(() => {
  const stats = { crosslinkCount: 0, uniqueCount: 0, intraCount: 0, interCount: 0 }
  if (!protein?.uniprot_id || !store.csvData || !store.fastaData) return stats

  const id = protein.uniprot_id.toUpperCase()
  const fastaMap = new Map(store.fastaData.map(p => [p.uniprot_id.toUpperCase(), true]))
  const uniqueSet = new Set()

  store.csvData.forEach(link => {
    const p1 = (link.Protein1 || '').trim().toUpperCase()
    const p2 = (link.Protein2 || '').trim().toUpperCase()
    const pos1 = parseInt(link.AbsPos1)
    const pos2 = parseInt(link.AbsPos2)
    if (!fastaMap.has(p1) || !fastaMap.has(p2)) return
    if (isNaN(pos1) || isNaN(pos2)) return
    if (p1 !== id && p2 !== id) return

    stats.crosslinkCount++

    const [protA, protB] = p1 < p2 ? [p1, p2] : [p2, p1]
    const [absA, absB] = pos1 < pos2 ? [pos1, pos2] : [pos2, pos1]
    const key = `${protA}|${protB}|${absA}|${absB}`

    if (!uniqueSet.has(key)) {
      uniqueSet.add(key)
      const isSameProtein = protA === protB && protA === id
      const isInterProtein = (protA === id || protB === id) && protA !== protB
      if (isSameProtein) stats.intraCount++
      else if (isInterProtein && absA !== absB) stats.interCount++
    }
  })
  stats.uniqueCount = uniqueSet.size
  return stats
})

const styledSequence = computed(() => {
  if (!protein?.sequence) return ''
  return protein.sequence.split('').map((aa, idx) => {
    const pos = idx + 1
    const types = crosslinkMap.value[pos]
    let style = ''
    if (types?.has('intra') && types?.has('inter'))      style = 'color: pink; font-weight: bold;'
    else if (types?.has('intra'))                        style = 'color: orange; font-weight: bold;'
    else if (types?.has('inter'))                        style = 'color: purple; font-weight: bold;'
    return `<span style="${style}">${aa}</span>`
  }).join('')
})

/* ---------- Gene Ontology (GO) ---------- */
const parsedGOTerms = computed(() => {
  const raw = protein?.go_terms
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(x => x && x.id && x.term)
  if (typeof raw === 'string') {
    try {
      const arr = JSON.parse(raw)
      return Array.isArray(arr) ? arr.filter(x => x && x.id && x.term) : []
    } catch { return [] }
  }
  return []
})

const groupedGO = computed(() => {
  return parsedGOTerms.value.reduce((acc, t) => {
    const k = (t.aspect || '').toUpperCase()
    if (!acc[k]) acc[k] = []
    acc[k].push(t)
    return acc
  }, { F: [], P: [], C: [] })
})

// labels + couleurs (on garde)
const ASPECT_INFO = {
  F: { label: 'Molecular function', color: '#3b82f6' },   // bleu
  P: { label: 'Biological process', color: '#22c55e' },   // vert
  C: { label: 'Cellular component', color: '#a855f7' },   // violet
};
const ASPECT_ORDER = ['C', 'F', 'P']; // ordre d’affichage souhaité
const aspectKey = (a) => String(a || '').toUpperCase();
const quickgoUrl = (id) => `https://www.ebi.ac.uk/QuickGO/term/${encodeURIComponent(id)}`;
</script>

<style scoped>
.protein-info {
  padding: 1rem;
  width: 100%;
  overflow: auto;
  align-self: flex-start;
}
h3 { margin-top: 0; }

.protein-info ul { list-style: none; padding:0; margin: 0; }
.protein-info li { margin-bottom: 0.5rem; text-align: left; }

.sequence {
  white-space: pre-wrap;
  word-break: break-word;
  padding: 0.5rem;
  border-radius: 4px;
  background: #3e3e47;
  max-height: 200px;
  overflow: auto;
}
.placeholder { padding: 1rem; width: 300px; margin-top: 30px; color: #777; }
.crosslink-sub { margin-left: 20px; font-size: 0.9em; color: gray; }

.legend { display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
.legend-item { display: flex; align-items: center; font-size: 0.85rem; color: white; }
.legend-color { width: 12px; height: 12px; border-radius: 50%; margin-right: 6px; display: inline-block; }
.legend-color.intra { background-color: orange; }
.legend-color.inter { background-color: purple; }
.legend-color.both { background-color: pink; }

.sequence-header .seq-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.seq-size { color: #ccc; font-style: italic; font-size: 0.9rem; }

/* ---- GO styles ---- */
/* Ligne de séparation légère au-dessus de GO */
.go-section {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #3a3a43; /* gris léger */
}

/* Résumé par aspect (puces colorées) */
.go-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 6px 0 8px;
}
.go-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.9rem;
  background: #2f2f37;
  border: 1px solid #3a3a43;
  color: #e6e6e6;
}
.go-chip .dot {
  width: 10px; height: 10px; border-radius: 50%;
  display: inline-block;
  background: currentColor;
}

/* Grille de cartes */
.go-card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}
.go-card {
  background: #2f2f37;
  border: 1px solid #3a3a43;
  border-left-width: 4px;           /* ruban latéral coloré */
  border-radius: 8px;
  padding: 8px 10px;
}
.go-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

/* Nouveau libellé d’aspect en haut */
.go-kind {
  font-weight: 700;
  font-size: 0.85rem;
  color: #eaeaea;
  letter-spacing: .02em;
}

.go-id {
  color: #b9d4ff;
  text-decoration: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 0.9rem;
}
.go-id:hover { text-decoration: underline; }

.go-term {
  color: #fff;
  font-weight: 600;
  line-height: 1.2;
}

/* Couleurs par aspect (ruban + puces résumé) */
.aspect-F { border-left-color: #3b82f6; color: #cfe3ff; }
.aspect-P { border-left-color: #22c55e; color: #d9f7e4; }
.aspect-C { border-left-color: #a855f7; color: #ecd7ff; }

.go-chip.aspect-F .dot { background: #3b82f6; }
.go-chip.aspect-P .dot { background: #22c55e; }
.go-chip.aspect-C .dot { background: #a855f7; }

/* — Espacement entre les groupes et entre le titre et les cartes — */
.go-groups {
  display: flex;
  flex-direction: column;
  gap: 24px;                /* plus d'espace entre les catégories */
}

.go-group-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;      /* plus d'espace avant la grille de cartes */
}

/* Dot + Titre à gauche, Compteur collé à droite */
.go-group-title {
  margin-right: auto;       /* pousse le compteur à droite */
}
.go-count {
  margin-left: auto;        /* colle à droite */
  font-weight: 700;
  color: #e0e0e0;
  font-variant-numeric: tabular-nums; /* joli alignement des chiffres */
}

/* — Lien GO collé à droite dans la carte — */
.go-card-head {
  display: flex;
  justify-content: flex-end;  /* aligne le contenu à droite */
  align-items: center;
  margin-bottom: 6px;
}
.go-id {
  margin-left: auto;          /* assure le collage à droite même si d'autres éléments arrivent */
}

</style>
