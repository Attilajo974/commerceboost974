CommerceBoost974 🇷🇪

La plateforme SaaS de commerce local pensée pour les professionnels de La Réunion.

CommerceBoost974 a pour objectif d'aider les artisans, commerçants, indépendants et TPE réunionnaises à développer leur présence en ligne et à gérer leur activité commerciale depuis une plateforme simple et centralisée.

🚀 Présentation

CommerceBoost974 est une plateforme SaaS permettant aux professionnels de créer et gérer leur espace commercial en ligne.

La plateforme centralise notamment :

- 🏪 Gestion de l'espace professionnel
- 📦 Gestion des produits
- 🗂️ Gestion des catégories
- 🛍️ Boutique publique
- 🛒 Panier client
- 📋 Gestion des commandes
- 🎯 Gestion des promotions
- 👥 Gestion multi-tenant
- 🔐 Authentification et gestion des rôles
- 💳 Préparation de l'intégration du paiement en ligne
- 📊 Tableau de bord professionnel

L'objectif est de proposer une solution adaptée aux besoins des petites entreprises locales, avec une expérience simple et accessible.

🎯 Vision

CommerceBoost974 est conçu autour d'une idée simple :

«Permettre aux professionnels réunionnais de vendre et développer leur activité en ligne sans avoir besoin de maîtriser des outils techniques complexes.»

La plateforme vise particulièrement :

- Artisans
- Commerçants
- Producteurs locaux
- Indépendants
- TPE
- Petites entreprises
- Entrepreneurs locaux

🏝️ Un projet pensé pour La Réunion

CommerceBoost974 est conçu avec une approche orientée commerce local réunionnais.

L'objectif est de proposer progressivement des outils adaptés aux réalités des professionnels de La Réunion :

- Visibilité locale
- Boutique en ligne
- Gestion simplifiée des produits
- Gestion des commandes
- Promotions
- Développement de la vente directe
- Accompagnement vers la digitalisation

🧱 Architecture

Le projet utilise une architecture moderne séparant le frontend et le backend.

Frontend

- React
- TypeScript
- Vite
- Gestion des pages et composants
- Interface professionnelle responsive

Backend

- Node.js
- Express
- API REST
- Validation des données
- Authentification
- Gestion des rôles
- Isolation des données entre professionnels

Base de données

Le projet utilise une architecture SQL avec :

- Drizzle
- Migrations SQL
- Gestion des utilisateurs
- Entreprises / espaces professionnels
- Catégories
- Produits
- Promotions
- Commandes

Gestion du projet

- Git
- GitHub
- pnpm

🏗️ Structure du projet

CommerceBoost974/
├── client/          # Application frontend
├── server/          # API et logique backend
├── drizzle/         # Schéma et migrations de base de données
├── docs/            # Documentation du projet
├── package.json     # Dépendances et scripts
├── pnpm-lock.yaml   # Verrouillage des dépendances
└── README.md        # Documentation

🔐 Sécurité

Le projet intègre plusieurs mécanismes destinés à sécuriser l'application :

- Authentification
- Contrôle des rôles
- Isolation des espaces professionnels
- Validation des données
- Gestion centralisée des erreurs
- Protection des API
- Limitation des requêtes
- Configuration CORS
- Protection HTTP
- Absence de secrets dans le dépôt Git

Les clés API, mots de passe et informations sensibles doivent être configurés via des variables d'environnement et ne doivent jamais être commités dans Git.

🏪 Fonctionnalités principales

Espace professionnel

Chaque professionnel dispose de son propre espace de gestion.

Produits

Gestion des produits :

- Création
- Modification
- Suppression
- Prix
- Catégories
- Informations produit

Catégories

Organisation du catalogue avec des catégories propres à chaque espace professionnel.

Promotions

Création et gestion des promotions commerciales.

Boutique publique

Chaque professionnel peut disposer d'une boutique publique accessible aux clients.

Panier

Les clients peuvent ajouter des produits au panier et modifier les quantités.

Commandes

Les commandes sont enregistrées côté serveur et les montants sont recalculés côté serveur afin d'éviter de faire confiance aux données envoyées par le navigateur.

Multi-tenant

L'architecture permet de séparer les données des différents professionnels utilisant la plateforme.

💳 Paiement

L'intégration du paiement en ligne avec Stripe fait partie de la feuille de route du projet.

Les clés Stripe de production ne doivent pas être stockées dans le dépôt GitHub.

La configuration de production devra être réalisée uniquement lorsque l'environnement de paiement et les paramètres commerciaux auront été validés.

🧪 Tests

Le projet fait l'objet de tests fonctionnels et techniques au cours de son développement.

Avant chaque étape importante, les fonctionnalités existantes doivent être vérifiées afin d'éviter les régressions.

🛠️ Installation

Prérequis

Avant de commencer, installer :

- Node.js
- pnpm
- Une base de données compatible avec le projet

Installation

git clone https://github.com/Attilajo974/commerceboost974.git
cd commerceboost974
pnpm install

Créer ensuite les variables d'environnement nécessaires à l'application.

«Ne jamais publier les fichiers ".env" contenant des informations sensibles.»

Lancement du projet

Les commandes exactes peuvent évoluer avec le projet.

Consulter "package.json" pour connaître les scripts disponibles.

🌱 Développement

Le développement de CommerceBoost974 est réalisé progressivement.

Chaque évolution importante doit :

1. Être développée
2. Être testée
3. Être vérifiée contre les fonctionnalités existantes
4. Être commitée dans Git
5. Être synchronisée avec GitHub

🔄 Gestion GitHub

Le dépôt officiel du projet est :

https://github.com/Attilajo974/commerceboost974

La branche principale actuelle est :

master

GitHub sert de sauvegarde et de suivi des versions du projet.

Les modifications importantes doivent être accompagnées d'un commit explicite et compréhensible.

🗺️ Feuille de route

Phase actuelle

- [x] Architecture initiale SaaS
- [x] Frontend React
- [x] Backend Node.js / Express
- [x] Gestion des espaces professionnels
- [x] Gestion des produits
- [x] Gestion des catégories
- [x] Gestion des promotions
- [x] Boutique publique
- [x] Panier
- [x] Commandes
- [x] Architecture multi-tenant
- [x] Validation et protections API
- [x] Export du projet vers GitHub

Prochaines étapes

- [ ] Audit complet de la version GitHub
- [ ] Finalisation des tests fonctionnels
- [ ] Vérification approfondie de la sécurité
- [ ] Configuration Stripe en environnement de test
- [ ] Configuration du domaine
- [ ] Ajout des informations légales
- [ ] Tests avec un premier professionnel pilote
- [ ] Déploiement de production
- [ ] Amélioration progressive de l'expérience utilisateur
- [ ] Ajout de nouvelles fonctionnalités commerciales

🤝 Contribution

CommerceBoost974 est actuellement en phase de développement.

Les contributions, suggestions et retours techniques peuvent être étudiés afin d'améliorer progressivement la plateforme.

📄 Licence

La licence du projet sera définie avant l'ouverture publique du code ou la distribution de la plateforme.

📞 Projet

CommerceBoost974

SaaS de commerce local destiné aux professionnels de La Réunion.

GitHub :

https://github.com/Attilajo974/commerceboost974

---

🇷🇪 Commerce local. Digitalisation. Croissance.

CommerceBoost974 — Donner aux professionnels réunionnais les outils pour développer leur commerce en ligne.
