# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Public demo on Netlify with a Neon Postgres database: the Express API runs as one Netlify Function behind `/api/*` and the frontend is served as static files. Configuration in `netlify.toml`.
- `backend/src/app.js`, split from `server.js` so the app can run inside a function.
- `.gitattributes` to keep LF line endings.

### Changed

- Node 24 in `.nvmrc` (CI and the demo build).
- Dependabot now groups minor and patch updates and checks monthly. Patch and minor dependency updates applied in one commit.
- The database modules no longer read `import.meta.url` at load time, so they can be bundled as CommonJS.

## [0.1.0] - 2026-10-20

First public version.

### Added

- Sign up and log in with bcrypt-hashed passwords and JWT sessions, with rate limiting on the auth routes.
- Groups with a 6-character invite code, and access control by group membership.
- Expenses with line items. A receipt photo can be analysed by Gemini to pre-fill the items; without API keys the form is filled in by hand.
- Per-item assignment of who had what, or an equal split of a whole expense.
- Debt engine in whole cents: largest-remainder splitting, tax and tip prorated, net balance per person and greedy debt simplification. Settlements marked as paid are remembered.
- React + Vite frontend with a hand-built design system (CSS Modules), in Spanish.
- Database access through Knex: SQLite for local development, Postgres when `DATABASE_URL` is set.
- 14 Vitest tests: money and debt logic against in-memory SQLite, plus one dialect test against pg-mem.
- GitHub Actions CI (backend tests, frontend lint and build), Dependabot configuration and a Node 22 pin.
- English README as the main one, a full Spanish README, a security policy and this changelog.
- Real screenshots with fictitious data and a social preview image in `docs/images`.

### Known limitations

See the [README](README.md#known-limitations).

[Unreleased]: https://github.com/jmartintechit-blip/Repartix/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/jmartintechit-blip/Repartix/releases/tag/v0.1.0
