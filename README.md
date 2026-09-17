# GitGrow

A personal habit-tracking prototype that turns daily consistency into an exploration game. Track habits, earn XP, accept quests and unlock a walkable world map.

## Project context

This is a personal learning and **AI-assisted / vibe-coded prototype** by Maksim Hutsau. The application was built using AI-generated code. It demonstrates exploring an idea with AI tools, not independently authoring every component or production-level expertise in its stack.

## Implemented features

- Habit creation, daily check-ins, activity history and streak visualisation.
- Profile preferences and user-specific data.
- XP rewards, daily quests and one-time landmark quests.
- A 36-tile world map with progression and movement rules.
- Photo or location evidence for quests, with cloud storage bindings.
- Import support for earlier local data.
- Web app manifest, icons and service worker.
- Tests for map adjacency, unlock limits, non-negative penalties and daily quest selection.

## Stack

React 19, TypeScript, vinext/Vite with Next.js-style App Router routes, Cloudflare Workers, D1 (SQLite), R2, Drizzle ORM, Tailwind CSS and the Node.js test runner.

## Local development

Requires Node.js **22.13.0 or newer** and pnpm.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by the server. Development simulates Cloudflare bindings declared in `.openai/hosting.json`; local state stays in the ignored `.wrangler` directory.

The database needs the tables from `drizzle/0000_marvelous_vapor.sql` and `drizzle/0001_world_position.sql`. Apply these migrations in order to the local D1 binding using your Cloudflare development setup. Production data and storage are not included.

```sh
pnpm build
pnpm test
pnpm lint

# Game-rule tests only; no cloud services required
node --experimental-strip-types --test tests/game-rules.test.mjs
```

`pnpm test` builds the application before running the game-rule tests.

## Repository map

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Main tracker interface |
| `app/api/` | Habit, check-in, quest, map and profile endpoints |
| `lib/quests.ts` | Quest definitions and progression rules |
| `lib/world-map.ts` | Map route and movement helpers |
| `lib/server-game.ts` | Server-side game state and persistence |
| `db/` and `drizzle/` | Schema, database access and migrations |
| `tests/game-rules.test.mjs` | Focused game-logic tests |

## Authentication and deployment

The hosted version uses identity headers supplied by the hosting platform. `app/chatgpt-auth.ts` provides a local demo identity in development; this fallback is disabled in production. A standalone production deployment needs a trusted authentication layer and configured D1/R2 bindings. Do not accept identity headers directly from untrusted clients.

The checked-in hosting configuration contains binding names and a project identifier, not credentials. Keep credentials in platform secret storage or ignored environment files.

## Limitations

- Experimental prototype, not an independently audited production service.
- Tests cover selected game rules, not the complete UI, API or authentication flow.
- Setup depends on compatible Cloudflare tooling and database migrations.
- Photo and location features involve personal data; use test data when evaluating the project.
- Publication alone does not grant an open-source licence; third-party packages and assets retain their applicable terms.

## Author

[Maksim Hutsau](https://github.com/d4nxn) - IT technician graduate exploring Python, web applications and practical uses of AI.
