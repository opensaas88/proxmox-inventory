# Analyse et préparation de migration

## Ce que les données permettent de décider

L’inventaire indique les allocations déclarées des VM, leur état et leur nœud. Les mesures CPU/RAM des nœuds sont des observations ponctuelles. Ce ne sont pas des historiques de charge permettant, à eux seuls, de dimensionner une cible.

Le plan additionne les allocations de toutes les charges sélectionnées, même arrêtées. Les templates sont exclus. Les LXC participent au plan mais pas aux indicateurs VM du tableau de bord. Une allocation absente ne doit jamais être interprétée comme une validation de capacité.

## Méthode recommandée

1. **Collecter** : relever la date de l’inventaire et résoudre les avertissements qui touchent le périmètre de migration.
2. **Classer** : identifier les propriétaires, criticités, dépendances, données persistantes et objectifs de disponibilité.
3. **Dimensionner** : compléter l’inventaire avec la consommation historique, la réserve cible et la totalité des volumes/snapshots.
4. **Préparer** : choisir une petite vague pilote, documenter la synchronisation des données et la coupure acceptable.
5. **Valider** : tester une restauration, la compatibilité CPU/OS, les bridges/VLAN, les adresses, le stockage et les droits.
6. **Exécuter hors de cet outil** : utiliser les procédures Proxmox ou l’outil de migration adapté, avec un retour arrière testé.
7. **Recetter** : vérifier les services applicatifs, la performance, les sauvegardes, la supervision et les dépendances.

## Interprétation des états de capacité

| État | Signification |
| --- | --- |
| À renseigner / vérifier | Aucune charge sélectionnée, budget vide/invalide ou allocation incomplète |
| Capacité dépassée | Les allocations connues dépassent déjà le budget déclaré |
| Dans le budget déclaré | Les allocations renseignées tiennent dans le budget saisi ; autres contrôles toujours requis |

Le budget vCPU est un choix d’allocation. Il n’est pas automatiquement égal au nombre de cœurs physiques de la cible. Les besoins RAM/disque sont en GiB (1 GiB = 1 073 741 824 octets).

## État du code et limites

Les améliorations apportées couvrent la gestion des thèmes, le plan VM/LXC, les messages de collecte partielle, l’accessibilité des contrôles courants et la sécurité de l’export CSV. Le backend vérifie désormais les certificats TLS et borne chaque requête Proxmox à 15 secondes.

Limites restantes : absence d’historique de mesures, de modèle exhaustif des disques, de connecteur VMware, d’import de plan sauvegardé, de comparaison automatique de clusters, d’authentification applicative et d’exécution de migration. L’inventaire peut prendre du temps sur un grand cluster ; certains appels restent séquentiels et le délai Nginx est de 60 secondes. Les autorisations QEMU Guest Agent varient selon les versions.

Les plans JSON portent `schemaVersion: 1`, la date de l’inventaire, l’indication démo, le budget, les comparaisons, les notes et les points d’attention. Une checklist cochée représente une déclaration humaine, pas un test exécuté par le logiciel. Les avertissements de collecte doivent être résolus ou consignés avant de décider.
