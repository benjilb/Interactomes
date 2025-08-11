// src/services/organelleService.js
import { Organelle } from '../models/index.js';
import { Op, fn, col, where } from 'sequelize';

/**
 * Retourne l'organite par son nom, en le créant s'il n'existe pas.
 * - Utilise `name` comme identifiant fonctionnel (UNIQUE dans la table).
 * - Normalise en trim; pour un vrai match insensible à la casse, active l'option ci-dessous.
 */
export async function ensureOrganelleByName(nameRaw) {
    if (!nameRaw || typeof nameRaw !== 'string') {
        throw new Error('ensureOrganelleByName: "nameRaw" doit être une chaîne non vide');
    }

    const name = nameRaw.trim();
    if (!name) {
        throw new Error('ensureOrganelleByName: nom vide après trim()');
    }

    // OPTION A (simple) : dépend de la collation de la colonne `name` (utf8mb4_general_ci → insensible à la casse)
    const [organelle] = await Organelle.findOrCreate({
        where: { name },
        defaults: { name }
    });
    return organelle;

    // OPTION B (si tu veux forcer l’insensibilité à la casse côté SQL, quelle que soit la collation) :
    // const found = await Organelle.findOne({
    //   where: where(fn('LOWER', col('name')), name.toLowerCase())
    // });
    // if (found) return found;
    // return await Organelle.create({ name });
}
