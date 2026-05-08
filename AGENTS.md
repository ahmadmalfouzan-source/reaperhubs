# ReaperHub Project Context

## Stack
- React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Backend: Supabase (Postgres + Edge Functions + Storage + Auth + Realtime)
- AI: Google Gemini (gemini-2.5-flash for AI features)
- APIs: TMDB (movies/TV), RAWG (games)
- Deployment: Vercel auto-deploy from main branch
- PWA enabled with vite-plugin-pwa

## Aesthetic
Dark, tactical, military-themed entertainment tracker.
Uses terms: Operative, Transmission, Intel, Targets, Killstreak, Mission, Dossier
- Background: #0a0b0f
- Accent purple: #8B5CF6
- Accent red: #e63946
- Fonts: Outfit (body), Sora (headings)

## Code Conventions
- Components in src/components: named exports
- Pages in src/pages: default exports
- DB queries: src/lib/reaperhub/queries.ts
- API services: src/services/
- shadcn/ui components: src/components/ui
- Always use .maybeSingle() not .single() for optional queries
- All async functions need try/catch
- Tailwind only — no inline styles
- All new strings must use t() from i18next (after i18n is set up)

## Critical Rules
- Run `npm run build` before committing
- Test desktop (1920x1080) and mobile (375x667) viewports
- Verify zero console errors
- Test in Antigravity browser before pushing
- Never break existing functionality

## Known Bugs (priority fix list)
1. Feed post submission fails: "Transmission failed - Field interference detected. Signal lost"
2. Profile cover upload non-functional
3. Search filters do nothing when applied
4. Year range input in search cannot be edited
5. Priority Targets empty for all games
6. Comments cannot be added in Feed
7. Archive page empty
8. Pages without mobile nav: Dashboard, Hall of Fame, Milestones, Settings

## Workflow
- Create feature branch: `feature/<name>` or `fix/<name>`
- Open PR when feature complete
- Verify Vercel preview before merge
- Use semantic commits: feat:, fix:, refactor:, docs:, style: