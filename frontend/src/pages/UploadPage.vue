<template>
  <div style="max-width:900px; margin:30px auto;">
    <h2>Upload a graph (CSV)</h2>

    <section style="border:1px solid #333; padding:16px; border-radius:8px;">
      <input type="file" accept=".csv,text/csv" @change="onFile" />
      <p v-if="err" style="color:#e55">{{ err }}</p>
    </section>

    <section v-if="analysis" style="margin-top:20px; border:1px solid #333; padding:16px; border-radius:8px;">
      <h3>Analyse du fichier</h3>
      <ul>
        <li><b>Fichier:</b> {{ analysis.filename }}</li>
        <li><b>SHA-256:</b> <code>{{ analysis.file_sha256 }}</code></li>
        <li><b>Organism (taxon):</b> {{ analysis.organism_taxon_id }}</li>
        <li><b>Organelle:</b> {{ analysis.organelle.name }} (id={{ analysis.organelle.id }})</li>
      </ul>

      <div v-if="existingDatasets.length">
        <h4>Datasets existants (même organism & organelle)</h4>
        <ul>
          <li v-for="d in existingDatasets" :key="d.id">
            #{{ d.id }} — {{ d.filename }} — {{ d.rows_count }} rows — {{ d.status }} — {{ new Date(d.created_at).toLocaleString() }}
          </li>
        </ul>
      </div>
      <div v-else>
        <em>Aucun dataset existant pour cet organism/organelle.</em>
      </div>

      <h4 style="margin-top:16px;">Choix</h4>
      <label style="display:block; margin:6px 0;">
        <input type="radio" value="create" v-model="mode" /> Créer un nouveau dataset
      </label>
      <label v-if="existingDatasets.length" style="display:block; margin:6px 0;">
        <input type="radio" value="append" v-model="mode" /> Compléter un dataset
      </label>

      <div v-if="mode==='append' && existingDatasets.length" style="margin-top:8px;">
        <select v-model.number="selectedDatasetId">
          <option disabled value="">Choisir un dataset</option>
          <option v-for="d in existingDatasets" :key="d.id" :value="d.id">
            #{{ d.id }} — {{ d.filename }} ({{ d.rows_count }} rows)
          </option>
        </select>
      </div>

      <button :disabled="submitting || (mode==='append' && !selectedDatasetId)" style="margin-top:12px;" @click="commit">
        {{ submitting ? 'Import…' : 'Importer' }}
      </button>


      <!-- Barre de progression + journal d'étapes -->
      <div v-if="submitting" class="import-progress">
        <div class="progress-track">
          <div class="progress-bar" :style="{ width: progress + '%' }"></div>
        </div>
        <div class="progress-status">
          <span class="left">{{ statusText }}</span>
          <span class="right">{{ progress }}%</span>
        </div>

        <ul class="import-logs">
          <li v-for="(msg, i) in stepLogs" :key="i">{{ msg }}</li>
        </ul>
      </div>

      <p v-if="okMsg" style="color:#5c5; margin-top:10px;">{{ okMsg }}</p>
      <p v-if="errCommit" style="color:#e55; margin-top:10px;">{{ errCommit }}</p>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { prepareUpload, commitUpload } from '../services/upload';
import router from "@/router/index.js";

const file = ref(null);
const err = ref('');
const analysis = ref(null);
const existingDatasets = ref([]);
const mode = ref('create');
const selectedDatasetId = ref('');
const submitting = ref(false);
const okMsg = ref('');
const errCommit = ref('');

const progress = ref(0);
const statusText = ref('');
const stepLogs = ref([]);



function setProgressSmooth(target, durationMs = 600) {
  // monte en douceur vers 'target' sans dépasser
  const start = progress.value;
  const delta = Math.max(0, target - start);
  if (delta === 0) return;
  const steps = Math.max(1, Math.floor(durationMs / 50));
  let i = 0;
  const timer = setInterval(() => {
    i++;
    progress.value = Math.min(target, Math.round(start + (delta * i) / steps));
    if (i >= steps) clearInterval(timer);
  }, 50);
}

async function onFile(e) {
  err.value = ''; okMsg.value = ''; errCommit.value = '';
  analysis.value = null; existingDatasets.value = [];
  try {
    const f = e.target.files?.[0];
    if (!f) return;
    file.value = f;
    const data = await prepareUpload(f);
    analysis.value = data.analysis;
    existingDatasets.value = data.existingDatasets || [];
    // si des datasets existent, laisse l’utilisateur choisir (par défaut: create)
    mode.value = existingDatasets.value.length ? 'create' : 'create';
  } catch (e2) {
    err.value = e2?.response?.data?.error || 'Analyse échouée';
  }
}

async function commit() {
  if (!analysis.value) return;

  // reset affichage
  submitting.value = true;
  okMsg.value = '';
  errCommit.value = '';
  progress.value = 0;
  statusText.value = 'Préparation…';
  stepLogs.value = [];

  // infos haute-niveau utiles (pas ligne par ligne)
  stepLogs.value.push(`Organism (taxon): ${analysis.value.organism_taxon_id}`);
  stepLogs.value.push(`Organelle: ${analysis.value.organelle.name} (id=${analysis.value.organelle.id})`);
  stepLogs.value.push(`Fichier: ${analysis.value.filename}`);

  try {
    setProgressSmooth(20, 400);
    statusText.value = 'Vérification / création des protéines…';

    // payload standard
    const payload = {
      file_sha256: analysis.value.file_sha256,
      filename: analysis.value.filename,
      organism_taxon_id: analysis.value.organism_taxon_id,
      organelle_id: analysis.value.organelle.id,
      mode: mode.value,
      dataset_id: mode.value === 'append' ? Number(selectedDatasetId.value) : undefined
    };

    // On simule des paliers (le “lourd” est côté serveur, on ne peut pas avoir du vrai temps réel sans SSE)
    setTimeout(() => setProgressSmooth(55, 800), 250);
    setTimeout(() => { statusText.value = 'Insertion des crosslinks…'; setProgressSmooth(85, 900); }, 900);

    // appel réel au backend
    const res = await commitUpload(payload);

    // Fin et résumé
    statusText.value = 'Finalisation…';
    setProgressSmooth(100, 300);

    const inserted = res?.inserted_crosslinks ?? 0;
    const proteins = res?.checked_proteins ?? 0;
    const ds = res?.dataset;

    stepLogs.value.push(`Proteins vérifiées/créées: ${proteins}`);
    stepLogs.value.push(`Crosslinks insérés: ${inserted}`);
    if (ds?.rows_count != null) stepLogs.value.push(`Total crosslinks dans dataset: ${ds.rows_count}`);

    okMsg.value = `OK — dataset #${ds?.id ?? '?'}, ${inserted} crosslinks importés`;
    // redirection vers le graph du dataset importé
    router.push({ name: 'graph', params: { datasetId: ds.id } });
  } catch (e3) {
    errCommit.value = e3?.response?.data?.error || e3?.message || 'Import échoué';
    statusText.value = 'Erreur';
  } finally {
    // garde la barre visible un court instant si succès
    setTimeout(() => { submitting.value = false; }, 600);
  }
}
</script>

<style scoped>
.import-progress {
  margin-top: 12px;
}

.progress-track {
  width: 100%;
  height: 10px;
  background: #2d2d2d;
  border: 1px solid #3a3a3a;
  border-radius: 999px;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #4CAF50, #7ad37d);
  transition: width 0.25s ease;
}

.progress-status {
  display: flex;
  justify-content: space-between;
  color: #e6e6e6;
  font-size: 0.9rem;
  margin-top: 6px;
}
.progress-status .left { opacity: .9; }
.progress-status .right { font-variant-numeric: tabular-nums; }

.import-logs {
  margin: 8px 0 0;
  padding-left: 16px;
  color: #d9d9d9;
}
.import-logs li {
  margin: 2px 0;
  list-style: disc;
}
</style>

