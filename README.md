# Proxmox Inventory

Tableau de bord web d'inventaire pour un cluster **Proxmox VE**. Il se connecte à
l'API Proxmox via un *API Token* en lecture seule et présente une vue claire des
nœuds, machines virtuelles, conteneurs et ressources — au look & feel **OpenSaaS**
(thème clair, accent vert).

> ⚡ Aucune installation d'agent côté Proxmox : un simple token `PVEAuditor` suffit.

![stack](https://img.shields.io/badge/React-18-61dafb) ![stack](https://img.shields.io/badge/Express-4-000000) ![stack](https://img.shields.io/badge/Tailwind-3-38bdf8) ![stack](https://img.shields.io/badge/Docker-Compose-2496ed)

---

## ✨ Fonctionnalités

- **Connexion par API Token** (hôte, port, token ID + secret) ou **mode Démo** sans backend.
- **KPI globaux** : VMs actives/totales, vCPU alloués vs cœurs physiques, RAM, stockage, uptime moyen.
- **Cartes par nœud** : statut, charge CPU/RAM, nombre de VMs.
- **Inventaire des VMs** : recherche, filtres (état, nœud, templates), tri multi-colonnes, panneau de détail, export **CSV**.
- **Conteneurs LXC** : onglet dédié listant les conteneurs du cluster.
- **Stockage** : cartes d'utilisation par datastore (used/total, espace dispo).
- **Analytique** : distribution des OS, allocation par nœud, RAM/stockage par VM, récapitulatif et ratios de sur-allocation (chargé à la demande / *lazy*).
- **Auto-refresh** configurable (Off / 30s / 1m / 5m).
- **Enrichissement via QEMU Guest Agent** : OS détecté et interfaces réseau/IP (si l'agent est installé), affichées dans le détail de la VM.

---

## 🏗 Architecture

```
                    ┌─────────────────────────────┐
   Navigateur  ──►  │  Frontend (React + Nginx)    │   :8080
                    │  - SPA Vite                  │
                    │  - /api/* → proxy backend    │
                    └──────────────┬──────────────┘
                                   │ (réseau Docker interne)
                    ┌──────────────▼──────────────┐
                    │  Backend (Express)           │   :3001
                    │  - /api/connect              │
                    │  - /api/inventory            │
                    │  - /api/health               │
                    └──────────────┬──────────────┘
                                   │ HTTPS (token PVEAPIToken)
                    ┌──────────────▼──────────────┐
                    │  Proxmox VE  /api2/json      │   :8006
                    └─────────────────────────────┘
```

Le backend agit comme **proxy** : le navigateur n'appelle jamais Proxmox
directement (évite les soucis CORS / certificat auto-signé). Les identifiants ne
sont **pas persistés** côté serveur — ils transitent dans le corps de chaque
requête et restent en mémoire du navigateur.

### Stack

| Couche    | Technologies |
|-----------|--------------|
| Frontend  | React 18, Vite 5, Tailwind CSS 3, Recharts, lucide-react |
| Backend   | Node 20, Express 4, `fetch` natif |
| Déploiement | Docker, Docker Compose, Nginx (reverse proxy + statique) |

---

## 🚀 Démarrage rapide (Docker Compose)

```bash
git clone https://github.com/opensaas88/proxmox-inventory.git
cd proxmox-inventory

# (optionnel) ajuster les ports exposés
cp .env .env.local   # puis éditer si besoin

docker compose up -d --build
```

L'interface est disponible sur **http://localhost:8080**. Le backend n'est pas
publié sur l'hôte : il est joint par Nginx via le réseau Docker interne.

| Variable           | Défaut  | Rôle |
|--------------------|---------|------|
| `UI_PORT`          | `8080`  | Port HTTP de l'interface (Nginx) |
| `PVE_TLS_INSECURE` | `true`  | `false` pour exiger un certificat TLS Proxmox valide |
| `ALLOWED_ORIGIN`   | *(vide)*| Restreint CORS à une origine (recommandé en prod) |

---

## 🔑 Créer un API Token Proxmox

1. **Datacenter → Permissions → API Tokens → Add**
2. Utilisateur : `root@pam` (ou un utilisateur dédié).
3. **Token ID** : ex. `monitoring` → identifiant complet `root@pam!monitoring`.
4. Décocher *Privilege Separation* **ou** attribuer le rôle **`PVEAuditor`**
   (lecture seule) sur `/` via **Datacenter → Permissions → Add → API Token Permission**.
5. Copier le **secret** affiché (visible une seule fois).

Dans l'interface, renseigner : `Hôte/IP`, `Port` (8006), `Token ID`
(`root@pam!monitoring`) et `Token Secret`.

---

## 🧑‍💻 Développement local (hors Docker)

**Backend**
```bash
cd backend
npm install
npm run dev          # node --watch, écoute sur :3001
```

**Frontend**
```bash
cd frontend
npm install
npm run dev          # Vite sur :5173, proxy /api → :3001
```

Build de production du frontend : `npm run build` (sortie dans `dist/`).

---

## 🌐 API Backend

| Méthode | Endpoint         | Corps | Réponse |
|---------|------------------|-------|---------|
| `GET`   | `/api/health`    | —     | `{ status, timestamp }` |
| `POST`  | `/api/connect`   | `{ host, port?, tokenId, tokenSecret }` | `{ success, version }` |
| `POST`  | `/api/inventory` | `{ host, port?, tokenId, tokenSecret }` | `{ timestamp, nodes, vms, containers, storage }` |

L'inventaire interroge en parallèle : `/nodes`, `/nodes/{n}/qemu`, la `config`
de chaque VM, l'agent (`get-osinfo`, `network-get-interfaces`), `/lxc` et
`/storage`. Les appels à l'agent ont un *timeout* (3 s) pour ne pas bloquer si
l'agent est absent.

---

## 📁 Structure du projet

```
proxmox-inventory/
├── backend/
│   ├── server.js          # API Express + proxy Proxmox
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # UI complète (connexion + dashboard)
│   │   ├── index.css      # thème (cartes, couleurs, utilitaires)
│   │   └── main.jsx
│   ├── tailwind.config.js # palette de marque (vert OpenSaaS)
│   ├── nginx.conf         # SPA + reverse proxy /api
│   └── Dockerfile         # build Vite → image Nginx
├── docker-compose.yml
└── .env                   # ports hôte (UI_PORT, API_PORT)
```

---

## 🎨 Thème

Le design suit la charte **OpenSaaS** : fond clair `#f4f5f7`, cartes blanches
arrondies, accent **vert emerald** (`#10b981`), tuiles d'icônes pastel et badges
en pilules. La palette est centralisée dans `frontend/tailwind.config.js` (clé
`pve`) et les styles de cartes dans `frontend/src/index.css` (`.glass-panel`).

---

## 🔒 Sécurité & limites connues

- Le backend désactive la vérification TLS (`NODE_TLS_REJECT_UNAUTHORIZED=0`)
  pour accepter les certificats auto-signés de Proxmox — voir
  [`IMPROVEMENTS.md`](./IMPROVEMENTS.md) pour le durcissement recommandé.
- CORS est ouvert par défaut et le port backend est exposé sur l'hôte : à
  restreindre en production.
- Les pistes d'amélioration (sécurité, performance, maintenabilité, features)
  sont détaillées dans **[`IMPROVEMENTS.md`](./IMPROVEMENTS.md)**.

---

## 📄 Licence

Projet interne OpenSaaS.
