import fs from 'fs';

export function parseCsv(filePath) {
    // 🔹 1) Lecture + suppression d’un éventuel BOM
    const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
    const lines = raw.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    // 🔹 2) Auto-détection du délimiteur sur l’en-tête
    const headerLine = lines[0];
    const commaCount = (headerLine.match(/,/g) || []).length;
    const semiCount  = (headerLine.match(/;/g) || []).length;
    const DELIM = semiCount > commaCount ? ';' : ',';

    const headers = headerLine.split(DELIM).map(h => h.trim());
    const required = ['Protein1', 'Protein2', 'AbsPos1', 'AbsPos2', 'Score'];

    for (const f of required) {
        if (!headers.includes(f)) console.warn(`Champ manquant : ${f}`);
    }

    return lines.slice(1).map((line, idx) => {
        const values = line.split(DELIM).map(v => v.trim());
        const obj = {};
        headers.forEach((h, i) => {
            let val = values[i];
            if (h === 'Score') val = parseFloat(val);
            else if (['index', 'AbsPos1', 'AbsPos2'].includes(h)) val = parseInt(val, 10);
            obj[h] = val;
        });

        //Comportement identique : ignorer si Protein1 manquant, sinon fallback Protein2 <- Protein1
        if (!obj.Protein1) {
            console.warn(`Ligne ${idx + 2} ignorée : champ Protein1 manquant`);
            return null;
        }
        if (!obj.Protein2) {
            obj.Protein2 = obj.Protein1;
        }

        return obj;
    }).filter(Boolean); //Supprimer les lignes null (avec Protein1 manquant)
}
