# AGENTS.md

## Project Overview
ReaperHub is a dark, tactical, military-themed entertainment tracker.

Primary stack:
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

Backend and platform:
- Supabase for Postgres, Auth, Storage, Realtime, and Edge Functions
- Vercel auto-deploys from the `main` branch
- PWA enabled with `vite-plugin-pwa`

External APIs:
- TMDB for movies and TV
- RAWG for games

AI features:
- Google Gemini, primarily `gemini-2.5-flash`, for AI-powered product features

## Product Aesthetic
Preserve the current dark tactical product identity.

Tone and recurring UI vocabulary:
- Operative
- Transmission
- Intel
- Targets
- Killstreak
- Mission
- Dossier

Core design direction:
- Background: `#0a0b0f`
- Accent purple: `#8B5CF6`
- Accent red: `#e63946`
- Body font: Outfit
- Heading font: Sora

When adding or revising UI copy, keep the tone sharp, immersive, and consistent with the tactical theme. Avoid generic SaaS wording unless the current screen already uses it.

## Repo Structure
Follow these conventions unless an existing file or feature area clearly requires a different local pattern.

Directory conventions:
- `src/components`: named exports
- `src/pages`: default exports
- `src/components/ui`: shadcn/ui-based primitives and wrappers
- `src/lib/reaperhub/queries.ts`: shared DB query helpers
- `src/services/`: API services and external integration logic

Prefer extending existing patterns over introducing new architecture.

## Coding Rules
- Use TypeScript strictly and avoid `any` unless unavoidable
- All async functions must use `try/catch`
- Tailwind utilities only; do not add inline styles
- Reuse existing components, hooks, utilities, and query helpers before creating new abstractions
- Keep changes scoped to the requested task
- Do not introduce unrelated refactors
- Never break existing functionality while implementing new work

### React and component rules
- Keep presentational logic in components and external/API logic in services or query helpers when appropriate
- Prefer small, composable components
- Preserve current export conventions:
  - named exports in `src/components`
  - default exports in `src/pages`

### Data and Supabase rules
- Use `.maybeSingle()` instead of `.single()` for optional queries
- If direct database access is unavailable, create migration files and clearly document required manual steps
- If Edge Functions are needed, place them in the repo’s existing Supabase/edge-function structure and follow current naming conventions
- Do not hardcode Supabase URLs, anon keys, service role keys, or third-party credentials

### i18n rule
- After i18n infrastructure is merged, all new user-facing strings must use `t()` from i18next
- Until i18n is fully merged, avoid unnecessary text-system churn outside the scope of the task

## Environment and Secrets
- Never hardcode API keys, tokens, secrets, or credentials
- Use existing environment variable patterns already present in the repo
- Use Jules environment variables for any required secrets
- If a required environment variable is missing, stop and report exactly what is missing
- Do not fake external integrations if credentials are unavailable; implement the safe code path and document the missing setup

## Commands
Use existing scripts only. Do not invent scripts that do not exist.

Expected commands:
- `npm install`
- `npm run build`

Use these if they exist:
- `npm run dev`
- `npm run lint`
- `npm run test`

If a script is unavailable, state that explicitly in the task summary instead of guessing.

## Validation Requirements
Before considering any task complete:
1. Run `npm run build`
2. Verify zero console errors in the affected flows
3. Test desktop viewport at `1920x1080`
4. Test mobile viewport at `375x667`
5. Test the affected flow in Antigravity browser before pushing when browser verification is relevant
6. Confirm that no previously working feature was broken

For UI-heavy work, also verify:
- loading states
- empty states
- error states
- responsive layout
- dark-theme consistency
- mobile navigation visibility when relevant

## Quality Expectations
Every delivered task should:
- preserve the dark tactical aesthetic
- remain responsive on desktop and mobile
- avoid console warnings/errors in the affected flows
- include safe error handling
- avoid regressions in unrelated areas
- summarize changed files, risks, follow-ups, and any required manual setup

If a referenced design file under `/design` is required by the task and is missing, stop and report the missing prerequisite instead of inventing the design.

## Workflow
Use this workflow unless the task explicitly requires a different one.

Branch naming:
- `feature/<name>`
- `fix/<name>`

Delivery flow:
1. Create a focused branch
2. Implement one feature or one feature-slice only
3. Run validation requirements
4. Open a PR when complete
5. Verify the Vercel preview before merge

Commit prefixes:
- `feat:`
- `fix:`
- `refactor:`
- `docs:`
- `style:`

## Current Priority Bugs
These are active high-priority issues. If a task touches one of these areas, prioritize fixing the bug as part of the work when safe and in scope.

1. Feed post submission fails with: `Transmission failed - Field interference detected. Signal lost`
2. Profile cover upload is non-functional
3. Search filters do nothing when applied
4. Year range input in search cannot be edited
5. Priority Targets is empty for all games
6. Comments cannot be added in Feed
7. Archive page is empty
8. Pages missing mobile nav: Dashboard, Hall of Fame, Milestones, Settings

## Task Behavior Expectations
When working on any task:
- stay within scope
- avoid broad unrelated rewrites
- prefer incremental, reviewable changes
- preserve compatibility with current data and UI flows
- document manual setup when automation is not possible
- explicitly state the recommended next task when relevant

## Notes for Feature Work
When implementing new product features:
- preserve the product’s tactical terminology and visual identity
- use TMDB data conventions for movies/TV and RAWG conventions for games
- keep AI feature calls isolated and configurable
- ensure PWA behavior is not unintentionally broken
- ensure Vercel deployment assumptions remain valid
## Workflow
- Create feature branch: `feature/<name>` or `fix/<name>`
- Open PR when feature complete
- Verify Vercel preview before merge
- Use semantic commits: feat:, fix:, refactor:, docs:, style:
