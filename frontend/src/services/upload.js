import api from './api';

// 1) PREPARE: envoie le fichier, reçoit l’analyse (organism/organelle) + datasets existants
export async function prepareUpload(file) {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post('/uploads/prepare', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data; // { analysis, existingDatasets }
}

// 2) COMMIT: crée ou complète un dataset
export async function commitUpload(payload) {
    // payload: { file_sha256, filename, organism_taxon_id, organelle_id, mode, dataset_id? }
    const { data } = await api.post('/uploads/commit', payload);
    return data;
}
