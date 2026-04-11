# Panda Scoring 🐼

Application de scoring pour jeux de société.

## Stack
- React + TypeScript + Vite
- Vitest + React Testing Library
- shadcn/ui
- localStorage pour la persistance

## Structure
- `src/lib/` — logique métier (game, scoring)
- `src/pages/` — pages React
- `src/components/` — composants UI

## Workflow Git
- Ne jamais pusher directement sur `main`
- Toujours créer une branche : `feature/xxx` ou `fix/xxx`
- Toujours créer une PR après le push
- `main` est la branche de production — Netlify déploie automatiquement à chaque merge

## Conventions de commit
- `feat:` nouvelle fonctionnalité
- `fix:` correction de bug
- `docs:` documentation

## Tests
- Toujours écrire les tests avec Vitest
- Ne jamais modifier un test existant sans raison explicite

## Identité Git
Avant tout commit, configure toujours ton identité Git :
```
git config user.name "Glaude"
git config user.email "glaude@panda-scoring.local"
```
