# Vérification SEO de prépublication

Vérification effectuée sur l’URL de prévisualisation le 15 août 2026. La landing est rendue côté serveur avec le titre **CommerceBoost974 | Le copilote numérique des professionnels réunionnais**, une meta description métier et une donnée structurée `SoftwareApplication`.

| Contrôle | Résultat de prévisualisation | Action production |
| --- | --- | --- |
| Titre et meta description | Présents et cohérents avec la cible Réunion. | Conserver et valider le libellé final. |
| Donnée structurée JSON-LD | Présente pour `SoftwareApplication`. | Tester à nouveau sur le domaine public. |
| Canonical | Absente volontairement sans `CANONICAL_ORIGIN`. | Définir le domaine HTTPS définitif avant publication. |
| Robots spécifique | Absente pour la landing indexable. | Vérifier `/robots.txt` sur le domaine public. |
| Sitemap | Route serveur disponible. | Vérifier `/sitemap.xml` et les boutiques publiées après activation. |

Le contrôle de prévisualisation confirme que `robots.txt` autorise les pages publiques, exclut `/app` et `/admin`, puis référence le sitemap. Le sitemap XML contient la landing; aucune boutique n’y apparaît tant qu’aucune entreprise active et publiée n’existe dans l’environnement de recette.

> La canonical et les URLs de sitemap ne doivent pas être figées sur un domaine de prévisualisation. Elles sont activées par la configuration `CANONICAL_ORIGIN` du domaine réellement publié.
