import fs from 'fs';

export function parseFasta(filePath) {
    const text = fs.readFileSync(filePath, 'utf-8');
    const entries = [];
    const lines = text.split(/\r?\n/);
    let current = null;

    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('>')) {
            if (current) entries.push(current);

            const header = line;
            const idMatch = header.match(/\|([A-Z0-9]+)\|/);
            const uniprot_id = idMatch ? idMatch[1] : null;

            const proteinNameMatch = header.match(/\|[A-Z0-9]+\|[^ ]+ (.+?) OS=/);
            const protein_name = proteinNameMatch ? proteinNameMatch[1].trim() : null;

            const gnMatch = header.match(/GN=([\w\-]+)/);
            const gene_name = gnMatch ? gnMatch[1] : null;

            const osMatch = header.match(/OS=([^OXPESV]+)(?= OX=| GN=| PE=| SV=|$)/);
            const organism = osMatch ? osMatch[1].trim() : null;

            const oxMatch = header.match(/OX=(\d+)/);
            const organism_id = oxMatch ? parseInt(oxMatch[1], 10) : null;

            current = {
                uniprot_id,
                protein_name,
                gene_name,
                organism,
                organism_id,
                sequence: ''
            };
        } else if (current && line !== '') {
            current.sequence += line;
        }
    }

    if (current) entries.push(current);
    return entries;
}
