import express from 'express';
import Organelle from '../models/Organelle.js';

const router = express.Router();
router.get('/', async (req, res) => {
    try {
        const list = await Organelle.findAll({ attributes: ['id','name'], order: [['name','ASC']], raw: true });
        res.json({ organelles: list });
    } catch (e) {
        console.error('GET /organelles ERROR:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
