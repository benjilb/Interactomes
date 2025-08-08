import { DataTypes } from 'sequelize';
import sequelize from '../database/config.js';
import Protein from './Protein.js';

const Crosslink = sequelize.define('Crosslink', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    protein1_id: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    protein2_id: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    abspos1: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    abspos2: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    score: {
        type: DataTypes.FLOAT
    }
}, {
    tableName: 'crosslinks',
    timestamps: false
});

// Relations (Foreign Keys)
Crosslink.belongsTo(Protein, {
    foreignKey: 'protein1_id',
    targetKey: 'uniprot_id',
    as: 'Protein1'
});

Crosslink.belongsTo(Protein, {
    foreignKey: 'protein2_id',
    targetKey: 'uniprot_id',
    as: 'Protein2'
});


export default Crosslink;
