# Rating algorithms

Recranks provides three rating engines. All support two-player games only and determine outcomes from relative `result` magnitudes in the game record header.

## Processing model

| Engine | Model | Order |
|--------|-------|-------|
| **ELOBasic** | Sequential — each game updates both players immediately | Sorted by `date-end` ascending |
| **Trueskill** | Sequential — each game updates via `env.rate()` | Sorted by `date-end` ascending |
| **Glicko2** | Batch rating period — all games aggregated, then one update per player | Sorted by `date-end` ascending |

### Sequential (ELO, TrueSkill)

After each game, both players' ratings reflect all prior games. If players A and B meet twice in one batch, the second game uses ratings updated by the first.

### Batch period (Glicko-2)

All games in a batch are collected first. Each match entry snapshots the opponent's rating and RD **at period start** (before any intra-batch updates). One Glicko-2 calculation runs per player at the end.

This matches the official Glicko-2 rating-period model. Repeated matchups within a batch both use the opponent's initial-period rating, not their post-first-game rating.

## ELO formula

Standard expected-score update with shared K:

```
Ea = 1 / (1 + 10^((Rb - Ra) / 400))
newA = Ra + K * (score - Ea)
```

Draws use `score = 0.5`. Rating changes are zero-sum.

## TrueSkill ranks

Lower rank is better. Wins use `[0, 1]` / `[1, 0]`; draws use `[0, 0]`.

## Glicko-2 opponent perspective

When building each player's match list, win/loss scores are inverted for the opponent's perspective. Draws remain `0.5`.

## Choosing an engine

- **ELO** — simple, well-understood, good for casual leaderboards
- **Glicko-2** — accounts for rating uncertainty (RD) and volatility; best for periodic batch updates
- **TrueSkill** — Bayesian skill estimate with uncertainty (`sigma`); good for matchmaking-style ratings

## Invalid data handling

All engines skip records with self-play, contradictory results (both `1` or both `0`), missing user IDs, or insufficient rounds. See [Game records](/recranks/game-records/) for details.
