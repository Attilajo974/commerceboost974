# Audit de finalisation — CommerceBoost974

L’audit est fondé sur le nouveau cahier des charges de phase finale et sur les modules actuellement présents dans le projet. Il confirme que le socle applicatif reste celui du nouveau CommerceBoost974 multi-tenant et qu’aucune architecture antérieure n’est réintroduite.

| Domaine | État vérifié | Écart à traiter |
| --- | --- | --- |
| Multi-tenant et rôles | Les entreprises, adhésions, rôles, contrôles d’accès et index d’isolation existent. Les mutations serveur vérifient le tenant. | Ajouter un scénario explicite A/B couvrant produits, clients, commandes et modifications croisées. |
| Commerce | Catalogue, catégories, promotions, panier public, commande, clients et historique de statut existent. | Ajouter une preuve de parcours de bout en bout regroupée dans les tests. |
| Plans et abonnements | Les tables `subscription_plans` et `subscriptions` existent mais elles ne sont pas encore consommées par les procédures métier. | Définir Starter, Business et Pro; appliquer les droits et limites côté serveur. |
| Stripe | Aucune clé, webhook, checkout, portail Stripe ou synchronisation n’est présent. | Préparer l’intégration via variables d’environnement et vérifier les webhooks côté serveur, sans activer de paiement sans identifiants. |
| IA et automatisations | Les assistants IA sont journalisés et limités; les règles d’automatisation et notifications existent. | Associer les capacités IA/automatisation aux limites de plan serveur. |
| SEO et domaine | SSR, sitemap, robots, canonical et Open Graph existent. | Centraliser le domaine dans la configuration de production et ne plus dépendre d’un hôte déduit hors développement. |
| Données et RGPD | Les données sont tenantées et les journaux d’audit sont limités. | Ajouter export, suppression, politique de conservation documentée et minimisation des données dans les sorties IA/logs. |
| Sécurité | OAuth, RBAC, validation, audit, limitations durables et en-têtes défensifs sont présents. | Ajouter les contrats Stripe, les tests A/B renforcés et la politique de secrets/observabilité. |
| UX mobile | Landing et onboarding ont été vérifiés. | Vérifier les écrans dashboard, catalogue, commandes, boutique, IA et notifications aux dimensions mobiles. |
| Documentation | Architecture, migrations, sécurité, performance, SSR et automatisations sont documentés. | Ajouter `.env.example` et le guide complet d’installation, domaine, Stripe, opérations et recette. |

> Le produit est fonctionnel pour la gestion commerciale sans encaissement. Il ne peut pas être déclaré **Production Ready** tant que Stripe n’est pas configuré avec des identifiants réels, que les informations d’éditeur ne sont pas fournies et que la recette pilote n’est pas terminée.
