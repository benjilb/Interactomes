import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors'

//import proteinRoutes from './routes/protein.routes.js';
import crosslinkRoutes from './routes/crosslinkRoutes.js';
//import uploadRoutes from './routes/upload.routes.js';

const app = express();
app.use(express.json());

// 🔧 Convertir __dirname (nécessaire avec ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔓 Servir les CSV de référence
app.use('/static/csv', express.static(path.join(__dirname, '../static/csv')));
app.use(cors())

// 🔁 Tes routes API
app.use('/api/crosslinks', crosslinkRoutes);
//app.use('/api/proteins', proteinRoutes);
//app.use('/api/upload', uploadRoutes);


// 🚀 Lancement serveur
app.listen(3001, () => {
    console.log('Backend is running on port 3001');
});
