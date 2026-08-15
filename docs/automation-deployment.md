# Activation des automatisations

CommerceBoost974 expose une règle **Point hebdomadaire** associée à une tâche planifiée durable. Lorsqu’un propriétaire active cette règle depuis son espace publié, le service crée une tâche qui appelle `POST /api/scheduled/weekly-summary` chaque lundi à 05:00 UTC, soit 09:00 à La Réunion. Le point d’exécution recherche exclusivement la règle par l’identifiant de tâche émis par la plateforme, ignore les règles désactivées et protège les nouvelles tentatives par une fenêtre d’idempotence de vingt heures.

> Aucune tâche n’a été créée pendant le développement. Une planification ne peut pas cibler un aperçu local ; elle doit être créée après publication de l’application.

| Élément | État livré | Étape après publication |
| --- | --- | --- |
| Règle d’automatisation et UI | Disponible | Le propriétaire peut créer, suspendre ou supprimer la règle. |
| Endpoint planifié authentifié | Disponible | La plateforme l’appelle avec une identité cron dédiée. |
| Notification dans le portail | Disponible | Elle est créée après l’exécution d’une règle active. |
| Création d’une tâche réelle | Non effectuée pendant le développement | Publier d’abord le site, puis créer la règle depuis `/app/automatisations`. |

Les tâches utilisent une expression cron à six champs et ne reposent sur aucun minuteur local. Cette approche reste compatible avec une exécution autoscalée où une instance peut être arrêtée entre deux requêtes.
