<template>
  <div class="wrap">
    <h2>All datasets</h2>

    <div class="topbar">
      <input v-model="q" type="text" placeholder="Filter by name, email, taxon, organelle, filename…" />
      <span class="muted">{{ flatCount }} dataset(s)</span>
    </div>

    <div v-if="loading" class="muted">Chargement…</div>
    <div v-else-if="err" class="error">{{ err }}</div>
    <div v-else>
      <div v-for="u in grouped" :key="u.user.id" class="user-block">
        <h3 class="user-title">
          {{ u.user.first_name }} {{ u.user.last_name }}
          <span class="muted">— {{ u.user.email }}</span>
        </h3>

        <div v-for="org in u.organisms" :key="org.taxon_id" class="org-block">
          <h4 class="org-title">
            Organism: <b>{{ org.display }}</b>
            <span class="muted">(taxon {{ org.taxon_id }})</span>
          </h4>

          <div v-for="o in org.organelles" :key="o.id" class="organelle-block">
            <h5 class="organelle-title">Organelle: <b>{{ o.name || '—' }}</b></h5>

            <ul class="ds-list">
              <li v-for="d in o.datasets" :key="d.id" class="ds-item">
                <div class="main">
                  <div class="title">#{{ d.id }} — {{ d.filename }}</div>
                  <div class="meta">
                    <span>Rows: <b>{{ d.rows_count ?? 0 }}</b></span>
                    <span>Status: <b>{{ d.status }}</b></span>
                    <span>Créé: <b>{{ fmt(d.created_at) }}</b></span>
                  </div>
                </div>
                <RouterLink class="go" :to="{ name: 'graph', params: { datasetId: d.id } }">Voir le graphe →</RouterLink>
              </li>
            </ul>
          </div>
        </div>

      </div>

      <div v-if="grouped.length === 0" class="muted">Aucun dataset ne matche le filtre.</div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed, watch } from 'vue';
import { fetchAllDatasets } from '@/services/datasets';

const all = ref([]);
const loading = ref(false);
const err = ref('');
const q = ref('');

onMounted(async () => {
  loading.value = true;
  err.value = '';
  try {
    all.value = await fetchAllDatasets();
  } catch (e) {
    err.value = e?.response?.data?.error || 'Chargement impossible';
  } finally {
    loading.value = false;
  }
});

const flatCount = computed(() => all.value.length);

function fmt(d) {
  try { return new Date(d).toLocaleString(); } catch { return d; }
}

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase();
  if (!s) return all.value;
  return all.value.filter(d => {
    const fields = [
      d.user?.first_name, d.user?.last_name, d.user?.email,
      d.organism?.scientific_name, d.organism?.common_name,
      String(d.organism?.taxon_id),
      d.organelle?.name,
      d.filename,
      d.status
    ];
    return fields.some(v => typeof v === 'string' && v.toLowerCase().includes(s));
  });
});

// Grouping: User -> Organism -> Organelle
const grouped = computed(() => {
  const byUser = new Map();
  for (const d of filtered.value) {
    if (!byUser.has(d.user.id)) {
      byUser.set(d.user.id, { user: d.user, orgs: new Map() });
    }
    const u = byUser.get(d.user.id);

    const tax = d.organism?.taxon_id;
    if (!u.orgs.has(tax)) {
      const display = d.organism?.scientific_name || d.organism?.common_name || `taxon ${tax}`;
      u.orgs.set(tax, { taxon_id: tax, display, organs: new Map() });
    }
    const org = u.orgs.get(tax);

    const orgId = d.organelle?.id;
    const orgName = d.organelle?.name || '—';
    if (!org.organs.has(orgId)) {
      org.organs.set(orgId, { id: orgId, name: orgName, datasets: [] });
    }
    org.organs.get(orgId).datasets.push(d);
  }

  // Transform to arrays for v-for
  return Array.from(byUser.values()).map(u => ({
    user: u.user,
    organisms: Array.from(u.orgs.values()).map(o => ({
      taxon_id: o.taxon_id,
      display: o.display,
      organelles: Array.from(o.organs.values())
    }))
  }));
});
</script>

<style scoped>
.wrap { max-width: 1000px; margin: 28px auto; padding: 0 12px; }
.topbar { display:flex; align-items:center; gap:12px; margin: 10px 0 16px; }
.topbar input { flex:1; padding:8px 10px; border:1px solid #333; border-radius:6px; }
.muted { color:#aaa; }
.error { color:#e55; }
.user-block { border:1px solid #333; border-radius:8px; padding:12px; margin-bottom:16px; }
.user-title { margin:0 0 8px 0; }
.org-block { border-top:1px dashed #444; padding-top:8px; margin-top:8px; }
.org-title { margin:6px 0; }
.organelle-block { padding-left:10px; border-left:3px solid #333; margin:8px 0; }
.organelle-title { margin:4px 0 8px 0; }
.ds-list { list-style:none; padding:0; margin:0; }
.ds-item { display:flex; align-items:center; justify-content:space-between; border-top:1px solid #333; padding:8px 0; }
.ds-item:first-child { border-top:0; }
.title { font-weight:600; }
.meta { display:flex; gap:12px; font-size:0.9rem; margin-top:4px; color:#ccc; }
.go { text-decoration:none; }
</style>
