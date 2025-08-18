import api from './api';

export async function fetchDatasetGraph(datasetId) {
    const { data } = await api.get(`/datasets/${datasetId}/graph`);
    return data;
}

export async function fetchMyDatasets() {
    const { data } = await api.get('/datasets/mine'); // Authorization est géré par api (Bearer)
    return data.datasets || [];
}

export async function fetchAllDatasets() {
    const { data } = await api.get('/datasets/all');
    return data.datasets || [];
}

export async function fetchDatasetMeta(datasetId) {
    const { data } = await api.get(`/datasets/${datasetId}/meta`);
    return data; // { id, filename, organism:{ taxon_id, name, common_name } }
}

export async function fetchDatasetsByUserId(userId) {
    const { data } = await api.get(`/datasets`, {
        params: { user_id: userId }
    });
    return data.items || [];
}