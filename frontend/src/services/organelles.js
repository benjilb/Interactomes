import api from './api'; // ton axios instance
export async function fetchOrganelles(){
    const { data } = await api.get('/organelles');
    return data.organelles || [];
}
