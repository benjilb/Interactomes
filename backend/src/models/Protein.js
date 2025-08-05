// src/models/protein.model.js

import { pool } from '../config/database.js';

/**
 * Insère une protéine dans la base de données
 * @param {Object} protein - Objet avec les champs :
 * {
 *   uniprot_id,
 *   gene_name,
 *   protein_name,
 *   organism,
 *   organism_id,
 *   sequence
 * }
 */
export async function insertProtein(protein) {
    const [result] = await pool.query(`
    INSERT INTO protein (
      uniprot_id,
      gene_name,
      protein_name,
      organism,
      organism_id,
      sequence
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      gene_name = VALUES(gene_name),
      protein_name = VALUES(protein_name),
      organism = VALUES(organism),
      organism_id = VALUES(organism_id),
      sequence = VALUES(sequence)
  `, [
        protein.uniprot_id,
        protein.gene_name,
        protein.protein_name,
        protein.organism,
        protein.organism_id,
        protein.sequence
    ]);
    return result;
}

/**
 * Récupère toutes les protéines
 */
export async function getAllProteins() {
    const [rows] = await pool.query(`SELECT * FROM protein`);
    return rows;
}

/**
 * Supprime toutes les protéines (utile pour réinitialisation)
 */
export async function deleteAllProteins() {
    await pool.query(`DELETE FROM protein`);
}
