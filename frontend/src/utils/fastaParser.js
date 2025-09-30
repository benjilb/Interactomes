export function parseFasta(text) {
    const entries = [];
    const lines = text.split(/\r?\n/);
    let current = null;

    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('>')) {
            if (current) {
                entries.push(current);
                console.log("+ Entrée ajoutée :", current);
            }

            const header = line;
            console.log("- Header FASTA :", header);

            // Extrait uniprot_id (entre les deux premiers |)
            const idMatch = header.match(/\|([A-Z0-9]+)\|/);
            const uniprot_id = idMatch ? idMatch[1] : null;
            if (!uniprot_id) console.warn("Uniprot ID non trouvé dans le header");

            // Extrait protein_name : texte entre 2ème '|' et " OS="
            let protein_name = null;
            const proteinNameMatch = header.match(/\|[A-Z0-9]+\|[^ ]+ (.+?) OS=/);
            if (proteinNameMatch) {
                protein_name = proteinNameMatch[1].trim();
            } else {
                console.warn("Nom de protéine non trouvé dans le header");
            }

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
                sequence: '',
            };

            console.log("🧬 Données extraites :", current);
        } else if (current && line.trim() !== '') {
            current.sequence += line.trim();
        }
    }

    if (current) {
        entries.push(current);
        console.log("➕ Dernière entrée ajoutée :", current);
    }

    console.log(`Total protéines parsées : ${entries.length}`);
    return entries;
}
