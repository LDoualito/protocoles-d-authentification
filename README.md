# Protocoles d'authentification

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
