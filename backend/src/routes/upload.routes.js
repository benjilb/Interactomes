/*import express from 'express';
import upload from '../middleware/upload.js';

const router = express.Router();

// Une seule route qui accepte 1 fichier nommé 'file'
router.post('/file', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier envoyé' });
    }

    // Fichier bien reçu → son chemin : req.file.path
    res.status(200).json({
        message: 'Fichier reçu',
        filename: req.file.filename,
        path: req.file.path
    });
});

export default router;
*/