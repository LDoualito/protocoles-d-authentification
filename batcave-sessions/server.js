// Point d'entrée : il ne contient aucune route.
// Il configure Express, la session, puis branche les routeurs.

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);

const { db } = require('./db/database');
const authRouter = require('./routes/auth');
const batcaveRouter = require('./routes/batcave');
const { checkFingerprint } = require('./middlewares/authCheck');

const app = express();
const PORT = process.env.PORT;

// Sans ce middleware, req.body est vide pour un formulaire HTML classique
// (express.json() ne lit que le JSON, pas les formulaires).
app.use(express.urlencoded({ extended: true }));

app.use(session({
    name: 'bat_identity',              // masque le nom par defaut (connect.sid)
    secret: process.env.SESSION_SECRET, // clé qui signe le cookie, jamais dans le code
    resave: false,                     // n'enregistre pas la session si rien n'a changé
    saveUninitialized: false,          // pas de session créée pour un visiteur anonyme
    // Bonus 1 : les sessions sont écrites dans SQLite au lieu de la RAM,
    // donc elles survivent à un redémarrage du serveur.
    store: new SqliteStore({
        client: db,
        expired: { clear: true, intervalMs: 900000 }
    }),
    cookie: {
        httpOnly: true,     // le JS du navigateur ne peut pas lire le cookie (anti-XSS)
        sameSite: 'strict', // le cookie n'est pas envoyé depuis un autre site (anti-CSRF)
        maxAge: 1800000     // 30 minutes en millisecondes
        // secure: true      // à activer en production : cookie envoyé uniquement en HTTPS
    }
}));

// Bonus 2 : contrôle de l'empreinte sur chaque requête
app.use(checkFingerprint);

app.use('/auth', authRouter);
app.use('/', batcaveRouter);

app.listen(PORT, () => {
    console.log(`Serveur demarre sur http://localhost:${PORT}`);
});
