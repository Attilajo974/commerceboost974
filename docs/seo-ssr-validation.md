# Validation SEO et SSR

Les surfaces publiques de CommerceBoost974 sont rendues côté serveur. La landing, les boutiques publiées et les pages de confidentialité et mentions légales reçoivent un HTML initial avec titre, description, canonical, Open Graph et Twitter Card. Les routes `/app` et `/admin` restent intentionnellement non indexables.

| Vérification de production | Résultat |
| --- | --- |
| Landing SSR | Le contenu « Développez votre activité » est présent dans le HTML initial. |
| Pages légales SSR | Les contenus de confidentialité et mentions légales sont présents dans le HTML initial. |
| Balises sociales | `og:title`, `og:description`, `twitter:title` et `twitter:description` sont présents. |
| Canonical | Présent pour la landing et les pages légales lorsque `CANONICAL_ORIGIN` est renseigné. |
| Portail privé | Réponse HTML avec directive `noindex, follow`. |
| Sitemap et robots | Les routes servent la liste des boutiques publiées et la politique de crawl. |

La vérification a été exécutée localement contre la build de production avec `CANONICAL_ORIGIN=http://localhost:4102` et `SITE_NAME=CommerceBoost974`. Avant publication, `CANONICAL_ORIGIN` doit recevoir le domaine public définitif.
