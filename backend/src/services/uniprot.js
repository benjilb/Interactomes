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

    // ---- GO enrichis: {id, term, aspect} ----
    const xrefs = Array.isArray(j?.uniProtKBCrossReferences) ? j.uniProtKBCrossReferences : [];
    const goTerms = xrefs
        .filter(x => x?.database === 'GO' && x?.id)
        .map(x => {
            const raw = (x.properties || []).find(p => p.key === 'GoTerm')?.value || '';
            const sep = raw.indexOf(':');
            const letter = sep >= 0 ? raw.slice(0, sep) : '';
            const term   = sep >= 0 ? raw.slice(sep + 1) : null;
            const aspect = (letter === 'C' || letter === 'F' || letter === 'P') ? letter : null;
            return { id: x.id, term, aspect };
        })
        .filter(t => t.id && t.term && t.aspect);

    // On stocke une CHAÎNE JSON (colonne TEXT)
    const go_terms = JSON.stringify(goTerms);

    return { uniprot_id: uniprotId, taxon_id, gene_name, protein_name, sequence, length, go_terms };
}
/*
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
*/
export async function getOrganismFromAcc(acc) {
    const url = `https://rest.uniprot.org/uniprotkb/${encodeURIComponent(acc)}.json`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`UniProt ${acc} => ${r.status}`);
    const j = await r.json();
    const taxon_id        = j?.organism?.taxonId;
    const scientific_name = j?.organism?.scientificName || String(taxon_id);
    const common_name     = j?.organism?.commonName || null;
    if (!taxon_id) throw new Error(`No taxon for ${acc}`);
    return { taxon_id, scientific_name, common_name };
}
