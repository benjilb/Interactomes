import express from 'express';
import { Op } from 'sequelize';
import Dataset from '../models/Dataset.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /datasets
 * Public + filtres (optionnels): organism_taxon_id, organelle_id, user_id, status, q (filename like)
 * Pagination: ?limit=200&offset=0
 */
router.get('/', async (req, res) => {
    const where = {};
    const { organism_taxon_id, organelle_id, user_id, status, q } = req.query;

    if (organism_taxon_id) where.organism_taxon_id = organism_taxon_id;
    if (organelle_id) where.organelle_id = organelle_id;
    if (user_id) where.user_id = user_id;
    if (status) where.status = status;
    if (q) where.filename = { [Op.like]: `%${q}%` };

    const limit = Math.min(parseInt(req.query.limit || '200', 10), 1000);
    const offset = parseInt(req.query.offset || '0', 10);

    const items = await Dataset.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset
    });
    res.json({ items });
});

/**
 * GET /datasets/:id
 * Public
 */
router.get('/:id', async (req, res) => {
    const ds = await Dataset.findByPk(req.params.id);
    if (!ds) return res.status(404).json({ error: 'Dataset introuvable' });
    res.json({ dataset: ds });
});

/**
 * POST /datasets
 * Auth requis. Crée un enregistrement (status défaut 'uploaded')
 * Body: { organism_taxon_id, organelle_id, filename, file_sha256? }
 */
router.post('/', authRequired, async (req, res) => {
    try {
        const { organism_taxon_id, organelle_id, filename, file_sha256 } = req.body || {};
        if (!organism_taxon_id || !organelle_id || !filename) {
            return res.status(400).json({ error: 'organism_taxon_id, organelle_id et filename sont requis' });
        }
        const dataset = await Dataset.create({
            user_id: req.user.id,
            organism_taxon_id,
            organelle_id,
            filename,
            file_sha256: file_sha256 || null,
            rows_count: 0,               // démarre à 0
            status: 'uploaded',          // enum: uploaded|parsed|validated|failed
            created_at: new Date()
        });
        res.status(201).json({ dataset });
    } catch (e) {
        // Gère l'UNIQUE (user_id, filename)
        if (e?.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Ce fichier existe déjà pour cet utilisateur' });
        }
        console.error(e);
        res.status(500).json({ error: 'Création dataset échouée' });
    }
});

/**
 * PATCH /datasets/:id
 * Auth requis. Met à jour status / rows_count / file_sha256 (pas d’owner check).
 * Body (optionnels): { status, rows_count, file_sha256 }
 */
router.patch('/:id', authRequired, async (req, res) => {
    const ds = await Dataset.findByPk(req.params.id);
    if (!ds) return res.status(404).json({ error: 'Dataset introuvable' });

    const { status, rows_count, file_sha256 } = req.body || {};
    if (status) ds.status = status;                       // 'uploaded' | 'parsed' | 'validated' | 'failed'
    if (rows_count !== undefined) ds.rows_count = rows_count;
    if (file_sha256 !== undefined) ds.file_sha256 = file_sha256;

    await ds.save({ silent: true }); // pas d'updated_at dans ton modèle
    res.json({ dataset: ds });
});

/**
 * DELETE /datasets/:id
 * Auth requis. Suppression libre (aucun contrôle d’owner).
 */
router.delete('/:id', authRequired, async (req, res) => {
    const ds = await Dataset.findByPk(req.params.id);
    if (!ds) return res.status(404).json({ error: 'Dataset introuvable' });
    await ds.destroy();
    res.json({ ok: true });
});

export default router;
