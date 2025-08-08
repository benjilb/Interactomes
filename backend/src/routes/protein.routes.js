import express from 'express';
import { insertProteinsFromFASTA } from '../controllers/protein.controller.js';


const router = express.Router();
router.post('/upload-fasta', insertProteinsFromFASTA);
export default router;
