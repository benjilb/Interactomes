import sequelize from './config.js';
import Protein from '../models/Protein.js';
import Crosslink from '../models/Crosslink.js';

async function initDB() {
    try {
        console.log("Connecting to the database...");
        await sequelize.sync();
        console.log('🌱 ENV:', process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD);
        await sequelize.authenticate();
        console.log('✅ Connexion DB OK');

        // Synchronisation des modèles
        await sequelize.sync({ alter: true }); // ou { force: true } pour reset complet
        console.log('✅ Tables synchronisées');
    } catch (err) {
        console.error('❌ Erreur de connexion:', err);
    }
}

initDB();


