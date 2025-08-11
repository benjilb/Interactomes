import { sequelize } from '../models/index.js';


async function initDB() {
    try {
        console.log("Connecting to the database...");
        await sequelize.authenticate();
        console.log('🌱 ENV:', process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD);
        console.log('✅ Connexion DB OK');

        // Synchronisation des modèles
        await sequelize.sync({ alter: true }); // ou { force: true } pour reset complet
        console.log('✅ Tables synchronisées');
    } catch (err) {
        console.error('❌ Erreur de connexion:', err);
    }
}

initDB();


