// src/models/crosslink.model.js

import { pool } from '../config/database.js';

/**
 * Insère un crosslink dans la base de données
 * @param {Object} crosslink - Objet avec les champs :
 * {
 *   score,
 *   protein1_uniprot_id,
 *   protein2_uniprot_id,
 *   absolute_position1,
 *   absolute_position2
 * }
 */
export async function insertCrosslink(crosslink) {
    const [result] = await pool.query(`
    INSERT INTO crosslink (
      score,
      protein1_uniprot_id,
      protein2_uniprot_id,
      absolute_position1,
      absolute_position2
    ) VALUES (?, ?, ?, ?, ?)
  `, [
        crosslink.score,
        crosslink.protein1_uniprot_id,
        crosslink.protein2_uniprot_id,
        crosslink.absolute_position1,
        crosslink.absolute_position2
    ]);
    return result;
}

/**
 * Récupère tous les crosslinks
 */
export async function getAllCrosslinks() {
    const [rows] = await pool.query(`SELECT * FROM crosslink`);
    return rows;
}

/**
 * Supprime tous les crosslinks (utile pour réimportation)
 */
export async function deleteAllCrosslinks() {
    await pool.query(`DELETE FROM crosslink`);
}
