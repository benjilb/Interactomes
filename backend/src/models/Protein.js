import { DataTypes } from 'sequelize';
import sequelize from '../database/config.js';

const Protein = sequelize.define('Protein', {
    uniprot_id: { type: DataTypes.STRING(20), primaryKey: true },   // PK = UniProt
    taxon_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false }, // FK -> organisms.taxon_id
    gene_name: { type: DataTypes.STRING(255) },
    protein_name: { type: DataTypes.STRING(512) },
    sequence: { type: DataTypes.TEXT('medium') },
    // length calculé côté SQL dans ton init.sql : si tu veux l’avoir côté app, tu peux le recalculer au besoin
    length: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    go_terms: { type: DataTypes.TEXT }, // "GO:0008150;GO:0003674;..."
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    tableName: 'proteins',
    timestamps: false,
    indexes: [
        { fields: ['taxon_id'] },
        { fields: ['gene_name'] }
    ]
});

export default Protein;
