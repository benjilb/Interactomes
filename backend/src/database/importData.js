import fs from 'fs';
import path from 'path';
import sequelize from './config.js';
import Protein from '../models/Protein.js';
import Crosslink from '../models/Crosslink.js';

import { parseFasta } from '../parsers/parseFasta.js';
import { parseCsv } from '../parsers/parseCsv.js';

const FASTA_DIR = 'static/fasta';
const CSV_DIR = 'static/csv';

async function importData() {
    await sequelize.authenticate();
    await sequelize.sync({});
    console.log('✅ Connexion DB OK');

    // Import proteins
    const fastaFiles = fs.readdirSync(FASTA_DIR).filter(f => f.endsWith('.fasta'));
    for (const file of fastaFiles) {
        const proteins = parseFasta(path.join(FASTA_DIR, file));
        let count = 0;

        for (const p of proteins) {
            if (!p.uniprot_id) continue;
            await Protein.upsert(p);
            count++;
        }

        console.log(`✅ ${count} protéines importées depuis ${file}`);
    }

    // Import crosslinks
    const csvFiles = fs.readdirSync(CSV_DIR).filter(f => f.endsWith('.csv'));
    for (const file of csvFiles) {
        const crosslinks = parseCsv(path.join(CSV_DIR, file));
        let count = 0;

        for (const cl of crosslinks) {
            try {
                await Crosslink.create({
                    protein1_id: cl.Protein1,
                    protein2_id: cl.Protein2,
                    abspos1: cl.AbsPos1,
                    abspos2: cl.AbsPos2,
                    score: cl.Score
                });
                count++;
            } catch (err) {
                console.warn(`⚠️ Ligne ignorée: ${cl.Protein1}-${cl.Protein2} (${err.message})`);
            }
        }

        console.log(`✅ ${count} crosslinks importés depuis ${file}`);
    }

    console.log('✅ Import terminé');
}

importData().catch(console.error);
