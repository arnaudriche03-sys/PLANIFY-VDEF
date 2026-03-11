# Planify Frontend Design System

Ce document définit les standards visuels et techniques de l'interface Planify.

## Charte Graphique (SaaS Premium)

### Palette de Couleurs (Thème Sombre Raffiné)
- **Fond principal :** `#0f172a` (Slate 900) - Fournit une base profonde mais moins agressive que le noir pur.
- **Cartes & Éléments :** `#1e293b` (Slate 800) - Pour une hiérarchie visuelle claire.
- **Primaire (Accent) :** `#6366f1` (Indigo 500) - Utilisé pour les actions principales et les états actifs.
- **Texte :**
  - Primaire : `#f1f5f9` (Slate 100)
  - Secondaire : `#cbd5e1` (Slate 300)
  - Muted : `#94a3b8` (Slate 400)

### Typographie
- **Police :** `Inter`, sans-serif.
- **Style :** Autoritaire, propre, espacement moderne.

### Effets & Élévation
- **Glassmorphism :** Utilisé sur le Header et les Navigations (`backdrop-filter: blur(12px)`).
- **Bordures :** Subtiles (`rgba(255, 255, 255, 0.1)`).
- **Radius :** 8px (md), 12px (lg), 16px (xl).

## Composants & Iconographie

### Icônes
- Système unique : **Lucide React**.
- Remplacement total des emojis pour un ton professionnel.

### Navigation
- Structure à 4 piliers : **Equipe**, **Planning**, **Pré-paie**, **Analyse IA**.
- État actif marqué par la couleur primaire et une bordure basse.

### Ton & Voix
- Passage de "Assistant IA" à **Analyse IA**.
- Vocabulaire expert : "Conformité HCR", "Ratio RMO", "Productivité Horaire".

## Déploiement
- Framework : **Vite + React**.
- Hébergement : **Vercel**.
- Intégration Continue : **GitHub**.
