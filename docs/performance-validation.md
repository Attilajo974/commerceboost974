# Mesure de performance de base

La compilation de production a été exécutée après le découpage asynchrone des pages. La landing, l’onboarding, le catalogue, le tableau de bord, la boutique et les modules secondaires sont désormais chargés en modules séparés.

| Artefact de production | Taille brute | Taille gzip | Lecture |
| --- | ---: | ---: | --- |
| Bundle commun | 688,9 kio | 204,3 kio | À optimiser avant une campagne à fort trafic. |
| Landing | 33,0 kio | 4,2 kio | Chargée à la demande. |
| Catalogue | 36,7 kio | 5,0 kio | Chargé après accès au portail. |
| Tableau de bord | 27,3 kio | 3,6 kio | Chargé après accès au portail. |
| Boutique publique | 22,9 kio | 3,3 kio | Chargée à la demande. |

Le contrôle de build est réussi. Le découpage réduit le coût des pages métier pour un visiteur de la landing, mais le bundle partagé reste au-dessus du budget indicatif de 200 kio gzip. Une analyse de dépendances et un découpage manuel des bibliothèques d’interface constituent la prochaine optimisation recommandée.
