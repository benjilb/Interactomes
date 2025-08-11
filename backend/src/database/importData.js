// backend/src/database/importData.js
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { sequelize } from '../models/index.js';
import {parseCsv} from '../parsers/parseCsv.js';

// Services
import { parseFilename, normalizeRow, getOrganismFromProtein } from '../services/crosslinkService.js';
import { ensureOrganism } from '../services/organismService.js';
import { ensureOrganelleByName } from '../services/organelleService.js';
import { ensureProteinsForOrganism } from '../services/proteinService.js';
import { createDatasetAndInsert } from '../services/datasetService.js';
import { ensureSeedUser } from '../services/userService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dossier CSV seed
const CSV_DIR = path.resolve(__dirname, '../../static/csv');

async function importOneFile(fileName) {
    const filePath = path.join(CSV_DIR, fileName);

    // 1) Extraire organism/organelle du nom de fichier
    const meta = parseFilename(fileName);
    if (!meta) throw new Error(`Nom de fichier invalide (attendu Organism_Organelle.csv): ${fileName}`);

    // 2) Parser CSV
    const parsedRows = await parseCsv(filePath); // doit retourner tableau d’objets
    const rows = parsedRows.map(normalizeRow).filter(Boolean);
    if (!rows.length) throw new Error(`CSV vide ou colonnes invalides: ${fileName}`);

    // 3) Récupérer organism via 1er UniProtID du CSV
    const firstProtein = rows[0].protein1_uid || rows[0].protein2_uid;
    if (!firstProtein) throw new Error(`Impossible de trouver un UniProtID dans ${fileName}`);

    const orgInfo = await getOrganismFromProtein(firstProtein);
    const organism = await ensureOrganism(orgInfo);
    console.log('🔎 organism from UniProt:', organism?.toJSON?.() ?? organism);
// tu dois voir { taxon_id: 9913, name: 'Bos taurus', ... }

    // 4) Récupérer/Créer organelle
    const organelle = await ensureOrganelleByName(meta.organelleName);

    // 5) Assurer les proteins
    const uniqProteins = new Set();
    for (const r of rows) {
        uniqProteins.add(r.protein1_uid);
        uniqProteins.add(r.protein2_uid);
    }
    + await ensureProteinsForOrganism([...uniqProteins], organism.taxon_id);

    // 6) Créer dataset + insérer crosslinks
    const user = await ensureSeedUser();
    const dataset = await createDatasetAndInsert({
        userId: user.id,
        organismTaxonId: organism.taxon_id,
        organelleId: organelle.id,
        filename: fileName,
        filePath,
        rows
    });

    return { datasetId: dataset.id, organism: organism.name, organelle: organelle.name, n: rows.length };
}

async function main() {
    await sequelize.authenticate();

    const files = (await fs.promises.readdir(CSV_DIR))
        .filter(f => f.toLowerCase().endsWith('.csv'));

    if (!files.length) {
        console.log('Aucun CSV trouvé dans', CSV_DIR);
        process.exit(0);
    }

    for (const f of files) {
        try {
            const res = await importOneFile(f);
            console.log(`✅ ${f} → dataset ${res.datasetId} (${res.organism}/${res.organelle}) : ${res.n} lignes`);
        } catch (e) {
            console.error(`❌ ${f}: ${e.message}`);
        }
    }

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
