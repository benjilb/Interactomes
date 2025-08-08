import fs from 'fs';
import path from 'path';
import { insertProtein } from '../models/Protein';

export async function insertProteinsFromFASTA(req, res) {
    const fastaPath = path.resolve('static/fasta/reference.fasta');  // ou req.file.path si upload
    const text = fs.readFileSync(fastaPath, 'utf-8');

    const entries = parseFasta(text);

    try {
        for (const p of entries) {
            await insertProtein(p);  // Exige que p ait les bons champs
        }
        res.send(`✅ ${entries.length} protéines insérées`);
    } catch (err) {
        res.status(500).send('Erreur lors de l’insertion : ' + err.message);
    }
}
