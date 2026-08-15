# Architecture produit — CommerceBoost974

## Décision de périmètre

CommerceBoost974 est construit **depuis une base vierge**. Les instructions du cahier des charges relatives à l’audit, à la conservation ou à la réutilisation d’un projet antérieur sont écartées, car elles sont explicitement remplacées par la demande la plus récente. Aucune donnée, migration, composant, API ni structure de l’ancien projet ne sera réemployé.

## Objectif de produit

Le produit est un SaaS multi-tenant destiné aux artisans, commerçants, indépendants et TPE de La Réunion. Un professionnel doit pouvoir créer son entreprise, préparer une boutique publique, administrer son catalogue, gérer ses clients et commandes, suivre son activité et employer des assistants IA ciblés sans devoir maîtriser des outils techniques.

| Domaine | Exigences appliquées | Décision de mise en œuvre |
| --- | --- | --- |
| Identité et accès | Connexion, déconnexion, sessions, rôles, protection de routes, données protégées | Identité OAuth gérée par la plateforme, sessions HTTP-only, rôles globaux et adhésions par entreprise côté serveur. Les mots de passe ne sont ni collectés ni stockés par l’application. |
| Multi-tenant | Isolation stricte, permissions, contrôle serveur | Toute requête privée résout l’adhésion active de l’utilisateur. Les lectures et mutations filtrent systématiquement `businessId` côté serveur. |
| Commerce | Produits, catégories, promotions, clients, commandes, panier | Les prix, règles de promotions, disponibilité et totaux sont recalculés côté serveur. Une commande est possible sans paiement en ligne, conformément à la contrainte interdisant d’intégrer un paiement non configuré. |
| IA | Amélioration de contenu, communication, analyse, langage naturel | Les requêtes IA sont effectuées uniquement côté serveur, associées à une entreprise et journalisées. Elles produisent des propositions éditables, jamais une modification silencieuse. |
| Automatisation | Architecture extensible, notifications et campagnes futures | Le domaine prévoit des règles et journaux d’automatisation. Les tâches périodiques éventuelles emploieront des déclencheurs gérés et idempotents, sans minuteur en mémoire. |
| Public et SEO | Landing, boutique publique, métadonnées, URLs, sitemap, robots | Les routes publiques sont conçues pour être indexables; l’implémentation inclut les balises de partage, sitemap, robots et données structurées appropriées. |
| Qualité | Mobile-first, accessibilité, états UI, tests | Design system avec thème clair/sombre, composants réutilisables, messages d’erreur utiles, validation Zod et tests Vitest ciblant les invariants métier. |

## Modèle de sécurité

La sécurité repose sur une séparation explicite entre l’identité globale et les droits locaux à une entreprise. Un utilisateur n’accède à une entreprise que par une adhésion active; l’interface ne constitue jamais une source d’autorisation. Les identifiants de tenant reçus du navigateur sont validés en regard de cette adhésion avant toute écriture ou lecture. Les entrées utilisateur sont validées et les messages publics n’exposent ni détail interne ni secret.

| Rôle dans une entreprise | Capacités principales |
| --- | --- |
| `owner` | Paramètres, membres, catalogue, promotions, commandes, clients et publication. |
| `manager` | Catalogue, promotions, commandes, clients et consultations analytiques. |
| `staff` | Consultation opérationnelle et mise à jour limitée des commandes. |

## Modèle métier initial

Le cœur relationnel comprend les entités `businesses`, `memberships`, `business_settings`, `categories`, `products`, `promotions`, `customers`, `orders`, `order_items`, `audit_logs`, `ai_generations`, `subscription_plans`, `subscriptions` et `automation_rules`. Les entités tenantées portent un `businessId` indexé. Les relations et contraintes de clés étrangères évitent les références orphelines; l’historique d’une commande conserve les prix réellement appliqués afin de préserver l’intégrité du chiffre d’affaires.

## Principes UX/UI

L’interface adopte une esthétique de **calm density**: typographie expressive mais compacte, accent tropical minéral réservé aux statuts/action, contrastes élevés, surfaces sobres, mouvements courts et états explicites. Les tableaux sont remplacés par des cartes lisibles sur téléphone lorsque l’espace est insuffisant. Les écrans métier privilégient une action principale claire, un contexte utile et une sortie évidente.

## Plan de livraison fonctionnelle

Le premier périmètre opérationnel couvre l’onboarding, le catalogue, les catégories, les promotions, les clients, les commandes, le tableau de bord, la boutique publique, le panier et la création de commande. L’architecture des abonnements, de l’administration globale et des automatisations est réelle dans le modèle et les autorisations, mais les paiements et envois de campagnes resteront désactivés tant qu’aucun fournisseur sécurisé n’est configuré.
