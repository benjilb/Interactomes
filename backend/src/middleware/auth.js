import jwt from 'jsonwebtoken';

export function authRequired(req, res, next) {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Token manquant' });

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: payload.id, email: payload.email };
        return next();
    } catch (e) {
        return res.status(401).json({ error: 'Token invalide' });
    }
}