# Contribuer

Utiliser Node.js 24 et installer les dépendances verrouillées :

```bash
npm ci --prefix backend
npm ci --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
node --check backend/server.js
```

Pour une modification d’interface, vérifier le mode démo en clair, sombre et système, le clavier, un écran mobile, la recherche, les onglets et l’export du plan. Vérifier qu’une capacité manquante reste inconnue et qu’un dépassement est visible. Un changement de thème doit survivre au rechargement ; les tokens ne doivent jamais être persistés.

Pour une modification backend, vérifier `/api/health`, le rejet des champs obligatoires manquants et les scénarios d’inventaire partiel. Utiliser un cluster de test ou un simulateur local HTTPS avec CA explicitement approuvée. Ne pas désactiver TLS pour faire passer un test.

Les tests unitaires du module de migration utilisent le runner natif Node. Ajouter des tests pour les règles métier modifiées. Dans une proposition de changement, préciser le problème, le comportement obtenu, les validations exécutées et leurs limites.

Ne pas committer de token, d’adresse privée réelle, d’export client ou de fichier `.env`. Ne pas mettre de secrets dans un ticket public. Le choix de licence appartient au propriétaire du projet.
