# Protocoles d'authentification

Deux TP réalisés en Node.js / Express autour de l'authentification.

## TP1 - `batcave-security` : authentification HTTP Basic

Les identifiants sont envoyés à chaque requête dans l'en-tête `Authorization`.

```bash
cd batcave-security
npm install
npm start          # http://localhost:3005
```

| Route | Description |
|---|---|
| `POST /register` | Inscription, mot de passe haché avec bcrypt (409 si le pseudo existe) |
| `GET /bat-computer` | Page protégée (réservée aux ADMIN) |
| `GET /api/secrets` | Liste des gadgets en JSON |
| `GET /api/me` | Identité de l'utilisateur authentifié |
| `POST /api/reports` | Enregistre une note de mission liée à l'utilisateur |
| `GET /logout` | Force le navigateur à oublier les identifiants |

Bonus : rôle `ADMIN` (403 sinon), table `logs`, blocage 30 s après 3 échecs.

Test en ligne de commande :
```bash
curl -u "batman:gotham123" http://localhost:3005/api/secrets
```

## TP2 - `batcave-sessions` : sessions et cookies

Le serveur délivre un badge éphémère (cookie `bat_identity`) au lieu de redemander
les identifiants à chaque requête.

```bash
cd batcave-sessions
npm install
cp .env.example .env    # puis générer une vraie clé (commande indiquée dans le fichier)
npm run seed            # crée batman (ADMIN) et robin (USER)
npm start               # http://localhost:3006
```

Comptes de test : `batman` / `gotham123` (ADMIN) et `robin` / `nightwing2024`.

| Route | Description |
|---|---|
| `GET /auth/login` | Formulaire de connexion |
| `POST /auth/login` | Vérifie le mot de passe et régénère la session |
| `GET /bat-computer` | Page protégée par le middleware `isAuthenticated` |
| `GET /auth/logout` | Détruit la session et efface le cookie |
| `GET /admin/audit` | Journal des connexions (ADMIN uniquement) |

Bonus : sessions stockées dans SQLite (elles survivent à un redémarrage),
contrôle de l'empreinte IP + navigateur, table `connexions_audit`.

### Arborescence du TP2

```
batcave-sessions/
├── server.js              point d'entrée, aucune route
├── seed.js                crée les comptes de test
├── .env                   PORT et SESSION_SECRET (non versionné)
├── db/database.js         connexion SQLite et tables
├── middlewares/authCheck.js
├── routes/auth.js         /auth/login, /auth/logout
├── routes/batcave.js      /bat-computer, /admin/audit
└── views/login.html
```
