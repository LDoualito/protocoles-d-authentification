const { logAudit } = require('../db/database');

// Vérifie que l'agent est connecté, c'est-à-dire que le login a bien
// rempli req.session.user lors d'une requête précédente.
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }

    // Le sujet demande "un 401 et une redirection". En HTTP les deux s'excluent :
    // un 401 ne déclenche aucune redirection, et une redirection est un 302.
    // On renvoie donc une redirection aux pages HTML, et un 401 aux appels fetch().
    if (req.accepts('html')) {
        return res.redirect('/auth/login');
    }

    return res.status(401).json({ message: 'Authentification requise' });
}

// Bonus 2 : un cookie volé et recollé dans un autre navigateur ne doit plus marcher.
// On compare l'empreinte (IP + navigateur) enregistrée au login avec celle de maintenant.
function checkFingerprint(req, res, next) {
    // Pas connecté : rien à comparer
    if (!req.session.user) {
        return next();
    }

    const currentIp = req.ip;
    const currentAgent = req.headers['user-agent'] || 'inconnu';

    if (req.session.ip !== currentIp || req.session.userAgent !== currentAgent) {
        console.warn(`ALERTE : empreinte suspecte pour ${req.session.user.username}`);
        logAudit(req.session.user.username, 'FRAUD', req);

        return req.session.destroy(() => {
            res.clearCookie('bat_identity');
            res.status(403).send(`
                <h1>Alerte intrusion</h1>
                <p>L'appareil ne correspond pas à celui de la connexion. Session détruite.</p>
                <a href="/auth/login">Retour a la connexion</a>
            `);
        });
    }

    next();
}

// Bonus 3 : la page d'audit est réservée aux administrateurs
function isAdmin(req, res, next) {
    if (req.session.user.role !== 'ADMIN') {
        return res.status(403).send('<h1>403 - Acces refuse</h1><a href="/bat-computer">Retour</a>');
    }

    next();
}

module.exports = { isAuthenticated, checkFingerprint, isAdmin };
