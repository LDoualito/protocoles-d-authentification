// Script a lancer une seule fois : cree deux comptes de test.
// Usage : node seed.js

const bcrypt = require('bcrypt');
const { db } = require('./db/database');

const comptes = [
    { username: 'batman', password: 'gotham123', role: 'ADMIN' },
    { username: 'robin', password: 'nightwing2024', role: 'USER' }
];

for (const compte of comptes) {
    const existe = db.prepare('SELECT id FROM users WHERE username = ?').get(compte.username);

    if (existe) {
        console.log(`${compte.username} existe deja, ignore.`);
        continue;
    }

    const hash = bcrypt.hashSync(compte.password, 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
      .run(compte.username, hash, compte.role);

    console.log(`${compte.username} cree (${compte.role}).`);
}
