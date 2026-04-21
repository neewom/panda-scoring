# Panda Scoring 🐼

Application de scoring pour jeux de société.

## Stack
- React + TypeScript + Vite
- Vitest + React Testing Library
- shadcn/ui + Tailwind
- localStorage pour la persistance (BDD Supabase prévue pour les jeux)
- Netlify (déploiement auto sur merge main)

## Structure
- `src/lib/` — logique métier (game, scoring, supabase client)
- `src/pages/` — pages React
- `src/components/` — composants UI

## Workflow Git
- Ne jamais pusher directement sur `main`
- Avant de créer une nouvelle branche, toujours se synchroniser :
git checkout main
git fetch origin
git pull --ff-only origin main
- Toujours créer une branche : `feature/xxx` ou `fix/xxx`
- Toujours créer une PR après le push
- `main` est la branche de production
- Si une branche diverge d'un main qui a avancé, rebase :
git fetch origin
git rebase origin/main
git push --force-with-lease

## Conventions de commit
- `feat:` nouvelle fonctionnalité
- `fix:` correction de bug
- `docs:` documentation
- Commits et branches en anglais

## Tests
- Toujours écrire les tests Vitest pertinents (pas besoin qu'on 
  liste chaque cas dans le prompt)
- Tester les cas nominaux + les cas limites évidents
- Ne jamais modifier un test existant sans raison explicite
- Toujours vérifier npm test && npm run build avant de push

## Conventions UX
- Mobile-first systématique
- Autofocus sur le premier input de saisie à chaque navigation
- Les CTAs principaux sont en full width sur mobile
- Les boutons destructifs ont une modale de confirmation
- Tout état vide a un message + CTA d'action contextuel

## Conventions de code
- Réutiliser les composants existants plutôt que dupliquer
- Les nouvelles pages suivent le pattern : header avec 🏠 Home à 
  gauche + titre au centre, et ← Retour sur une 2e ligne pour les 
  sous-pages
- En cas de doute, choisir l'option la plus simple
- Implémenter uniquement ce qui est demandé dans le prompt

## Navigation
- Pas de bottom nav, la Home est le hub central
- Bouton 🏠 Home toujours à gauche du header (sauf sur la Home)
- Bouton ← Retour sur une 2e ligne sous le header pour les sous-pages, 
  avec le nom de la page parente
- Le Retour navigue vers le parent logique (navigate explicite, jamais 
  history.back)

## Modèle de données clé — Config jeu
Chaque jeu a : name, publisher, players (min/max), scoring_model 
(end_game/per_round), rounds, end_condition (score_threshold), 
lowest_wins, scoring (champs de saisie), computed (calculs auto), 
tiebreak_description, scoring_notes, validated.

## Scoring
- Les totaux sont recalculés dynamiquement à l'affichage (pas lus 
  depuis le stockage)
- Les noms des joueurs sont dénormalisés dans les parties sauvegardées
- Les parties en cours sont persistées en localStorage et reprensibles 
  depuis la Home

## Identité Git
git config user.name "Glaude"
git config user.email "glaude@panda-scoring.local"
