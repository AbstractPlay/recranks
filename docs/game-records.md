# Game records

Game reports use the `APGameRecord` JSON format, modelled after chess PGN but expressed as JSON so multi-player and complex games (such as Homeworlds) can be represented.

## Schema

The authoritative schema is [`src/schemas/gamerecord.json`](https://github.com/AbstractPlay/recranks/blob/main/src/schemas/gamerecord.json). TypeScript types are generated from it via `npm run json2ts`.

See the [schema reference](/recranks/schema-reference/) for a generated field listing.

## Key fields

### Header

| Field | Purpose |
|-------|---------|
| `header.game.name` | Game name (must be consistent across services) |
| `header.site.name` | Site identifier (e.g. `Abstract Play`) |
| `header.site.gameid` | Unique game ID on the site (required for rating) |
| `header.date-end` | When the game ended (used for chronological rating) |
| `header.players` | Player list with `userid`, `name`, and `result` |
| `header.unrated` | When `true`, raters skip this record |

### Player results

Each player gets a `result` number. Higher numbers indicate better performance. For two-player games:

- Winner: `1`, loser: `0` (convention)
- Draw: same number for both players (e.g. both `2`)
- Both `1` or both `0` is treated as contradictory data and skipped

### Moves

`moves` is an array of rounds; each round is an array of moves in seating order. Raters use `moves.length` as the round count. By default, records with fewer than 3 rounds are skipped (`minRounds` option).

## Validation

Use `Rater.run()` to validate records against the JSON Schema before rating:

```typescript
import { ELOBasic } from "@abstractplay/recranks";

const rater = new ELOBasic();
const results = rater.run([jsonString1, jsonString2]);
```

`runProcessed()` accepts pre-parsed objects and skips schema validation — useful when records are already validated upstream.

## CLI tools

| Script | Purpose |
|--------|---------|
| `bin/validate.ts` | Validate game record JSON files |
| `bin/convert.ts` | Convert legacy formats to `APGameRecord` |
| `bin/convert-homeworlds.ts` | Convert Homeworlds-specific records |

## Edge cases

Raters skip (with warnings) records that have:

- Missing or empty `userid` for either player
- Same `userid` for both players (self-play)
- Contradictory results (both `result: 1` or both `result: 0`)
- Fewer rounds than `minRounds`

Set `failHard: true` to throw instead of warning for self-play and contradictory results.
