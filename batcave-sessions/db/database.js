// Ce fichier ouvre la base SQLite et crée les tables.
// Il est importé par les autres fichiers, qui partagent donc la même connexion.

const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '..', 'database.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER'
  )
`);

// Bonus 3 : traçabilité des accès
db.exec(`
  CREATE TABLE IF NOT EXISTS connexions_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    action TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    timestamp TEXT NOT NULL
  )
`);

// action vaut 'LOGIN', 'LOGOUT' ou 'FRAUD'
function logAudit(username, action, req) {
    db.prepare(`
        INSERT INTO connexions_audit (username, action, ip_address, user_agent, timestamp)
        VALUES (?, ?, ?, ?, ?)
    `).run(
        username,
        action,
        req.ip,
        req.headers['user-agent'] || 'inconnu',
        new Date().toISOString()
    );
}

module.exports = { db, logAudit };
