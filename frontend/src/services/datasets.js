import api from './api';

export async function fetchDatasetGraph(datasetId) {
    const { data } = await api.get(`/datasets/${datasetId}/graph`);
    return data; // { dataset, crosslinks, proteins }
}

export async function fetchMyDatasets() {
    const { data } = await api.get('/datasets/mine'); // Authorization est géré par api (Bearer)
    return data.datasets || [];
}

export async function fetchAllDatasets() {
    const { data } = await api.get('/datasets/all');
    return data.datasets || [];
}

