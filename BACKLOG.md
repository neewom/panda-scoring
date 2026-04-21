# Panda Scoring — Backlog 🐼

## Fait ✅

### Batch 1 — Fondations scoring
- Navigation arrière + autofocus dans la saisie
- Calculatrice "Détail calcul" (mini-parser d'expression)
- Suppression page intermédiaire "Saisie terminée"
- Page de résultats enrichie (vainqueur, tableau détaillé, tie-break)
- Réorganisation joueurs en drag and drop (@dnd-kit)
- Support per_round avec rounds dynamiques
- Support lowest_wins (scores inversés)
- Condition de fin par seuil de score (end_condition)

### Batch 2 — Pages et données
- Page Historique des parties + détail
- Page détail d'un jeu depuis la bibliothèque
- Page Paramètres (suppression données)
- Stats joueurs (résumé + page détail)
- Formulaire d'ajout de jeu (scoring simple, total = somme)
- Renommage des joueurs
- Dénormalisation des noms joueurs dans l'historique
- Recalcul dynamique des totaux à l'affichage
- Suppression de parties depuis l'historique

### Batch 3 — Navigation et UX
- Suppression bottom nav, navigation par flux depuis la Home
- Header : Home à gauche, Retour en sous-ligne
- Navigation par parent logique (pas history.back)
- CTA "Jouer" depuis bibliothèque → skip étape 1
- Focus input après ajout d'un nouveau joueur
- Tableau résultats : ordre de jeu, pas de colonne Total
- Home vivante : parties en cours + dernières parties

### Jeux disponibles
- Endeavor (end_game, 3-5j)
- Château Combo (end_game, 2-5j)
- Forêt Mixte Dartmoor (end_game, 2-5j)
- Nokosu Dice (per_round, 3-5j)
- 6 qui prend ! (per_round, lowest_wins, seuil 66, 2-10j)

## Backlog 📋

### Priorité haute
- Suppression d'un jeu depuis la bibliothèque (le jeu est supprimé 
  du cache local, les parties historiques restent intactes)

### Base de données
- Setup Supabase (projet + table games + client JS)
- Migration des jeux hardcodés vers Supabase
- Bibliothèque : cache local (jeux déjà joués) + recherche Supabase
- 3 derniers jeux joués affichés par défaut, "Voir plus" pour le reste
- Création de jeu → sauvegardé en local + envoyé à Supabase
- Cron anti-pause Supabase (ping toutes les 5 jours)
- Accès anonyme pour l'instant (pas d'auth)

### Couche IA
- Génération auto des configs de jeux via API Anthropic + web search
- Validation humaine des configs générées avant utilisation
- Stockage des configs validées en BDD Supabase

### Refonte visuelle
- Nouveau thème (vert/bois/nature au lieu de violet/rose)
- Logo et mascotte Panda Scoring stylisé
- Remplacement des emojis par des assets

### Features à venir
- Recherche de jeu dans le stepper étape 1
- Jeux favoris (affichés en priorité)
- Avatars joueurs
- Barre de contrôle contextuelle pendant une partie (inspiration 
  option C de la navigation)

## Décisions d'architecture 📐

### Supabase (décidé, pas encore implémenté)
- PostgreSQL managé, API REST auto, tier gratuit
- Table "games" avec champs complexes en JSONB
- Deux sources de jeux : cache local (offline) + Supabase (recherche)
- Un jeu est ajouté au cache quand l'utilisateur le sélectionne ou 
  le joue
- Les parties et joueurs restent en localStorage pour l'instant
- Cron ping anti-pause toutes les 5 jours

### Scoring
- Les totaux sont toujours recalculés dynamiquement (jamais lus 
  depuis le stockage)
- Les noms joueurs sont dénormalisés dans les parties (résilient à 
  la suppression)
- Le formulaire d'ajout de jeu génère un total = somme des champs 
  number (pas de formules custom, la couche IA s'en chargera)

### Navigation
- Pas de bottom nav, Home = hub central
- Header : 🏠 Home à gauche, ← Retour en sous-ligne sur les 
  sous-pages
- Navigate explicite vers parent logique, jamais history.back()
- Parties en cours sauvegardées auto, reprensibles depuis la Home
