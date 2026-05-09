# Design Tokens

This document details the core design tokens and visual system for ReaperHub.

## 1. Typography
- **Display**: Sora (h1, h2)
- **Headings**: Outfit Bold (h3-h6)
- **Body**: Outfit Regular
- **Mono**: JetBrains Mono (stats/numbers)

### Scale
- `--text-12`: 12px
- `--text-14`: 14px
- `--text-16`: 16px
- `--text-18`: 18px
- `--text-20`: 20px
- `--text-24`: 24px
- `--text-32`: 32px
- `--text-48`: 48px
- `--text-64`: 64px

### Line Heights
- `--line-height-heading`: 1.2
- `--line-height-body`: 1.6

## 2. Color System
### Backgrounds
- `--bg-base`: #0a0b0f
- `--bg-elevated`: #13141a
- `--bg-overlay`: #1c1d24
- `--bg-hover`: #252631

### Surfaces
- `--surface-1`: #13141a
- `--surface-2`: #1c1d24
- `--surface-3`: #252631

### Text
- `--text-primary`: #fafafa
- `--text-secondary`: #a1a1aa
- `--text-muted`: #71717a
- `--text-disabled`: #52525b

### Accents
- `--accent-primary`: #8B5CF6
- `--accent-secondary`: #e63946
- `--accent-success`: #10b981
- `--accent-warning`: #f59e0b

## 3. Spacing
Base unit is 4px.
- 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 80px, 96px

## 4. Borders & Radius
### Borders
- `--border-subtle`: 1px solid var(--surface-2)
- `--border-default`: 1px solid var(--surface-3)
- `--border-strong`: 1px solid var(--text-muted)

### Radius
- `--radius-sm`: 4px
- `--radius-md`: 8px
- `--radius-lg`: 12px
- `--radius-xl`: 16px
- `--radius-2xl`: 24px

## 5. Shadows
Elevation levels:
- `--shadow-1` through `--shadow-5`
- `--shadow-glow-primary`
- `--shadow-glow-secondary`

## 6. Motion
- `--easing-standard`: cubic-bezier(0.16, 1, 0.3, 1)
- `--duration-instant`: 100ms
- `--duration-snappy`: 200ms
- `--duration-default`: 300ms
- `--duration-smooth`: 500ms
