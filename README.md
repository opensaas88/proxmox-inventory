# Proxmox Inventory

Inventorier un environnement **Proxmox VE**, comprendre ses allocations de ressources et préparer une migration de VM ou de conteneurs LXC. Interface en français, thèmes **clair, sombre et système**, et mode démo sans infrastructure.

L’application prépare des décisions : elle n’exécute aucune migration et ne modifie pas la configuration des machines Proxmox.

## Fonctionnalités

- **Inventaire VM** : recherche, filtres par état et nœud, tri au clavier, détails et export CSV.
- **Analyse** : répartition des OS, allocations CPU/RAM/disque et récapitulatif par nœud. Les graphiques et indicateurs du tableau de bord portent sur les VM hors templates, pas sur les LXC.
- **Plan de migration VM + LXC** : sélection d’une vague, comparaison avec un budget cible, points d’attention, checklist et notes, export JSON.
- **Confiance dans les données** : signalement des collectes partielles et des erreurs de rafraîchissement ; conservation du dernier inventaire en cas d’échec.
- **Confort** : préférence de thème mémorisée, suivi du thème système, affichage mobile et réduction des animations selon les préférences du navigateur.

## Démarrage rapide : développement local

Prérequis : **Node.js 24 LTS**, npm et Git. Le fichier `.nvmrc` permet d’utiliser `nvm use` si nvm est installé. Aucune base de données n’est nécessaire.

```bash
git clone https://github.com/opensaas88/proxmox-inventory.git
cd proxmox-inventory
npm ci --prefix backend
npm ci --prefix frontend
```

Lancer les deux services dans **deux terminaux**, depuis la racine du dépôt :

```bash
# Terminal 1 : API, port 3001
npm run dev --prefix backend
```

```bash
# Terminal 2 : interface et proxy /api, port 5173
npm run dev --prefix frontend -- --host 127.0.0.1 --strictPort
```

Ouvrir le port **5173** dans votre navigateur local, puis choisir **Démo** pour explorer l’application sans token ni serveur Proxmox. Les données fictives sont signalées dans le tableau de bord et dans le plan exporté.

Vérifier les services :

```bash
curl --fail http://127.0.0.1:3001/api/health
curl --fail http://127.0.0.1:5173/api/health
npm test --prefix frontend
npm run build --prefix frontend
```

Le premier endpoint doit retourner `{"status":"ok",...}` ; le second vérifie aussi le proxy Vite. Les tests couvrent les budgets, les données manquantes, les identifiants VM/LXC et l’encodage CSV. Le build est écrit dans `frontend/dist/`. `vite preview` ne remplace pas le proxy API configuré pour le développement : utilisez Vite en développement ou Nginx avec Docker.

## Connecter un serveur Proxmox

1. Vérifier que **la machine qui exécute le backend** peut joindre le nom DNS ou l’IP du serveur Proxmox sur son port HTTPS, généralement **8006**.
2. Créer un utilisateur/token dédié à la lecture dans **Datacenter → Permissions → API Tokens**. Affecter les ACL de lecture nécessaires, généralement le rôle `PVEAuditor` sur le périmètre inventorié avec propagation. Avec la séparation des privilèges, les droits du token et de l’utilisateur sont intersectés : les deux doivent être configurés.
3. Installer la CA du cluster comme décrit ci-dessous si son certificat n’est pas déjà reconnu.
4. Saisir l’hôte **sans `https://` ni chemin**, le port, le Token ID (`utilisateur@realm!nom-token`) et le secret dans l’écran de connexion.

Les informations du QEMU Guest Agent dépendent de sa présence, de son activation et des droits API de votre version de Proxmox. Des droits de lecture peuvent suffire à l’inventaire de base sans permettre toutes les requêtes à l’agent. L’interface signale les informations indisponibles ; évitez d’accorder un rôle administrateur pour faire disparaître un avertissement.

### Certificats HTTPS

La vérification TLS est activée. Pour une CA privée, obtenir le certificat CA auprès de l’administrateur du cluster par un canal fiable, puis démarrer l’API avec :

```bash
NODE_EXTRA_CA_CERTS=/chemin/absolu/pve-root-ca.pem npm run dev --prefix backend
```

Le certificat du serveur doit correspondre au nom d’hôte saisi. Utiliser le DNS du certificat plutôt qu’une IP qui ne figure pas dans ses SAN. La variable est lue au démarrage de Node : redémarrer le backend après une modification. Ne pas utiliser `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## Installation Docker Compose

Prérequis : Docker Engine et le plugin Docker Compose. Depuis la racine :

```bash
docker compose up --build -d
docker compose ps
curl --fail http://127.0.0.1:8080/api/health
docker compose logs --tail=100 backend frontend
```

L’interface est servie sur le port local **8080**. Nginx relaie `/api` au backend. Les ports publiés sont liés à `127.0.0.1` par défaut. `API_PORT` et `UI_PORT` permettent de changer les ports publiés :

```bash
UI_PORT=8081 API_PORT=3002 docker compose up --build -d
```

Pour une CA Proxmox privée, créer un fichier `compose.ca.yaml` **hors du dépôt** :

```yaml
services:
  backend:
    environment:
      NODE_EXTRA_CA_CERTS: /certs/pve-root-ca.pem
    volumes:
      - /chemin/absolu/pve-root-ca.pem:/certs/pve-root-ca.pem:ro
```

Puis utiliser `docker compose -f docker-compose.yml -f /chemin/compose.ca.yaml up --build -d`. Le chemin source doit pointer vers le certificat réel de votre cluster. Arrêter avec les mêmes fichiers Compose et `down`.

## Préparer une migration

Dans l’onglet **Migration** :

1. Sélectionner les VM et/ou LXC de la vague, hors templates.
2. Indiquer les ressources **disponibles sur la cible après réserve de sécurité** : budget vCPU, RAM et disque en GiB. Laisser vide ce qui n’est pas connu ; zéro signifie aucune capacité disponible.
3. Examiner les points d’attention pour chaque charge : OS non identifié, charge active, ressources manquantes ou particularités LXC.
4. Valider humainement les sauvegardes, le réseau, le stockage, les dépendances, la fenêtre de coupure et le retour arrière. Ajouter les responsables et procédures dans les notes.
5. Exporter le plan JSON. Les notes et sélections survivent au changement d’onglet, mais pas au rechargement de la page ou à la déconnexion.

Un résultat « Dans le budget déclaré » compare des allocations aux valeurs saisies. Il ne garantit ni performance, ni compatibilité, ni migration à chaud. Le disque exposé par l’inventaire n’est pas un audit exhaustif des volumes, snapshots ou montages. **Il n’existe pas encore de connecteur VMware ni d’orchestrateur de migration.** Voir [le guide d’analyse](docs/ANALYSE-MIGRATION.md).

## Configuration et architecture

```text
Navigateur → Vite (développement) / Nginx (Docker) → API Express → API Proxmox HTTPS
```

| Paramètre | Valeur par défaut | Rôle |
| --- | --- | --- |
| `PORT` | `3001` | Port d’écoute de l’API Node |
| `HOST` | `127.0.0.1` | Adresse d’écoute Node ; `0.0.0.0` dans Docker |
| `NODE_EXTRA_CA_CERTS` | non défini | Fichier PEM des autorités supplémentaires |
| `API_PORT` | `3001` | Port API publié par Compose |
| `UI_PORT` | `8080` | Port interface publié par Compose |

Le proxy de développement cible le port backend 3001. Si vous changez `PORT` en développement, adapter aussi `frontend/vite.config.js`.

- `backend/server.js` : endpoints `/api/health`, `/api/connect`, `/api/inventory`.
- `frontend/src/App.jsx` : connexion, inventaire, analyse et rafraîchissement.
- `frontend/src/components/` : thème et préparation de migration.
- `frontend/src/lib/migration.js` : calculs, points d’attention et export.
- `docs/` : analyse fonctionnelle et guide de contribution.

## Sécurité et publication

Le dépôt peut être public ; l’API déployée doit rester **réservée à des utilisateurs de confiance**. Elle n’intègre pas d’authentification applicative et accepte une destination Proxmox fournie par l’utilisateur. Ne pas exposer le backend directement sur Internet. Pour un accès partagé, prévoir un reverse proxy HTTPS avec authentification, une restriction réseau des destinations autorisées et des limites de requêtes.

Les builds Docker acceptent en option un secret BuildKit `proxy_ca` pour les réseaux utilisant une CA de proxy privée. Ce certificat est monté uniquement pendant `npm ci` et n’est pas copié dans l’image.

Les tokens sont conservés dans l’état React pendant la session, envoyés au backend pour interroger Proxmox, et supprimés de cet état à la déconnexion. Ils ne sont pas enregistrés dans `localStorage`, dans les plans ou dans le CSV. Seule la préférence de thème est mémorisée. Les exports et notes peuvent toutefois contenir des informations d’infrastructure : les traiter comme des documents internes.

Avant publication, examiner aussi l’historique Git et les captures d’écran déjà présentes dans le dépôt pour éviter de diffuser des informations internes. Aucun fichier de licence n’est fourni actuellement : choisir une licence avant de présenter le projet comme un logiciel open source réutilisable.

## Dépannage

| Symptôme | Vérification |
| --- | --- |
| `vite: not found` | Exécuter `npm ci --prefix frontend`, avec les dépendances de développement |
| Port déjà occupé | Arrêter votre ancien service ou choisir un port et adapter le proxy |
| Erreur TLS / `fetch failed` | CA, nom DNS/SAN du certificat, résolution et accès réseau depuis le backend |
| Réponse Proxmox 401/403 | Identifiant, expiration/révocation du token et ACL utilisateur + token |
| OS inconnu / inventaire partiel | Guest Agent, permissions et avertissements de collecte |
| Échec du rafraîchissement | Le dernier inventaire est conservé ; vérifier sa date et le message affiché |
| Budget cible inconnu | Renseigner la capacité et vérifier les allocations manquantes |

## Validation et contributions

Voir [CONTRIBUTING](docs/CONTRIBUTING.md). La compilation et les tests unitaires sont exécutés en CI. Les parcours démo, thèmes, export du plan et affichage mobile ont été vérifiés dans Chromium lors de cette évolution. Une connexion à un cluster réel reste nécessaire pour valider vos certificats, ACL et particularités d’infrastructure. Les images Docker ont été construites et démarrées ; le parcours démo et le proxy API Nginx ont été validés dans Chromium.
