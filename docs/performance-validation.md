# Mesure de performance de base

La compilation de production a été exécutée après le découpage asynchrone des pages et le découpage manuel des dépendances. La landing, l’onboarding, le catalogue, le tableau de bord, la boutique et les modules secondaires sont chargés en modules séparés.

| Artefact de production | Taille brute | Taille gzip | Lecture |
| --- | ---: | ---: | --- |
| Point d’entrée applicatif | 133,1 kio | 37,0 kio | Réduit après séparation des dépendances. |
| Dépendances React | 217,3 kio | 69,4 kio | Cacheable séparément. |
| Données tRPC / React Query | 99,2 kio | 27,4 kio | Cacheable séparément. |
| Composants et icônes UI | 91,5 kio | 27,4 kio | Cacheable séparément. |
| Catalogue | 17,3 kio | 3,4 kio | Chargé après accès au portail. |
| Tableau de bord | 12,6 kio | 2,5 kio | Chargé après accès au portail. |
| Onboarding | 12,3 kio | 2,9 kio | Chargé après accès au portail. |
| Rendu SSR | 72,6 kio | — | Bundle serveur dédié. |

Le contrôle de build est réussi. Le précédent chunk unique de 512,6 kio (153,5 kio gzip) est désormais réparti entre un point d’entrée léger et trois dépendances cacheables, sans avertissement de chunk unique supérieur à 500 kio. Les mesures de terrain (LCP, INP et CLS) restent à collecter sur le domaine final avec un trafic représentatif.
