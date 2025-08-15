// src/store/dataStore.js
import { defineStore } from 'pinia';
import { fetchDatasetGraph } from '@/services/datasets';

export const useDataStore = defineStore('data', {
    state: () => ({
        fastaData: [], // protéines
        csvData:   [], // crosslinks
    }),
    actions: {
        async loadDataset(datasetId) {
            const { proteins, crosslinks } = await fetchDatasetGraph(datasetId);

            // On alimente tes structures EXACTES
            this.fastaData = proteins;                 // [{ uniprot_id, gene_name, protein_name, sequence, ... }]
            this.csvData   = crosslinks;               // [{ Protein1, Protein2, AbsPos1, AbsPos2, Score }]
        },
        clear() {
            this.fastaData = [];
            this.csvData = [];
        }
    }
});

