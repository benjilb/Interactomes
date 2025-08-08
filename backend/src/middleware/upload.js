// backend/middleware/upload.middleware.js
import multer from 'multer';
import path from 'path';

// Config: où stocker les fichiers
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Dossier de destination
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName); // Nom du fichier
    }
});

const upload = multer({ storage });

export default upload;
