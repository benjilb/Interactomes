import { Protein } from '../models/index.js';
import { Op } from 'sequelize';

const UNIPROT_ENTRY = (acc) => `https://rest.uniprot.org/uniprotkb/${encodeURIComponent(acc)}.json`;

// --- throttle simple pour l'API ---
const CONCURRENCY = 4;
function pLimit(limit) {
    const q = [];
    let active = 0;
    const next = () => {
        if (!q.length || active >= limit) return;
        active++;
        const { fn, resolve, reject } = q.shift();
        fn().then(
            (v) => { active--; resolve(v); next(); },
            (e) => { active--; reject(e); next(); }
        );
    };
    return (fn) => new Promise((resolve, reject) => { q.push({ fn, resolve, reject }); next(); });
}
const limit = pLimit(CONCURRENCY);

function isBadAccession(acc) {
    if (!acc) return true;
    const up = String(acc).toUpperCase();
    return up === 'NA' || up === 'N/A' || up === 'NULL' || up === '-' || up.includes('AMBIGUOUS') || (up.startsWith('__') && up.endsWith('__'));
}


// --- Helpers de parsing UniProt JSON ---
function getGeneName(entry) {
    try { return entry?.genes?.[0]?.geneName?.value || null; } catch { return null; }
}
function getProteinName(entry) {
    try { return entry?.proteinDescription?.recommendedName?.fullName?.value || null; } catch { return null; }
}
function getSequence(entry) {
    try { return { seq: entry?.sequence?.value || null, len: entry?.sequence?.length ?? null }; } catch { return { seq: null, len: null }; }
}
function getReviewed(entry) { try { return Boolean(entry?.reviewed); } catch { return false; } }
function getUpdatedAt(entry) {
    return entry?.lastUpdated
        || entry?.entryAudit?.lastUpdated
        || entry?.entryAudit?.lastAnnotationUpdateDate
        || null;
}
function getTaxonId(entry) { return entry?.organism?.taxonId || null; }
function getGOTerms(entry) {
    try {
        const xrefs = entry?.uniProtKBCrossReferences || [];
        const gos = xrefs.filter(x => x.database === 'GO');
        return gos.map(g => {
            const id = g.id || null;
            const prop = (g.properties || []).find(p => (p.key || '').toLowerCase() === 'goterm' || (p.key || '').toLowerCase() === 'term');
            const v = prop?.value || null; // "C: nucleus", "P: ..." etc.
            let aspect = null, term = v;
            if (v && v.includes(':')) {
                const [a, rest] = v.split(':', 2);
                aspect = a?.trim() || null;
                term = rest?.trim() || v;
            }
            return { id, term, aspect };
        });
    } catch { return []; }
}

function mapEntryToProteinPayload(entry, datasetTaxId) {
    const uniprot_id = entry?.primaryAccession || null;
    const source_tax_id = getTaxonId(entry) || null;
    const gene_name = getGeneName(entry);
    const protein_name = getProteinName(entry);
    const { seq: sequence, len: length } = getSequence(entry);
    const reviewed = getReviewed(entry);
    const updated_at = getUpdatedAt(entry);
    const go_terms = getGOTerms(entry);

    return {
        uniprot_id,
        taxon_id: datasetTaxId ?? null,
        source_tax_id,
        gene_name: gene_name || null,
        protein_name: protein_name || null,
        sequence: sequence || null,
        length: typeof length === 'number' ? length : null,
        reviewed,
        updated_at: updated_at ? new Date(updated_at) : new Date(),
        go_terms: go_terms?.length ? JSON.stringify(go_terms) : null,
    };
}

async function fetchUniProtEntry(uniprotId) {
    const res = await fetch(UNIPROT_ENTRY(uniprotId), { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`UniProtKB HTTP ${res.status} for ${uniprotId}`);
    return res.json();
}

/**
 * ensureProteinsForOrganism(uniprotIds, taxId, transaction?)
 * - uniprotIds: string[]
 * - taxId: le taxonomic id (NCBI/UniProt) du dataset → sera écrit dans proteins.taxonid
 */
// src/services/proteinService.js
export async function ensureProteinsForOrganism(uniprotIds, taxId, transaction = null) {
    if (!Number.isInteger(taxId)) throw new Error(`ensureProteinsForOrganism: invalid taxId "${taxId}"`);
    const uniq = Array.from(new Set(uniprotIds.filter(Boolean).map(s => String(s).trim())));

    // 1) déjà en DB ?
    const existing = await Protein.findAll({
        attributes: ['uniprot_id'],
        where: { uniprot_id: { [Op.in]: uniq } },
        transaction
    });
    const have = new Set(existing.map(x => x.uniprot_id));
    const missing = uniq.filter(u => !have.has(u));

    // log les hits
    if (have.size) {
        console.log(`[proteinService] déjà en DB: ${have.size}/${uniq.length}`);
        // si tu veux loguer les 30 premiers:
        // console.log('  ex:', Array.from(have).slice(0,30).join(', '));
    }

    // 2) fetch UniProt seulement pour les manquantes
    for (const uid of missing) {
        try {
            const entry = await fetchUniProtEntry(uid);
            const payload = mapEntryToProteinPayload(entry, taxId);
            await Protein.upsert(payload, { transaction });
            console.log(`[proteinService] upsert OK: ${uid}`);
        } catch (e) {
            console.error(`[proteinService] fetch/upsert KO ${uid}: ${e.message}`);
            const [row, created] = await Protein.findOrCreate({
                where: { uniprot_id: uid },
                defaults: { uniprot_id: uid, taxon_id: taxId },
                transaction
            });
            console.log(`[proteinService] ${created ? 'created' : 'exists'} minimal: ${uid}`);
        }
    }
}


export default { ensureProteinsForOrganism };
