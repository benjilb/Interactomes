// backend/src/services/userService.js
import bcrypt from 'bcrypt';
import { User } from '../models/index.js';

export async function ensureSeedUser() {
    const email = 'admin@mail.com';
    let user = await User.findOne({ where: { email } });
    if (!user) {
        const password_hash = await bcrypt.hash('engellab', 12);
        user = await User.create({
            email,
            first_name: 'Caitlyn',
            last_name: 'McCafferty',
            password_hash
        });
    }
    return user;
}
