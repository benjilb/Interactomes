import fs from 'fs';
import crypto from 'crypto';
import { Dataset, Crosslink, sequelize } from '../models/index.js';

async function sha256File(filePath) {
    const buf = await fs.promises.readFile(filePath);
    return crypto.createHash('sha256').update(buf).digest('hex');
}

export async function createDatasetAndInsert({
                                                 userId, organism_taxon_id, organelleId, filename, filePath, rows
                                             }) {
    const t = await sequelize.transaction();
    try {
        const file_sha256 = await sha256File(filePath);
        const dataset = await Dataset.create({
            user_id: userId,
            organism_taxon_id: organism_taxon_id,
            organelle_id: organelleId,
            filename,
            file_sha256,
            status: 'uploaded'
        }, { transaction: t });

        // Préparer crosslinks
        const payload = rows.map(r => ({
            dataset_id: dataset.id,
            protein1_uid: r.protein1_uid,
            protein2_uid: r.protein2_uid,
            abspos1: r.abspos1,
            abspos2: r.abspos2,
            score: r.score ?? null
        }));

        // Insert en chunks
        const CHUNK = 5000;
        for (let i = 0; i < payload.length; i += CHUNK) {
            await Crosslink.bulkCreate(payload.slice(i, i + CHUNK), {
                ignoreDuplicates: true,
                transaction: t
            });
        }

        await dataset.update({ status: 'parsed', rows_count: payload.length }, { transaction: t });
        await t.commit();
        return dataset;
    } catch (err) {
        await t.rollback();
        throw err;
    }
}
