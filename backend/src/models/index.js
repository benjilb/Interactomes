import sequelize from '../database/config.js';

import User from './User.js';
import Organism from './Organism.js';
import Organelle from './Organelle.js';
import Protein from './Protein.js';
import Dataset from './Dataset.js';
import Crosslink from './Crosslink.js';

// Protein ↔ Organism (via taxon_id)
Protein.belongsTo(Organism, { foreignKey: 'taxon_id', targetKey: 'taxon_id', as: 'organism' });
Organism.hasMany(Protein, { foreignKey: 'taxon_id', sourceKey: 'taxon_id', as: 'proteins' });
// Dataset → User / Organism (id) / Organelle
Dataset.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Dataset, { foreignKey: 'user_id', as: 'datasets' });

Dataset.belongsTo(Organism, { foreignKey: 'organism_taxon_id', targetKey: 'taxon_id', as: 'organism' });
Organism.hasMany(Dataset, { foreignKey: 'organism_taxon_id', sourceKey: 'taxon_id', as: 'datasets' });

Dataset.belongsTo(Organelle, { foreignKey: 'organelle_id', as: 'organelle' });
Organelle.hasMany(Dataset, { foreignKey: 'organelle_id', as: 'datasets' });

// Crosslink → Dataset / Proteins (par uniprot_id)
Crosslink.belongsTo(Dataset, { foreignKey: 'dataset_id', as: 'dataset' });
Dataset.hasMany(Crosslink, { foreignKey: 'dataset_id', as: 'crosslinks' });

Crosslink.belongsTo(Protein, { foreignKey: 'protein1_uid', targetKey: 'uniprot_id', as: 'Protein1' });
Crosslink.belongsTo(Protein, { foreignKey: 'protein2_uid', targetKey: 'uniprot_id', as: 'Protein2' });

export {
    sequelize,
    User,
    Organism,
    Organelle,
    Protein,
    Dataset,
    Crosslink
};
