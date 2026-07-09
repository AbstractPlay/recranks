---
layout: layouts/base.njk
permalink: /recranks/schema-reference/
title: Schema reference
generated: true
schemaVersion: 1.0.0
---

# Game record schema reference (v1.0.0)

Auto-generated from `gamerecord.json`. Narrative documentation is in [Game records](/recranks/game-records/).

## Top-level properties

| Property | Required | Description |
| --- | --- | --- |
| header | yes | Series of (essentially) name-value pairs that gives the game metadata. |
| moves | yes | The list of moves, including possible commentary. Each entry represents a game round (one turn for each player). |

## Header properties

| Property | Required | Description |
| --- | --- | --- |
| `game` | no | A description of exactly what game this report represents. |
| `event` | no | Only provide if part of a formal tournament or event. The 'round' header must also exist. |
| `round` | no | Only use when part of a larger formal event. The 'event' header must also exist. |
| `site` | no | Where the game took place. |
| `date-start` | no | Datetime the game started. |
| `date-end` | no | Datetime the game ended. Required because the recrank system is not intended to house incomplete records. |
| `date-generated` | no | The datetime this report was last generated/updated. |
| `unrated` | no | Set to true to explicitly flag a record as 'unrated' |
| `pied` | no | Set to `true` if the pie rule was invoked. |
| `startingPosition` | no | Some games have variable starting conditions (like Alien City). This string should describe that position. |

## Site properties (`header.site`)

| Property | Required | Description |
| --- | --- | --- |
| `name` | no | For physical games, it should be the location of the game. For online games, use a consistent name for that service so t |
| `gameid` | no | For online games, provide the unique game identifier for this game on the given site. This should be unique across the e |

## Player properties (`header.players[]`)

| Property | Required | Description |
| --- | --- | --- |
| `name` | yes | User's name as of the time the game was archived. |
| `userid` | no | User's unique identifier on the `site` indicated. Optional, but if not provided, the game cannot be rated. |
| `score` | no | Where applicable, give the player's score. |
| `is_ai` | no | This field flags a player as being an AI. |
| `result` | yes | This is how the system determines who won. Each player should be given a number. Players who share the same number are s |

## Moves

`moves` is an array of rounds. Each round is an array of per-player entries (string, null, or move object with `move` text). Position in each round correlates to seating order in `header.players`.

