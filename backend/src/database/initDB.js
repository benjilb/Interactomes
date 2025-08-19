// src/database/initDB.js
import sequelize from './config.js';
const wait = (ms)=>new Promise(r=>setTimeout(r,ms));

(async () => {
    for (let i=1;i<=20;i++){
        try {
            console.log('Connecting to the database...');
            console.log('🌱 ENV:', process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD);
            await sequelize.authenticate();
            console.log('✅ DB connected');
            await sequelize.sync({ alter: true });
            console.log('✅ Tables synced');
            return;
        } catch (e) {
            console.error(`❌ Erreur de connexion: ${e}`);
            await wait(1500);
        }
    }
    console.error('⚠️ DB indisponible après retries — l’API démarre quand même, mais les routes DB échoueront.');
})();



