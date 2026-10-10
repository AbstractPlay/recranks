# Agent guide — recranks

Records, ratings (Elo, Glicko-2, TrueSkill), gamerecord schema, turn-model helpers, and solo validation/leaderboards for Abstract Play. Package: `@abstractplay/recranks`.

## Abstract Play (wide)

Follow the canonical org-wide policy in [gameslib `AGENTS.md` — Abstract Play (wide)](https://github.com/AbstractPlay/gameslib/blob/develop/AGENTS.md#abstract-play-wide).

## Layout

| Path | Purpose |
|------|---------|
| `src/raters/` | Rating algorithms |
| `src/schemas/gamerecord.json` | Gamerecord schema (run `npm run json2ts` after edits) |
| `src/turnModel.ts` | Move slots, replay order, turn model from records |
| `src/soloValidate.ts` / `src/soloLeaderboard.ts` | Solo archive validation and leaderboards |
| `test/` | Mocha + chai |

## Commands

| Command | When |
|---------|------|
| `npm test` | Mocha (`pretest` → typecheck) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint on `src/**/*.ts` |
| `npm run build` | `tsc`, postbuild smoke, lint |
| `npm run json2ts` | Regenerate `gamerecord.d.ts` from JSON schema |

Handoff: **`npm run typecheck`**, **`npm run lint`**, and **`npm test`** (exit 0).

## Testing

- Use **inline record builders** in test files (see `test/soloValidate.test.ts`, `test/turnModel.test.ts`).
- If you add file fixtures later, keep them under **`test/`** only — no runtime reads outside `test/`.
- Assert public behaviour and schema contracts, not incidental implementation details.

## Cross-repo impact

Gamerecord or turn-model changes may require updates in **node-backend** and consumers of `@abstractplay/recranks`. Bump dependent repos’ pins and run their tests after API changes.

This package has no locale files; i18n wide rules apply when you touch sibling repos.

## Changelog

Log substantive schema or API changes in [`CHANGELOG.md`](CHANGELOG.md) when they ship to integrators.

## Contact

[#dev-curious on Discord](https://discord.abstractplay.com)
