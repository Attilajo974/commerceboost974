# Matrice finale de conformité — cahier des charges CommerceBoost974

Cette matrice distingue les éléments **implémentés** dans le projet, les éléments **préparés mais non activés** et les éléments qui nécessitent une **action humaine**. Elle est la base du verdict de prépublication; un statut préparé ne signifie pas qu’une configuration réelle a été validée.

| Exigence | Statut | Preuves de projet | Action restante |
| --- | --- | --- | --- |
| SaaS full-stack connecté | Implémenté | React, Express, tRPC, Drizzle, migrations et procédures dans `client/`, `server/`, `drizzle/`. | Aucune technique. |
| Authentification et routes protégées | Implémenté | OAuth, `protectedProcedure`, `adminProcedure`, tests auth et accès. | Tester avec l’identité de production. |
| Multi-tenant et rôles | Implémenté et testé | `memberships`, `requireBusinessAccess`, `multitenant.isolation.test.ts`. | Aucune technique. |
| Catalogue, catégories, promotions | Implémenté | Routers catalogue, UI et tests. | Recette pilote souhaitée. |
| Boutique publique, panier, commandes | Implémenté | SSR, `publicShop`, checkout côté serveur et tests commerce. | Recette avec catalogue réel publié. |
| Clients et historique de commande | Implémenté | Routers commerce, interface clients et tests de statut. | Recette avec données réelles. |
| Analytics | Implémenté sous plan | `analytics.ts`, contrôle Business/Pro. | Définir l’offre commerciale effective. |
| IA | Implémenté sous plan | `ai.ts`, limites mensuelles, audit, tests succès/erreur. | Vérifier modèle et quotas en production. |
| Automatisations | Implémenté sous plan | Heartbeat, `automation.ts`, handler hebdomadaire, tests. | Publier avant de créer les jobs utilisateur. |
| Administration | Implémenté | `admin.ts`, rôle admin et tests positif/négatif. | Attribuer les administrateurs légitimes. |
| Plans Starter/Business/Pro | Implémenté | `billing/plans.ts`, matrice et tests de droits serveur. | Définir les prix réels dans Stripe. |
| Checkout, portail et webhooks Stripe | Préparé, désactivé | `billing.ts`, `stripe.ts`, `webhook.ts`, garde de configuration et tests. | Créer les trois Price IDs réels, valider Stripe et configurer le webhook. |
| Données personnelles et suppression | Implémenté | `privacy.ts`, interface, marqueur de suppression OAuth, tests RGPD. | Valider les textes juridiques. |
| Rétention technique | Préparé | `dataRetention.ts`, route Heartbeat, tests et guide d’exploitation. | Publier puis créer le job projet authentifié. |
| Sécurité applicative | Implémenté | Zod, RBAC, audit, quotas, headers, webhook signé et logs redigés. | Revue de sécurité opérationnelle avant ouverture. |
| Observabilité minimisée | Implémenté | `observability.ts`, journalisation redigée, collecteur sans corps/réponses. | Configurer toute supervision externe retenue. |
| Mentions légales, confidentialité, CGU, CGV | Préparé avec emplacements explicites | `Legal.tsx`, routes publiques et contenu non fictif. | Renseigner l’éditeur, coordonnées et validation juridique. |
| SEO SSR, robots, sitemap, JSON-LD | Implémenté, domaine en attente | SSR, `robots.txt`, sitemap, JSON-LD et vérification prépublication. | Définir `CANONICAL_ORIGIN` final et vérifier le domaine publié. |
| Mobile-first | Partiellement validé | Captures 375 px landing, légal et onboarding. | Rejouer dashboard, catalogue, commandes, réglages et boutique sur espace pilote. |
| Performance | Implémenté et mesuré | Découpage des chunks, build validé, `performance-validation.md`. | Mesurer Core Web Vitals réels après publication. |
| Build, typage et tests | Implémenté et validé | `pnpm build`, `pnpm check`, 22 fichiers / 62 tests verts. | Aucune technique. |

## Conclusion de la matrice

Les exigences applicatives vérifiables dans le code sont implémentées ou préparées de manière sûre. Les blocages restants ne sont pas des fonctionnalités simulées : ce sont des configurations et validations externes qui ne peuvent pas être inventées — prix Stripe, identité de l’éditeur, domaine, publication, job de rétention et recette avec données réelles. Ils justifient le verdict **🟠 PARTIELLEMENT PRÊT** jusqu’à leur achèvement.
