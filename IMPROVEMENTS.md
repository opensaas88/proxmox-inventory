# Améliorations & optimisations

Pistes proposées, classées par priorité. Chaque item indique l'**impact**,
l'**effort** estimé et l'emplacement concerné.

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

---

## 🔒 Sécurité (prioritaire)

### 1. Ne pas désactiver la vérification TLS globalement 🟡
`backend/server.js:5` fait `process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"`, ce
qui désactive la validation TLS pour **tout** le process → exposition au MITM.
- **Reco** : utiliser un `https.Agent({ rejectUnauthorized: false })` **par
  requête** (option opt-in), ou mieux, épingler l'empreinte/CA du certificat
  Proxmox fournie à la connexion.

### 2. Restreindre CORS 🟢
`app.use(cors())` autorise toutes les origines (`backend/server.js:10`). En prod
le front passe par Nginx (même origine) : limiter via
`cors({ origin: process.env.ALLOWED_ORIGIN })`.

### 3. Ne pas exposer le backend sur l'hôte 🟢
`docker-compose.yml` publie `3001` sur l'hôte, ce qui permet de contourner Nginx.
Retirer le mapping de ports (le réseau Docker interne suffit, Nginx proxifie
`/api`).

### 4. Validation des entrées & garde anti-SSRF 🟡
Le backend `fetch()` l'hôte fourni par l'utilisateur : valider `host`
(format IP/FQDN), `port` (1–65535) et, si déploiement multi-utilisateurs,
restreindre les cibles via une allowlist pour éviter le balayage du réseau interne.

### 5. En-têtes de sécurité Nginx 🟢
Ajouter dans `nginx.conf` : `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy`, et une `Content-Security-Policy`.

### 6. Rate limiting 🟢
`express-rate-limit` sur `/api/connect` et `/api/inventory` pour limiter le
brute-force de tokens.

### 7. Gestion des secrets 🟡
Le secret du token transite à chaque requête (navigateur → backend). Option :
session serveur courte (cache du token côté backend avec TTL + identifiant de
session opaque renvoyé au client) pour ne pas re-transmettre le secret à chaque
rafraîchissement.

---

## ⚡ Performance / optimisations

### 8. Code-splitting du bundle frontend 🟡
Le bundle fait **~572 kB** (Recharts pèse lourd). Charger l'onglet *Analytique*
en `React.lazy()` / `Suspense` et configurer `build.rollupOptions.output.manualChunks`
(séparer `recharts`). Gain attendu : premier rendu nettement plus léger.

### 9. Concurrence bornée côté backend 🟡
L'inventaire déclenche des `Promise.all` non bornés (config + agent **par VM**)
→ sur un gros cluster, des centaines de requêtes simultanées vers Proxmox.
Introduire une limite de concurrence (`p-limit`, ex. 8) et aplatir
l'enrichissement des VMs en un seul lot au lieu de la boucle `for...of`
séquentielle par nœud (`server.js:94`).

### 10. Cache serveur de l'inventaire 🟢
Chaque rafraîchissement re-balaye tout le cluster. Ajouter un cache mémoire à TTL
(ex. 15–30 s) clé par `host`, avec en-tête d'âge, pour absorber les
rafraîchissements rapprochés.

### 11. Mémoïsation des données de graphes 🟢
`realVms.map(...).sort(...)` est recalculé à chaque rendu dans le JSX du
graphe « RAM/stockage par VM » : le passer dans un `useMemo`.

---

## 🧹 Maintenabilité

### 12. Découper `App.jsx` (~760 lignes) 🟡
Extraire dans `frontend/src/` : `components/` (KPICard, Badge, ProgressBar,
StatusDot, ChartTooltip), `screens/` (ConnectionScreen, Dashboard),
`lib/format.js` (formatBytes, toGiB, getOsMeta…), `data/demo.js`.

### 13. Lint + format 🟢
Ajouter ESLint (`eslint-plugin-react`, `react-hooks`) + Prettier et un script
`npm run lint`. Aucun garde-fou actuellement.

### 14. Tests 🟡
- Backend : tests des transformations (`pveRequest`, mapping VM/nœud) avec `fetch`
  mocké (Vitest/Jest + nock).
- Frontend : tests des utilitaires (`formatBytes`, `getOsMeta`, filtres/tri) et
  un smoke test de rendu (Vitest + Testing Library).

### 15. Clarifier `Claude.md` 🟢
Ce fichier est un *prompt* d'assistant, pas de la doc projet. Le déplacer (ex.
`docs/agent-prompt.md`) pour éviter la confusion avec le README.

### 16. Variables d'environnement backend 🟢
Exposer `ALLOWED_ORIGIN`, `PVE_TLS_INSECURE`, `CACHE_TTL`, `REQUEST_CONCURRENCY`
via `.env` plutôt que des constantes en dur.

---

## 🚀 Fonctionnalités (déjà à portée de main)

### 17. Afficher les conteneurs LXC 🟢
Le backend renvoie déjà `containers` mais l'UI les ignore. Ajouter un onglet ou
une section (mêmes colonnes que les VMs).

### 18. Afficher le stockage 🟡
`storage` est récupéré mais non affiché. Ajouter des cartes d'utilisation par
datastore (barre util %, total/used/avail) — proche de l'écran *Backup Server* de
la suite OpenSaaS.

### 19. Interfaces réseau / IP dans le détail VM 🟢
`net_interfaces` (nom + IPs) est déjà renvoyé : l'afficher dans le panneau de
détail de la VM.

### 20. Auto-refresh configurable 🟢
Sélecteur `Off / 30s / 1m / 5m` (comme la barre OVHcloud Monitor) avec
`setInterval` + nettoyage.

### 21. Persistance de la connexion 🟢
Conserver les identifiants en `sessionStorage` pour ne pas perdre la session au
rechargement de la page (avec avertissement de sécurité).

### 22. Bascule thème clair/sombre 🟡
Les autres apps OpenSaaS ont un *toggle* (icône lune). Réintroduire un mode
sombre via classe `dark:` Tailwind, le clair restant par défaut.

### 23. i18n FR/EN 🟡
Externaliser les libellés (interface aujourd'hui en français en dur) pour gérer
le bouton `EN` présent dans la charte.

---

## 🛠 DevOps

### 24. CI GitHub Actions 🟢
Workflow : `npm ci` + `lint` + `build` (front) et `npm ci` (back) sur PR.

### 25. Épingler les images de base 🟢
Figer `node:20-alpine` et `nginx:alpine` sur un *digest* pour des builds
reproductibles ; ajouter un *healthcheck* au service frontend.

---

### Ordre de mise en œuvre suggéré

1. **Sécurité** : #1, #2, #3, #5 (rapides, fort impact).
2. **Perf** : #8, #9, #10.
3. **Valeur produit** : #17, #18, #19, #20.
4. **Qualité** : #12, #13, #14, #24.
