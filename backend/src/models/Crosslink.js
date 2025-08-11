import { DataTypes } from 'sequelize';
import sequelize from '../database/config.js';

const Crosslink = sequelize.define('Crosslink', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    dataset_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    protein1_uid: { type: DataTypes.STRING(20), allowNull: false }, // FK -> proteins.uniprot_id
    protein2_uid: { type: DataTypes.STRING(20), allowNull: false }, // FK -> proteins.uniprot_id
    abspos1: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    abspos2: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    score: { type: DataTypes.FLOAT}
}, {
    tableName: 'crosslinks',
    timestamps: false,
    indexes: [
        { fields: ['dataset_id'] },
        { fields: ['protein1_uid'] },
        { fields: ['protein2_uid'] },
        { fields: ['protein1_uid', 'protein2_uid'] },
        { name: 'fields crosslinks', unique: true, fields: ['dataset_id', 'protein1_uid', 'protein2_uid', 'abspos1', 'abspos2'] }
    ]
});

export default Crosslink;
