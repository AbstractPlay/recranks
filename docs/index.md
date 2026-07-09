# Records and Rankings

`@abstractplay/recranks` is the Records and Rankings module of Abstract Play. It defines the canonical game record format (`APGameRecord`) and provides rating engines for two-player games.

## Documentation

- [Game records](/recranks/game-records/) — `APGameRecord` format, validation, and CLI tools
- [API](/recranks/api/) — `ELOBasic`, `Glicko2`, `Trueskill` public API
- [Rating algorithms](/recranks/raters/) — ELO, Glicko-2, and TrueSkill semantics
- [Schema reference](/recranks/schema-reference/) — auto-generated from `gamerecord.json`

## Resources

- [Gameslib docs](/gameslib/) — game implementations that produce records
- [Backend docs](/backend/) — serverless API that archives games and computes ratings
- [Renderer docs](/renderer/) — board JSON schema
- [GitHub repository](https://github.com/AbstractPlay/recranks)

*When changing raters or the gamerecord schema, update `/docs` in the same PR.*
