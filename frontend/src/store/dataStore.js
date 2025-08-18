// src/store/dataStore.js
import { defineStore } from 'pinia';
import { fetchDatasetGraph } from '@/services/datasets';

export const useDataStore = defineStore('data', {
    state: () => ({
        datasetMeta: null,
        fastaData: [], // protéines
        csvData:   [], // crosslinks
    }),
    actions: {
        async loadDataset(datasetId) {
            const { dataset, proteins, crosslinks } = await fetchDatasetGraph(datasetId);

            this.datasetMeta = dataset;

            // ⚠️ Garder go_terms tel quel (string JSON ou array)
            this.fastaData = proteins.map(p => ({
                uniprot_id:   p.uniprot_id,
                gene_name:    p.gene_name,
                protein_name: p.protein_name,
                sequence:     p.sequence,
                length:       p.length,
                taxon_id:     p.taxon_id,
                updated_at:   p.updated_at,
                go_terms:     p.go_terms,
            }));
            // On alimente tes structures EXACTES
            this.csvData   = crosslinks;               // [{ Protein1, Protein2, AbsPos1, AbsPos2, Score }]
        },
        clear() {
            this.fastaData = [];
            this.csvData = [];
        }
    }
});

