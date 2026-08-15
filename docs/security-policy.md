# Politique de sécurité applicative

Les autorisations ne sont jamais déléguées au navigateur. Chaque procédure privée valide l’adhésion active de l’utilisateur à l’entreprise ciblée, puis son rôle. Les données de deux entreprises ne sont donc pas jointes ni modifiées sur la seule base d’un identifiant transmis par le client.

| Mutation sensible | Rôle autorisé | Politique partagée | Journal d’audit |
| --- | --- | --- |
| Création d’entreprise | Utilisateur authentifié | 4 par heure et utilisateur | `business.created` |
| Profil, onboarding, paramètres, publication | Propriétaire; gestionnaire pour le profil | 100, 30, 30 ou 12 par heure et utilisateur/entreprise | `business.*` |
| Catégories et produits | Propriétaire ou gestionnaire | 100 par heure et utilisateur/entreprise | `category.*`, `product.*` |
| Promotions | Propriétaire ou gestionnaire | 60 par heure et utilisateur/entreprise | `promotion.*` |
| Mise à jour d’un client | Propriétaire ou gestionnaire | 120 par heure et utilisateur/entreprise | `customer.updated` |
| Statut de commande | Propriétaire, gestionnaire ou collaborateur | 120 par heure et utilisateur/entreprise | `order.status_updated` |
| Commande publique | Visiteur | 8 demandes par 10 minutes et adresse réseau | `order.public_created` |

Les compteurs sont stockés dans la table partagée `rate_limit_buckets`, ce qui conserve l’effet de limitation lorsque l’application s’exécute sur plusieurs instances. L’adresse réseau ou l’identifiant utilisateur est d’abord transformé en empreinte SHA-256; aucune valeur brute n’est enregistrée. Les compteurs expirés sont supprimés de façon opportuniste pendant les appels concernés, sans minuteur en mémoire.

Les mutations métier sensibles produisent une entrée `audit_logs` portant le tenant, l’acteur, l’action, l’entité et, si utile, un contexte non sensible. Les erreurs retournées au client restent compréhensibles mais n’exposent ni détail de base de données ni secret.
