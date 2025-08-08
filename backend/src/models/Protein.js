import { DataTypes } from 'sequelize';
import sequelize from '../database/config.js';

const Protein = sequelize.define('Protein', {
    uniprot_id: {
        type: DataTypes.STRING(20),
        allowNull: false,
        primaryKey: true,
        unique: true
    },
    gene_name: {
        type: DataTypes.STRING(100),
    },
    protein_name: {
        type: DataTypes.STRING(255),
    },
    organism: {
        type: DataTypes.STRING(255),
    },
    organism_id: {
        type: DataTypes.INTEGER,
    },
    sequence: {
        type: DataTypes.TEXT,
    }
}, {
    tableName: 'proteins',
    timestamps: false
});

export default Protein;
