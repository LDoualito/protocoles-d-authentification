// Routeur des pages protégées, monté sur '/' dans server.js.

const express = require('express');
const { db } = require('../db/database');
const { isAuthenticated, isAdmin } = require('../middlewares/authCheck');

const router = express.Router();

router.get('/', (req, res) => {
    res.redirect('/auth/login');
});

// La route protégée : isAuthenticated s'exécute avant, et n'appelle next()
// que si une session valide existe.
router.get('/bat-computer', isAuthenticated, (req, res) => {
    const user = req.session.user;

    // Lien vers l'audit affiché seulement pour les administrateurs
    const adminLink = user.role === 'ADMIN'
        ? '<a class="btn btn-secondary" href="/admin/audit">Journal des connexions</a>'
        : '';

    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <title>Bat-Ordinateur</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body class="container py-5">
            <h1>Bienvenue, Justicier ${user.username}</h1>
            <p class="text-muted">Role : ${user.role}</p>
            <p>Votre badge est valable 30 minutes.</p>
            ${adminLink}
            <a class="btn btn-dark" href="/auth/logout">Se deconnecter</a>
        </body>
        </html>
    `);
});

// Bonus 3 : consultation du journal, réservée aux administrateurs
router.get('/admin/audit', isAuthenticated, isAdmin, (req, res) => {
    const logs = db.prepare('SELECT * FROM connexions_audit ORDER BY id DESC').all();

    // On construit une ligne de tableau HTML par enregistrement
    const rows = logs.map(log => `
        <tr>
            <td>${log.username}</td>
            <td>${log.action}</td>
            <td>${log.ip_address}</td>
            <td>${log.user_agent}</td>
            <td>${log.timestamp}</td>
        </tr>
    `).join('');

    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <title>Journal des connexions</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body class="container py-5">
            <h1>Journal des connexions</h1>
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Utilisateur</th>
                        <th>Action</th>
                        <th>Adresse IP</th>
                        <th>Navigateur</th>
                        <th>Horodatage</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <a class="btn btn-dark" href="/bat-computer">Retour</a>
        </body>
        </html>
    `);
});

module.exports = router;
