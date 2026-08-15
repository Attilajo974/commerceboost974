# Plans et facturation CommerceBoost974

Les droits de plan sont décidés **côté serveur**. L’interface affiche un état informatif, mais elle ne constitue jamais une autorisation. Sans abonnement Stripe synchronisé, une entreprise utilise le plan Starter par défaut.

| Capacité | Starter | Business | Pro | Procédures contrôlées |
| --- | --- | --- | --- | --- |
| Boutique publique | Oui | Oui | Oui | Publication et lecture publique |
| Produits actifs | 15 | 250 | 2 000 | `product.create` |
| Commandes et clients | Non | Oui | Oui | Checkout, devis, commandes et clients |
| Analytics | Non | Oui | Oui | `analytics.overview` |
| IA | Non | Non | Oui | `ai.improveProduct`, `ai.weeklyInsight` |
| Générations IA par mois | 0 | 0 | 250 | Avant chaque génération |
| Automatisations actives | 0 | 0 | 10 | `automation.createWeeklySummary` |

## Configuration Stripe à effectuer par un administrateur

> Aucune valeur d’exemple ne doit être utilisée. Stripe reste volontairement **non opérationnel** tant qu’une clé, un secret webhook ou un Price ID réel manque.

| Variable | Valeur à renseigner après création dans Stripe |
| --- | --- |
| `STRIPE_SECRET_KEY` | Clé secrète de l’environnement Stripe correspondant. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Clé publiable du même environnement. |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature du point de terminaison `/api/stripe/webhook`. |
| `STRIPE_PRICE_STARTER` | Identifiant `price_…` du prix récurrent Starter. |
| `STRIPE_PRICE_BUSINESS` | Identifiant `price_…` du prix récurrent Business. |
| `STRIPE_PRICE_PRO` | Identifiant `price_…` du prix récurrent Pro. |

Après création des produits et prix dans Stripe, renseigner les trois variables `STRIPE_PRICE_*` dans la configuration sécurisée de production, puis enregistrer le webhook Stripe vers `https://<domaine-final>/api/stripe/webhook`. Les événements de création, modification et suppression d’abonnement sont signés, idempotents et ne persistent que des identifiants Stripe strictement nécessaires.

Le frontend n’active jamais l’abonnement de lui-même : l’activation dépend exclusivement de la synchronisation serveur déclenchée par le webhook Stripe vérifié.
