import { DataTypes } from 'sequelize';
import sequelize from '../database/config.js';

const Dataset = sequelize.define('Dataset', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    organism_taxon_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false }, // FK -> organisms.id (option A)
    organelle_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    filename: { type: DataTypes.STRING(512), allowNull: false },
    file_sha256: { type: DataTypes.CHAR(64), allowNull: true },
    rows_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    status: { type: DataTypes.ENUM('uploaded','parsed','validated','failed'), allowNull: false, defaultValue: 'uploaded' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    tableName: 'datasets',
    timestamps: false,
    indexes: [
        { fields: ['organism_taxon_id', 'organelle_id', 'user_id'] },
        { unique: true, fields: ['user_id', 'filename'] } // uq_dataset_user_file
    ]
});

export default Dataset;
