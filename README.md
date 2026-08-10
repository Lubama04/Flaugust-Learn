# FlaugustLearn

Plateforme e-learning professionnelle d'Établissement Flaugust Business (Tchad, Afrique
francophone).

## Stack

- Vite + React 19 + TypeScript (strict)
- TanStack Router + TanStack Query
- Supabase (PostgreSQL, Auth, Storage) avec Row Level Security
- Tailwind CSS v4 + composants shadcn/ui (Radix)
- Zustand, React Hook Form + Zod, react-hot-toast
- PWA (vite-plugin-pwa)

## Démarrage

```bash
npm install
cp .env.example .env.local   # renseigner les clés Supabase (voir dashboard du projet)
npm run dev
```

## Scripts

- `npm run dev` — serveur de développement
- `npm run build` — vérification TypeScript + build de production
- `npm run preview` — prévisualiser le build
- `npm run lint` — lint (oxlint)

## Variables d'environnement

Voir `.env.example`. `VITE_SUPABASE_ANON_KEY` est une clé publique (protégée par les policies
RLS) — elle peut être exposée côté client, mais aucune clé secrète (Service Role) ne doit
jamais figurer dans ce dépôt ou dans le code frontend.

## Base de données

Le schéma (tables, enums, triggers, policies RLS, buckets Storage) est géré par migrations
appliquées directement sur le projet Supabase (`xwlaipdlskpslvwgreqm`). Les types TypeScript
correspondants sont générés dans `src/types/database.ts` — à régénérer après toute migration.

## Branches

- `main` — production (déployée sur Vercel)
- `develop` — développement actif ; merge sur `main` en fin de phase

## Statut du projet

**Phase 1 — Fondations, Authentification & Structure** ✅

- Authentification email/password (inscription, connexion, déconnexion, reset)
- Redirection selon le rôle (apprenant / formateur / admin)
- Pages squelettes pour tous les rôles
- Validation manuelle des inscriptions par le formateur
- PWA installable

À venir : lecteur de contenu, studio de création de formations, Gate System, exercices
(Phase 2) · certificats (Phase 3) · paiements et IA (Phase 4).
