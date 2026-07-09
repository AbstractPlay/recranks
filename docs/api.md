# API

All raters extend the abstract `Rater` base class and share common options.

## Shared options (`IRaterOptions`)

| Option | Default | Description |
|--------|---------|-------------|
| `failHard` | `false` | Throw on errors instead of collecting them |
| `minRounds` | `3` | Minimum `moves.length` to rate a game |
| `respectUnrated` | `true` | Skip records with `header.unrated: true` |

## Shared result shape (`IRaterResults`)

```typescript
interface IRaterResults {
    ratings: Map<string, IRating>;
    recsReceived: number;
    recsRated: number;
    warnings?: string[];
    errors?: string[];
}
```

Each `IRating` includes `userid`, `rating`, `recCount`, `wins`, `losses`, and `draws`.

## ELOBasic

Sequential ELO rating with a configurable K-factor.

```typescript
import { ELOBasic } from "@abstractplay/recranks";

const rater = new ELOBasic({
    ratingStart: 1200,
    K: (p1Rating, p1Games, p2Rating, p2Games) => 30,
    minRounds: 3,
});
const results = rater.runProcessed(records);
```

| Option | Default | Description |
|--------|---------|-------------|
| `ratingStart` | `1200` | Initial rating for new players |
| `K` | `30` | K-factor function (receives both players' rating and game count) |

## Glicko2

Batch rating-period Glicko-2 via `glicko2-lite`.

```typescript
import { Glicko2 } from "@abstractplay/recranks";

const rater = new Glicko2({
    ratingStart: 1500,
    rdStart: 350,
    volatilityStart: 0.06,
    tau: 0.5,
    knownRatings: existingRatingsMap,
});
const results = rater.runProcessed(records);
```

| Option | Default | Description |
|--------|---------|-------------|
| `ratingStart` | `1500` | Initial rating |
| `rdStart` | `350` | Initial rating deviation |
| `volatilityStart` | `0.06` | Initial volatility |
| `tau` | `0.5` | System constant |
| `knownRatings` | empty | Seed ratings from a previous period |

`IGlickoRating` extends `IRating` with `rd` and `volatility`.

## Trueskill

Sequential TrueSkill via `ts-trueskill`.

```typescript
import { Trueskill } from "@abstractplay/recranks";

const rater = new Trueskill({
    muStart: 25,
    sigmaStart: 8.333,
    betaStart: 4.166,
    tauStart: 0.083,
    drawProbability: 0.1,
});
const results = rater.runProcessed(records);
```

| Option | Default | Description |
|--------|---------|-------------|
| `muStart` | library default | Initial mean |
| `sigmaStart` | library default | Initial uncertainty |
| `betaStart` | library default | Performance variance |
| `tauStart` | library default | Dynamics factor |
| `drawProbability` | library default | Draw probability |

`ITrueskillRating` extends `IRating` with `sigma`.

## Entry points

```typescript
// Validate JSON strings and rate
rater.run(batch: string[]): IRaterResults;

// Rate pre-parsed records (no schema validation)
rater.runProcessed(batch: APGameRecord[]): IRaterResults;
```

Player IDs are keyed as `{site.name}|{userid}`.
