import { DataTypes } from 'sequelize';
import sequelize from '../database/config.js';

const Organelle = sequelize.define('Organelle', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false, unique: true }
}, {
    tableName: 'organelles',
    timestamps: false
});

export default Organelle;
