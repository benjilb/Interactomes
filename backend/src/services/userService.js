// src/services/userService.js
import { User } from '../models/index.js';

export async function ensureSeedUser(email='importer@local') {
    const [u, created] = await User.findOrCreate({
        where: { email },
        defaults: { email, first_name: 'Importer', last_name: 'Bot', password_hash: 'x' }
    });
    console.log(`[userService] user ${created ? 'created' : 'exists'} #${u.id} <${email}>`);
    return u;
}
