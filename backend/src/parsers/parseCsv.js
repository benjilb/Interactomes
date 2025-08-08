import fs from 'fs';

export function parseCsv(filePath) {
    const text = fs.readFileSync(filePath, 'utf-8');
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const required = ['Protein1', 'Protein2', 'AbsPos1', 'AbsPos2', 'Score'];

    for (const f of required) {
        if (!headers.includes(f)) console.warn(`Champ manquant : ${f}`);
    }

    return lines.slice(1).map((line, idx) => {
        const values = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, i) => {
            let val = values[i];
            if (h === 'Score') val = parseFloat(val);
            else if (['index', 'AbsPos1', 'AbsPos2'].includes(h)) val = parseInt(val, 10);
            obj[h] = val;
        });

        // ✅ Remplacer Protein2 vide par Protein1
        if (!obj.Protein1) {
            console.warn(`Ligne ${idx + 2} ignorée : champ Protein1 manquant`);
            return null;
        }
        if (!obj.Protein2) {
            obj.Protein2 = obj.Protein1;
        }

        return obj;
    }).filter(Boolean); // ✅ Supprimer les lignes null (avec Protein1 manquant)
}
