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

    // ---- GO enrichis: [{id, term, aspect}] -> string JSON en DB
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
    const go_terms = JSON.stringify(goTerms);

// ---- Subcellular locations -> JSON string
    const comments = Array.isArray(j?.comments) ? j.comments : [];

// on normalise le commentType pour matcher "SUBCELLULAR LOCATION" et "SUBCELLULAR_LOCATION"
    const isSubLoc = (ct) =>
        String(ct || '')
            .replace(/[\s_]+/g, '')
            .toUpperCase() === 'SUBCELLULARLOCATION';

    const sublocComments = comments.filter(c => isSubLoc(c?.commentType));

    function mapEvidences(arr) {
        if (!Array.isArray(arr)) return [];
        const out = [];
        const seen = new Set();
        for (const ev of arr) {
            const e = {
                evidenceCode: ev?.evidenceCode || null,
                source:       ev?.source       || null,
                id:           ev?.id           || null,
            };
            const sig = `${e.evidenceCode}|${e.source}|${e.id}`;
            if (e.evidenceCode || e.source || e.id) {
                if (!seen.has(sig)) { seen.add(sig); out.push(e); }
            }
        }
        return out;
    }

    const collected = [];

// 1) subcellularLocations[]: on prend location/topology/orientation quand présents
    for (const c of sublocComments) {
        const entries = Array.isArray(c?.subcellularLocations) ? c.subcellularLocations : [];
        for (const e of entries) {
            for (const kind of ['location', 'topology', 'orientation']) {
                const o = e?.[kind];
                if (!o || !o.value) continue;
                collected.push({
                    kind,                            // "location" | "topology" | "orientation"
                    id:    o.id || '',               // ex: "SL-0090" (peut être vide pour topology/orientation)
                    value: String(o.value).trim(),
                    evidences: mapEvidences(o.evidences),
                });
            }
        }

        // 2) note.texts[] éventuellement associées (on les marque en kind="note")
        const texts = Array.isArray(c?.note?.texts) ? c.note.texts : [];
        for (const t of texts) {
            const v = String(t?.value || '').trim();
            if (!v) continue;
            collected.push({
                kind: 'note',
                id:   '',
                value: v,
                evidences: mapEvidences(t?.evidences),
            });
        }
    }

// 3) dédoublonnage par (kind|id|value) en fusionnant les evidences
    const sublocMerged = (() => {
        const map = new Map();
        for (const x of collected) {
            const key = `${x.kind}|${x.id}|${x.value}`.toUpperCase();
            if (!map.has(key)) {
                map.set(key, { ...x, evidences: [...(x.evidences || [])] });
            } else {
                const acc = map.get(key);
                acc.evidences = mapEvidences([...(acc.evidences || []), ...(x.evidences || [])]);
            }
        }
        return Array.from(map.values());
    })();

    const subcellular_locations = JSON.stringify(sublocMerged);

    // ---- STRING cross-refs -> "id;id;id"
    const stringIds = xrefs
        .filter(x => x?.database === 'STRING' && x?.id)
        .map(x => String(x.id).trim())
        .filter(Boolean);
    const string_refs = stringIds.join(';');

    return {
        uniprot_id: uniprotId,
        taxon_id,
        gene_name,
        protein_name,
        sequence,
        length,
        go_terms,
        subcellular_locations,
        string_refs,
    };
}

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
