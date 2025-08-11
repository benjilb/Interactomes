// src/services/organismService.js
import { Organism } from '../models/index.js';

export async function ensureOrganism(orgInfo) {
    if (!orgInfo || typeof orgInfo.tax_id !== 'number') {
        throw new Error('ensureOrganism: tax_id manquant ou invalide');
    }
    const taxon_id = orgInfo.tax_id; // 🔑 mapping explicite

    const [org] = await Organism.findOrCreate({
        where: { taxon_id }, // PK = taxon_id
        defaults: {
            taxon_id,
            name: orgInfo.name || 'Unknown organism',
            common_name: orgInfo.common_name ?? null
        }
    });

    // Option: si tu veux rafraîchir le nom à la volée
    // await org.update({ name: orgInfo.name ?? org.name, common_name: orgInfo.common_name ?? org.common_name });

    return org; // => { taxon_id, name, common_name }
}
