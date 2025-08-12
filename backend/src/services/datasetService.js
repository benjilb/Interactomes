// src/services/datasetService.js
import { Dataset, Crosslink } from '../models/index.js';

export async function createDatasetAndInsert({ userId, organismTaxonId, organelleId, filename, filePath, rows }) {
    const [dataset, created] = await Dataset.findOrCreate({
        where: { user_id: userId, filename },
        defaults: {
            user_id: userId,
            organism_taxon_id: organismTaxonId,
            organelle_id: organelleId,
            filename,
            status: 'uploaded'
        }
    });
    console.log(`[datasetService] dataset ${created ? 'created' : 'exists'} #${dataset.id} (${filename}) taxon=${organismTaxonId}`);

    // insérer les crosslinks avec log par ligne (attention : verbeux)
    let ok = 0, dupeOrFk = 0;
    for (const r of rows) {
        try {
            await Crosslink.create({
                dataset_id: dataset.id,
                protein1_uid: r.protein1_uid,
                protein2_uid: r.protein2_uid,
                abspos1: r.abspos1,
                abspos2: r.abspos2,
                score: r.score ?? null
            });
            ok++;
            console.log(`[crosslink] + ${r.protein1_uid}:${r.abspos1} -> ${r.protein2_uid}:${r.abspos2} (score=${r.score ?? ''})`);
        } catch (e) {
            dupeOrFk++;
            console.warn(`[crosslink] ! skipped ${r.protein1_uid}:${r.abspos1} -> ${r.protein2_uid}:${r.abspos2} (${e.message})`);
        }
    }
    console.log(`[datasetService] crosslinks inserted=${ok}, skipped=${dupeOrFk}`);
    return dataset;
}
