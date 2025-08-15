// Déduit l’organite depuis le nom de fichier.
// Renvoie 'allCell' si ça semble "toute cellule" ou si on ne matche rien.
export function guessOrganelleNameFromFilename(filename) {
    const f = (filename || '').toLowerCase();

    // ordre important : les patterns spécifiques avant les génériques
    const patterns = [
        { pat: /(cilia|cilium|ciliary)/,                                  name: 'Cilia' },
        { pat: /(mito(chond(ri(a|on))?)?|(^|[^a-z])mt[^a-z])/,            name: 'Mitochondrion' },
        { pat: /(chloroplast|plastid)/,                                   name: 'Chloroplast' },
        { pat: /(nucleus|nuclear)/,                                       name: 'Nucleus' },
        { pat: /(peroxi)/,                                                name: 'Peroxisome' },
        { pat: /(golgi)/,                                                 name: 'Golgi apparatus' },
        { pat: /(lysos)/,                                                 name: 'Lysosome' },
        { pat: /\b(er|endoplasmic)\b/,                                    name: 'Endoplasmic reticulum' },
        { pat: /(vacuole)/,                                               name: 'Vacuole' },
        { pat: /(cytosol|cytoplasm|cytosolic)/,                           name: 'Cytosol' },
        { pat: /(whole[-_\s]?cell|all[-_\s]?cell|cell[-_\s]?wide|lysate|total[-_\s]?cell)/, name: 'allCell' },
    ];

    const hit = patterns.find(p => p.pat.test(f));
    return hit?.name || 'allCell';
}
