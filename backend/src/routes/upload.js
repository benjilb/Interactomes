import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

import { sha256File } from '../utils/hashFile.js';
import { parseCsv } from '../utils/csv.js';
import { guessOrganelleNameFromFilename } from '../services/organelleName.js';
import { getTaxonIdFromAcc, getProteinInfo } from '../services/uniprot.js';

import { authRequired } from '../middleware/auth.js';
import Dataset from '../models/Dataset.js';
import Organism from '../models/Organism.js';
import Organelle from '../models/Organelle.js';
import Protein from '../models/Protein.js';
import Crosslink from '../models/Crosslink.js';

const router = express.Router();

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '__' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage });

// Helpers
async function findOrCreateOrganelleByName(name) {
    const [org] = await Organelle.findOrCreate({
        where: { name },
        defaults: { name }
    });
    return org;
}

async function upsertProteins(accessions) {
    // récupère celles manquantes via UniProt puis insère
    const existing = await Protein.findAll({ where: { uniprot_acc: accessions } });
    const have = new Set(existing.map(p => p.uniprot_acc));
    const missing = accessions.filter(a => !have.has(a));

    if (missing.length === 0) return;

    // Limite la concurrence pour rester sympa avec l’API UniProt
    const CHUNK = 5;
    for (let i = 0; i < missing.length; i += CHUNK) {
        const slice = missing.slice(i, i + CHUNK);
        const infos = await Promise.all(slice.map(acc => getProteinInfo(acc).catch(() => null)));
        const payload = infos.filter(Boolean).map(info => ({
            uniprot_acc: info.accession,
            gene_name: info.gene_name,
            protein_name: info.protein_name,
            length: info.length,
            reviewed: !!info.reviewed,
            organism_taxon_id: info.organism_taxon_id ?? null,
            updated_at: new Date(),
        }));
        if (payload.length) await Protein.bulkCreate(payload, { ignoreDuplicates: true });
    }
}

// ─────────────────────────────────────────────────────────────
// 1) PREPARE: upload + détection organism/organelle + listing datasets existants
// POST /uploads/prepare  (multipart form-data: file=CSV)
router.post('/prepare', authRequired, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'file requis' });
        const filePath = req.file.path;
        const file_sha256 = await sha256File(filePath);

        // Renomme le fichier avec son hash (évite doublons)
        const hashedPath = path.join(uploadDir, `${file_sha256}.csv`);
        if (!fs.existsSync(hashedPath)) fs.renameSync(filePath, hashedPath);
        else fs.unlinkSync(filePath); // déjà présent

        // Parse juste quelques lignes pour détecter 1er UniProt
        const { rows, header } = await parseCsv(hashedPath, { maxRows: 5 });
        if (!rows.length) return res.status(400).json({ error: 'CSV vide' });

        // Cherche un accession dans Protein1/2
        const firstRow = rows.find(r => r.Protein1 || r.Protein2) || rows[0];
        const acc = (firstRow.Protein1 || firstRow.Protein2 || '').toString().trim();
        if (!acc) return res.status(400).json({ error: 'Aucun UniProt ID détecté (Protein1/Protein2)' });

        // Taxon via UniProt
        const organism_taxon_id = await getTaxonIdFromAcc(acc);

        // Organisme: upsert minimal (nom si tu veux, ici on laisse null)
        await Organism.findOrCreate({
            where: { taxon_id: organism_taxon_id },
            defaults: { taxon_id: organism_taxon_id, scientific_name: null, created_at: new Date() }
        });

        // Organelle via nom de fichier
        const originalName = req.file.originalname;
        const orgName = guessOrganelleNameFromFilename(originalName) || 'Unknown';
        const organelle = await findOrCreateOrganelleByName(orgName);

        // Datasets existants pour cet utilisateur / organism / organelle
        const existing = await Dataset.findAll({
            where: {
                user_id: req.user.id,
                organism_taxon_id,
                organelle_id: organelle.id
            },
            order: [['created_at','DESC']]
        });

        return res.json({
            analysis: {
                organism_taxon_id,
                organelle: { id: organelle.id, name: organelle.name },
                filename: originalName,
                file_sha256,
                header
            },
            existingDatasets: existing.map(d => ({
                id: d.id, filename: d.filename, rows_count: d.rows_count, status: d.status, created_at: d.created_at
            }))
        });
    } catch (e) {
        console.error('POST /uploads/prepare ERROR:', e);
        return res.status(500).json({ error: 'Analyse fichier échouée' });
    }
});

// ─────────────────────────────────────────────────────────────
// 2) COMMIT: créer un dataset ou compléter un dataset existant
// POST /uploads/commit
// Body JSON: {
//   file_sha256, filename,
//   organism_taxon_id, organelle_id,
//   mode: 'create' | 'append',
//   dataset_id?: number
// }
router.post('/commit', authRequired, async (req, res) => {
    try {
        const { file_sha256, filename, organism_taxon_id, organelle_id, mode, dataset_id } = req.body || {};
        if (!file_sha256 || !filename || !organism_taxon_id || !organelle_id || !mode) {
            return res.status(400).json({ error: 'Champs requis: file_sha256, filename, organism_taxon_id, organelle_id, mode' });
        }
        const csvPath = path.join(uploadDir, `${file_sha256}.csv`);
        if (!fs.existsSync(csvPath)) return res.status(400).json({ error: 'Fichier introuvable (ré-exécuter prepare)' });

        const now = new Date();

        // 2.a Créer dataset si demandé
        let dataset = null;
        if (mode === 'create') {
            dataset = await Dataset.create({
                user_id: req.user.id,
                organism_taxon_id,
                organelle_id,
                filename,
                file_sha256,
                rows_count: 0,
                status: 'uploaded',
                created_at: now
            });
        } else if (mode === 'append') {
            if (!dataset_id) return res.status(400).json({ error: 'dataset_id requis pour append' });
            dataset = await Dataset.findByPk(dataset_id);
            if (!dataset) return res.status(404).json({ error: 'Dataset introuvable' });
            // Vérifie cohérence
            if (dataset.organism_taxon_id !== Number(organism_taxon_id) || dataset.organelle_id !== Number(organelle_id)) {
                return res.status(400).json({ error: 'Dataset incompatible (organism/organelle différents)' });
            }
        } else {
            return res.status(400).json({ error: 'mode invalide' });
        }

        // 2.b Parse TOUT le CSV et prépare inserts
        const { rows } = await parseCsv(csvPath);
        if (!rows.length) return res.status(400).json({ error: 'CSV vide' });

        // set d’accessions à upserter
        const accs = new Set();
        const payload = [];
        for (const r of rows) {
            const p1 = (r.Protein1 || '').trim();
            const p2 = (r.Protein2 || '').trim();
            if (!p1 || !p2) continue;
            accs.add(p1);
            accs.add(p2);
            payload.push({
                dataset_id: dataset.id,
                protein1_uid: p1,
                protein2_uid: p2,
                abspos1: r.AbsPos1 ? Number(r.AbsPos1) : null,
                abspos2: r.AbsPos2 ? Number(r.AbsPos2) : null,
                score: (r.Score !== undefined && r.Score !== '') ? Number(r.Score) : null,
                created_at: now
            });
        }
        // 2.c Upsert protéines manquantes via UniProt
        await upsertProteins([...accs]);

        // 2.d Insert crosslinks
        await Crosslink.bulkCreate(payload, { ignoreDuplicates: false });

        // 2.e Met à jour le dataset
        dataset.rows_count = (dataset.rows_count || 0) + payload.length;
        dataset.status = dataset.status === 'uploaded' ? 'parsed' : dataset.status;
        await dataset.save({ silent: true });

        return res.json({
            ok: true,
            dataset: { id: dataset.id, rows_count: dataset.rows_count, status: dataset.status },
            inserted_crosslinks: payload.length,
            inserted_proteins_checked: accs.size
        });
    } catch (e) {
        console.error('POST /uploads/commit ERROR:', e);
        return res.status(500).json({ error: 'Commit échoué' });
    }
});

export default router;
