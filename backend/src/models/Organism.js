import { DataTypes } from 'sequelize';
import sequelize from '../database/config.js';

const Organism = sequelize.define('Organism', {
    taxon_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    common_name: { type: DataTypes.STRING(255), allowNull: true }
}, {
    tableName: 'organisms',
    timestamps: false
});


export default Organism;
