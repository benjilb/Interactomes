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
  submitting.value = true; okMsg.value = ''; errCommit.value = '';
  try {
    const payload = {
      file_sha256: analysis.value.file_sha256,
      filename: analysis.value.filename,
      organism_taxon_id: analysis.value.organism_taxon_id,
      organelle_id: analysis.value.organelle.id,
      mode: mode.value,
      dataset_id: mode.value === 'append' ? Number(selectedDatasetId.value) : undefined
    };
    const res = await commitUpload(payload);
    okMsg.value = `OK — dataset #${res.dataset.id}, ${res.inserted_crosslinks} crosslinks importés`;
    router.push({ name: 'graph', params: { datasetId: res.dataset.id } });
  } catch (e3) {
    errCommit.value = e3?.response?.data?.error || 'Import échoué';
  } finally {
    submitting.value = false;
  }
}
</script>
