// Routeur : regroupe les routes de connexion / déconnexion.
// Il est monté sur '/auth' dans server.js, donc '/login' devient '/auth/login'.

const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const { db, logAudit } = require('../db/database');

const router = express.Router();

// 1. Le formulaire de connexion
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'login.html'));
});

// 2. Le traitement de la connexion
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    // bcrypt.compare rehache le mot de passe saisi et le compare au hash stocké
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).send(`
            <h1>Identifiants invalides</h1>
            <a href="/auth/login">Reessayer</a>
        `);
    }

    // Fixation de session : on détruit l'ancienne session et on en génère une
    // nouvelle, pour qu'un identifiant de session préparé à l'avance par un
    // pirate devienne inutilisable une fois la victime connectée.
    req.session.regenerate((err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur serveur');
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role
        };

        // Bonus 2 : on mémorise l'empreinte de l'appareil utilisé pour se connecter
        req.session.ip = req.ip;
        req.session.userAgent = req.headers['user-agent'] || 'inconnu';

        logAudit(user.username, 'LOGIN', req);

        res.redirect('/bat-computer');
    });
});

// 3. La déconnexion : détruire la session ET effacer le cookie
router.get('/logout', (req, res) => {
    if (req.session.user) {
        logAudit(req.session.user.username, 'LOGOUT', req);
    }

    req.session.destroy(() => {
        res.clearCookie('bat_identity');
        res.redirect('/auth/login');
    });
});

module.exports = router;
