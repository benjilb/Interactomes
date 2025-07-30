export function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) {
        console.warn("CSV vide ou trop court");
        return [];
    }

    const headers = lines[0].split(',').map(h => h.trim());
    console.log("Headers détectés :", headers);

    const requiredFields = ['Protein1', 'Protein2', 'AbsPos1', 'AbsPos2', 'Score'];

    // Vérification des champs attendus
    requiredFields.forEach(field => {
        if (!headers.includes(field)) {
            console.warn(`Champ manquant dans les headers : ${field}`);
        }
    });

    const data = [];

    lines.slice(1).forEach((line, index) => {
        const values = line.split(',').map(v => v.trim());
        if (values.length !== headers.length) {
            console.warn(`Ligne ${index + 2} ignorée (nombre de colonnes inattendu) :`, line);
            return;
        }

        const entry = {};
        headers.forEach((header, i) => {
            let value = values[i];
            if (header === 'Score') {
                value = parseFloat(value);
            } else if (['index', 'AbsPos1', 'AbsPos2'].includes(header)) {
                value = parseInt(value, 10);
            }
            entry[header] = value;
        });

        // Log des champs clés pour vérification
        console.log(`Ligne ${index + 2} :`, {
            Protein1: entry.Protein1,
            Protein2: entry.Protein2,
            AbsPos1: entry.AbsPos1,
            AbsPos2: entry.AbsPos2,
            Score: entry.Score
        });

        data.push(entry);
    });

    console.log(`Total lignes valides extraites : ${data.length}`);
    return data;
}
