// backend/src/services/crosslinkService.js

function parseFilename(fileName) {
    const base = fileName.replace(/\.[^.]+$/, '');
    const parts = base.split('_');
    if (parts.length < 2) return null;
    const organismName = parts[0].trim();
    const organelleName = parts.slice(1).join('_').trim();
    return { organismName, organelleName };
}

// --- helpers ---

function cleanAcc(v) {
    return String(v ?? '').trim();
}

function isBadAccession(acc) {
    if (!acc) return true;
    const up = acc.toUpperCase();
    // valeurs à ignorer
    if (up === 'NA' || up === 'N/A' || up === 'NULL' || up === '-') return true;
    if (up.includes('AMBIGUOUS')) return true;          // ex: ___AMBIGUOUS___
    if ((acc.startsWith('__') && acc.endsWith('__'))) return true; // pattern bidon générique
    return false;
}

function normalizeRow(row) {
    let p1 = cleanAcc(row.uniprot1 || row.Protein1 || row.protein1);
    let p2 = cleanAcc(row.uniprot2 || row.Protein2 || row.protein2);

    // p2 <- p1 si vide/NA/ambiguous/etc.
    if (isBadAccession(p2)) p2 = p1;

    // on skippe la ligne si p1 est invalide
    if (isBadAccession(p1)) return null;

    const abspos1 = Number(row.abspos1 ?? row.AbsPos1 ?? row.pos1 ?? row.Position1 ?? null);
    const abspos2 = Number(row.abspos2 ?? row.AbsPos2 ?? row.pos2 ?? row.Position2 ?? null);
    const rawScore = row.score ?? row.Score ?? null;
    const score = rawScore === null || rawScore === '' ? null : Number(rawScore);

    if (!Number.isFinite(abspos1) || !Number.isFinite(abspos2)) return null;

    return {
        protein1_uid: p1,
        protein2_uid: p2,
        abspos1: Math.trunc(abspos1),
        abspos2: Math.trunc(abspos2),
        score
    };
}

export { parseFilename, normalizeRow };

// ---- UniProt: récupération du taxon à partir d’un UniProt ID ----
export async function getOrganismFromProtein(uniprotId) {
    const entryUrl = `https://rest.uniprot.org/uniprotkb/${encodeURIComponent(uniprotId)}.json`;
    const entryRes = await fetch(entryUrl, { headers: { accept: 'application/json' } });
    if (!entryRes.ok) throw new Error(`UniProtKB protein HTTP ${entryRes.status} for ${uniprotId}`);
    const entry = await entryRes.json();

    const taxId = entry?.organism?.taxonId || entry?.organism?.taxonID || entry?.organism?.taxId;
    if (!taxId) throw new Error(`No taxon ID on UniProt entry for ${uniprotId}`);

    const taxUrl = `https://rest.uniprot.org/taxonomy/${encodeURIComponent(taxId)}.json`;
    const taxRes = await fetch(taxUrl, { headers: { accept: 'application/json' } });
    if (!taxRes.ok) throw new Error(`UniProt taxonomy HTTP ${taxRes.status} for taxId ${taxId}`);
    const tax = await taxRes.json();

    const scientificName = tax?.scientificName || entry?.organism?.scientificName || null;
    const commonName = tax?.commonName || entry?.organism?.commonName || null;

    return {
        tax_id: Number(taxId),
        name: scientificName || 'Unknown organism',
        common_name: commonName || null,
    };
}
