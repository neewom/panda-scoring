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
- Avant de créer une nouvelle branche, toujours se synchroniser avec main à jour :
  ```
  git checkout main
  git fetch origin
  git pull --ff-only origin main
  ```
- Toujours créer une branche : `feature/xxx` ou `fix/xxx`
- Toujours créer une PR après le push
- `main` est la branche de production — Netlify déploie automatiquement à chaque merge
- Si une branche en cours diverge d'un main qui a avancé, rebase sur `origin/main` plutôt que de repartir de zéro :
  ```
  git fetch origin
  git rebase origin/main
  git push --force-with-lease
  ```

## Conventions de commit
- `feat:` nouvelle fonctionnalité
- `fix:` correction de bug
- `docs:` documentation

## Tests
- Écrire des tests Vitest uniquement pour la logique métier pure dans `src/lib/` (scoring engine, game logic, utils)
- Ne pas écrire de tests pour les composants React, les pages, ou l'UI
- Ne jamais modifier un test existant sans raison explicite
- Ne jamais lancer la suite de tests complète (`vitest run`). Lancer uniquement le(s) fichier(s) test concerné(s) par la modification : `vitest run src/lib/chemin/du/fichier.test.ts`
- Utiliser `--reporter=dot` pour minimiser la sortie console
- Ne lancer `vitest run` global que si je le demande explicitement

## Identité Git
Avant tout commit, configure toujours ton identité Git :
```
git config user.name "Glaude"
git config user.email "glaude@panda-scoring.local"
```
