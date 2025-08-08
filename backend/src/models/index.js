import { Sequelize, DataTypes } from 'sequelize';
import ProteinModel from './Protein.js';
import CrosslinkModel from './Crosslink.js';
import config from '../database/config.js';

const sequelize = new Sequelize(config);

const Protein = ProteinModel(sequelize, DataTypes);
const Crosslink = CrosslinkModel(sequelize, DataTypes);

export { sequelize, Protein, Crosslink };
