# Réconciliation des migrations

La migration métier initiale a rencontré une collision légitime avec la table `users`, déjà créée par la migration d’initialisation du modèle d’identité. Les tables métier avaient été créées avant l’arrêt; la migration a donc été réconciliée pour ne contenir que les contraintes et index encore manquants. Cette opération a évité toute suppression ou altération destructive de données.

| Ordre | Migration locale | Empreinte SHA-256 | État enregistré en base |
| --- | --- | --- | --- |
| 0 | `0000_right_next_avengers` | `814a08e40d7fc2bcfd458759d18319198ca8ae394f2fa15617a78678e9c9c93b` | Appliquée |
| 1 | `0001_shallow_killer_shrike` | `5d5566719d0737a9cb3d5d6b18d69d9fde47d66897502bc22bbe5877bb391e9d` | Appliquée |
| 2 | `0002_workable_tyrannus` | `40624cf8bd8dd72ac0fd68ba3c565edae2d2ba55a428188ffd513f1c95f222c4` | Appliquée |

La comparaison entre le journal local `drizzle/meta/_journal.json` et `__drizzle_migrations` confirme le même ordre chronologique et les mêmes empreintes. La base contient les **18 tables métier attendues**, **25 clés étrangères** et **21 index nommés** du modèle CommerceBoost974. Les contraintes structurantes incluent l’isolement par entreprise, les liens de commandes, les produits ciblés par promotions, les usages IA, les notifications et les abonnements.

> Le schéma est cohérent avec les migrations locales au moment de cette vérification. Toute évolution ultérieure doit être ajoutée au schéma Drizzle, générée, relue puis appliquée par migration avant livraison.
