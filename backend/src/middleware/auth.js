import jwt from 'jsonwebtoken';

export function authRequired(req, res, next) {
    // Laisse passer les prévols CORS
    if (req.method === 'OPTIONS') return next();

    const hdr = req.headers.authorization || '';
    if (!/^Bearer\s+/i.test(hdr)) {
        return res.status(401).json({ error: 'Token manquant' });
    }

    const token = hdr.replace(/^Bearer\s+/i, '');
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        const uid =
            payload.id ??
            (payload.sub ? Number(payload.sub) : undefined) ??
            payload.user_id;

        if (!uid) {
            return res.status(401).json({ error: 'Token invalide (id absent)' });
        }

        req.user = {
            id: uid,
            email: payload.email,
            first_name: payload.first_name,
            last_name: payload.last_name,
            // ajoute d’autres champs si tu en as besoin
        };

        next();
    } catch (e) {
        return res.status(401).json({ error: 'Token invalide' });
    }
}
