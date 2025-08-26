// src/store/dataStore.js
import { defineStore } from 'pinia';
import { fetchDatasetGraph } from '@/services/datasets';

export const useDataStore = defineStore('data', {
    state: () => ({
        datasetMeta: null,
        fastaData: [],
        csvData:   [],
    }),
    actions: {
        async loadDataset(datasetId) {
            const { dataset, proteins, crosslinks } = await fetchDatasetGraph(datasetId);

            this.datasetMeta = dataset;

            this.fastaData = proteins.map(p => ({
                uniprot_id:   p.uniprot_id,
                gene_name:    p.gene_name,
                protein_name: p.protein_name,
                sequence:     p.sequence,
                length:       p.length,
                taxon_id:     p.taxon_id,
                updated_at:   p.updated_at,
                go_terms:     p.go_terms,
                subcellular_locations: p.subcellular_locations ?? '[]',
                string_refs:           p.string_refs ?? ''
            }));
            // On alimente tes structures EXACTES
            this.csvData   = crosslinks;
        },
        clear() {
            this.fastaData = [];
            this.csvData = [];
        }
    }
});

