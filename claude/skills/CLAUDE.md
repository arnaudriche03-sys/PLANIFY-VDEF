# Planify v2 — AI Project Context

Ce fichier sert de guide pour Claude Code et les autres agents IA travaillant sur le projet Planify.

## 🚀 Commandes de Base
- **Développement** : `npm run dev`
- **Build** : `npm run build`
- **Linting** : `npm run lint`
- **Preview** : `npm run preview`

## 🛠 Tech Stack
- **Framework** : React 19 + Vite
- **Base de données / Auth** : Supabase
- **Design System** : Lucide React (Icônes), Palette Slate (Thème Sombre)
- **Calculs temporels** : `date-fns`
- **Contenu IA** : `react-markdown` + `remark-gfm`

## 📂 Architecture Logicielle & IA
Le projet suit une logique métier forte basée sur la restauration (HCR) :

1.  **Cerveau IA (`claude/claude.IA`)** :
    - [Garde-fou légal HCR](file:///Users/arnaudriche/Desktop/Planifyv2/claude/claude.IA#L7) (Repos, Heures Max).
    - [Analyse KPI / RMO](file:///Users/arnaudriche/Desktop/Planifyv2/claude/claude.IA#L16).
    - [Système de Proposition Interactive](file:///Users/arnaudriche/Desktop/Planifyv2/claude/claude.IA#L31).
2.  **Design System (`claude/skills/frontend.md`)** :
    - Standards visuels SaaS Premium (Slate 900/800).
    - [Palette de couleurs](file:///Users/arnaudriche/Desktop/Planifyv2/claude/skills/frontend.md#L7).
    - [Navigation & Composants](file:///Users/arnaudriche/Desktop/Planifyv2/claude/skills/frontend.md#L25).

## ⚖️ Standards de Code
- **Moteur IA** : Utiliser `useClaude.js` pour la préparation du contexte et les appels API.
- **Calculs** : Les calculs de shifts (Nuit/Dimanche) doivent se trouver dans `calculations.js`.
- **Prompts** : Les règles HCR dans `prompts.js` ne doivent jamais être supprimées sans validation légale.
