const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3005;

// Bonus : compteur d'échecs gardé en mémoire vive.
// Exemple : { batman: { count: 2, blockedUntil: 0 } }
const failedAttempts = {};

const db = new Database(path.join(__dirname, 'database.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER'
  )
`);

// La table users a peut-être été créée avant le bonus, donc sans la colonne role.
// PRAGMA table_info décrit les colonnes existantes : on ajoute role seulement si elle manque.
const columns = db.prepare('PRAGMA table_info(users)').all();
const hasRole = columns.some(col => col.name === 'role');

if (!hasRole) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'USER'");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    timestamp TEXT NOT NULL
  )
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/register', async (req, res) => {
    let { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    username = username.trim();

    if (username.includes(' ')) {
        return res.status(400).json({ message: 'Username cannot contain spaces' });
    }

    if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
        stmt.run(username, hashedPassword);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(409).json({ message: 'Username already exists' });
        } else {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
});


function basicAuthmiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Batcave"');
        return res.status(401).json({ message: 'Authentication required' });
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    // Bonus : cet utilisateur est-il bloqué suite à 3 échecs ?
    const attempt = failedAttempts[username];

    if (attempt && attempt.blockedUntil > Date.now()) {
        const secondsLeft = Math.ceil((attempt.blockedUntil - Date.now()) / 1000);
        return res.status(429).json({ message: `Trop de tentatives. Réessayez dans ${secondsLeft}s.` });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user || !bcrypt.compareSync(password, user.password)) {
        // Bonus : on compte l'échec, et au 3e on bloque pendant 30 secondes
        const current = failedAttempts[username] || { count: 0, blockedUntil: 0 };
        current.count++;

        if (current.count >= 3) {
            current.blockedUntil = Date.now() + 30000;
            current.count = 0;
        }

        failedAttempts[username] = current;

        res.setHeader('WWW-Authenticate', 'Basic realm="Batcave"');
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Connexion réussie : on remet le compteur à zéro
    delete failedAttempts[username];

    // Bonus : on trace l'accès dans la table logs
    db.prepare('INSERT INTO logs (username, timestamp) VALUES (?, ?)')
      .run(user.username, new Date().toISOString());

    req.user = { id: user.id, username: user.username, role: user.role };
    next();
}

// Bonus : 401 = "je ne sais pas qui tu es", 403 = "je sais qui tu es, mais tu n'as pas le droit"
function requireAdmin(req, res, next) {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Accès refusé' });
    }

    next();
}

app.get('/bat-computer', basicAuthmiddleware, requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'bat-computer.html'));
});

const gadgets = [
    { name: 'Batarang', desc: 'Arme de jet emblématique', icon: 'fa-shuriken' },
    { name: 'Grappin', desc: 'Pour escalader les gratte-ciels de Gotham', icon: 'fa-link' },
    { name: 'Batmobile', desc: 'Véhicule blindé tout-terrain', icon: 'fa-car' },
    { name: 'Spray anti-requins', desc: 'Pour éloigner les requins', icon: 'fa-fish' },
];

app.get('/api/secrets', basicAuthmiddleware, requireAdmin, (req, res) => {
    res.json(gadgets);
});

app.get('/api/me', basicAuthmiddleware, requireAdmin, (req, res) => {
    res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

app.post('/api/reports', basicAuthmiddleware, requireAdmin, (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Report content is required' });
    }

    const stmt = db.prepare('INSERT INTO reports (content, user_id) VALUES (?, ?)');
    stmt.run(content, req.user.id);
    res.status(201).json({ message: 'Report submitted successfully' });
});

// Bonus : en Basic Auth il n'y a pas de session à détruire côté serveur, c'est le
// navigateur qui garde les identifiants en cache. On change le realm à chaque appel
// pour qu'il considère que ses identifiants ne valent plus pour cet espace.
app.get('/logout', (req, res) => {
    res.setHeader('WWW-Authenticate', `Basic realm="Batcave-${Date.now()}"`);
    res.status(401).json({ message: 'Déconnecté' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
