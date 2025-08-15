import { fetch } from 'undici';
const BASE = 'https://rest.uniprot.org';

// 1) Trouver le taxon à partir d'un UniProt ID (pour les CSV)
export async function getTaxonIdFromAcc(uniprotId) {
    const url = `${BASE}/uniprotkb/search?query=accession:${encodeURIComponent(uniprotId)}&fields=accession,organism_id&format=json&size=1`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`UniProt search failed (${r.status}) for ${uniprotId}`);
    const j = await r.json();
    const item = j?.results?.[0];
    const tax = item?.organism?.taxonId ?? item?.organism?.id ?? item?.organism_id;
    if (!tax) throw new Error('No taxonId for accession ' + uniprotId);
    return Number(tax);
}

// 2) Infos protéine pour remplir ta table 'proteins'
export async function getProteinInfo(uniprotId) {
    const url = `${BASE}/uniprotkb/${encodeURIComponent(uniprotId)}.json`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`UniProt entry failed (${r.status}) for ${uniprotId}`);
    const j = await r.json();

    const protein_name =
        j?.proteinDescription?.recommendedName?.fullName?.value ||
        j?.proteinDescription?.submissionNames?.[0]?.fullName?.value ||
        j?.uniProtkbId || null;

    const gene_name = j?.genes?.[0]?.geneName?.value || null;
    const sequence  = j?.sequence?.value || null;
    const length    = j?.sequence?.length ?? (sequence ? sequence.length : null);
    const taxon_id  = j?.organism?.taxonId ?? null;

    // GO terms
    let go_terms = '';
    const xrefs = j?.uniProtKBCrossReferences || [];
    const gos = xrefs.filter(x => x?.database === 'GO').map(x => x.id).filter(Boolean);
    if (gos.length) go_terms = gos.join(';');

    return { uniprot_id: uniprotId, taxon_id, gene_name, protein_name, sequence, length, go_terms };
}
