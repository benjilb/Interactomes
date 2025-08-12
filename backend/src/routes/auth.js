import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

function signToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

// POST /auth/register
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body || {};
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ error: 'Champs requis manquants' });
        }
        const exists = await User.findOne({ where: { email } });
        if (exists) return res.status(409).json({ error: 'Email déjà utilisé' });

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await User.create({ firstName, lastName, email, passwordHash });
        const token = signToken(user);
        return res.status(201).json({ token, user: { id: user.id, firstName, lastName, email } });
    } catch (e) {
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(401).json({ error: 'Identifiants invalides' });

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(401).json({ error: 'Identifiants invalides' });

        const token = signToken(user);
        return res.json({ token, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email } });
    } catch (e) {
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /auth/me
router.get('/me', authRequired, async (req, res) => {
    const user = await User.findByPk(req.user.id, { attributes: ['id','firstName','lastName','email','createdAt'] });
    return res.json({ user });
});

export default router;
