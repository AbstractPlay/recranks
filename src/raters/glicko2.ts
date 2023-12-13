import { APGameRecord } from "../schemas/gamerecord";
import { Rater, IRaterOptions, IRaterResults, IRating } from "./_base";
import glicko2 from "glicko2-lite";

/**
 * This library also only works for two-player games.
 */
export interface IGlickoOptions extends IRaterOptions {
    knownRatings: Map<string, IGlickoRating>;
    ratingStart: number;
    rdStart: number;
    volatilityStart: number;
    tau: number;
}

export interface IGlickoRating extends IRating {
    rd: number;
    volatility: number;
}

export class Glicko2 extends Rater {
    private ratingStart = 1500;
    private rdStart = 350;
    private volatilityStart = 0.06;
    private tau = 0.5;
    public knownRatings = new Map<string, IGlickoRating>();

    constructor(opts?: IGlickoOptions) {
        super(opts);
        if (opts?.knownRatings !== undefined) {
            this.knownRatings = new Map(opts.knownRatings)
        }
        if (opts?.ratingStart !== undefined) {
            this.ratingStart = opts.ratingStart;
        }
        if (opts?.rdStart !== undefined) {
            this.rdStart = opts.rdStart;
        }
        if (opts?.volatilityStart !== undefined) {
            this.volatilityStart = opts.volatilityStart;
        }
        if (opts?.tau !== undefined) {
            this.tau = opts.tau;
        }
    }

    public runProcessed(batch: APGameRecord[]): IRaterResults {
        const warnings: string[] = [];
        const errors: string[] = [];

        // examine each record and add each result to each player's opponent list
        // process each player entry

        const ratings: Map<string, IGlickoRating> = new Map(this.knownRatings);
        const matches = new Map<string, [number,number,number][]>();
        const recids: Set<string> = new Set();
        let numRated = 0;
        for (let i = 0; i < batch.length; i++) {
            const rec = batch[i];
            // Can't rate without a game id
            if (rec.header.site.gameid === undefined) {
                if (this.failHard) {
                    throw new Error(`Record ${i} does not have a game ID. This should never happen.`);
                }
                errors.push(`Record ${i} does not have a game ID. This should never happen.`);
                continue;
            }
            const recid = rec.header.site.name + "|" + rec.header.site.gameid;

            // Check for duplicate recid
            if (recids.has(recid)) {
                if (this.failHard) {
                    throw new Error(`Duplicate record ID: ${recid}.`);
                }
                errors.push(`Duplicate record ID: ${recid}.`);
                continue;
            }
            recids.add(recid);

            // Check for required number of players
            if (rec.header.players.length !== 2) {
                if (this.failHard) {
                    throw new Error(`This engine can only rate two-player games. Record ${recid} has ${rec.header.players.length}.`);
                }
                errors.push(`This engine can only rate two-player games. Record ${recid} has ${rec.header.players.length}.`);
                continue;
            }

            // Skip "unrated" records
            if ( (this.respectUnrated) && (rec.header.unrated) ) {
                continue;
            }

            // Check for minimum number of rounds
            if (rec.moves.length < this.minRounds) {
                warnings.push(`Record ${recid} lasted fewer than ${this.minRounds} rounds. Skipping.`);
                continue;
            }

            const p1 = rec.header.players[0];
            const p2 = rec.header.players[1];
            if ( (p1.userid === undefined) || (p1.userid === "") || (p2.userid === undefined) || (p2.userid === "") ) {
                warnings.push(`At least one player in record ${recid} does not have a defined user ID. Skipping.`);
                continue;
            }
            const p1id = rec.header.site.name + "|" + p1.userid;
            const p2id = rec.header.site.name + "|" + p2.userid;
            let p1rating: IGlickoRating = {
                userid: p1id,
                rating: this.ratingStart,
                rd: this.rdStart,
                volatility: this.volatilityStart,
                recCount: 0,
                wins: 0,
                losses: 0,
                draws: 0
            };
            if (ratings.has(p1id)) {
                p1rating = ratings.get(p1id)!;
            }
            let p2rating: IGlickoRating = {
                userid: p2id,
                rating: this.ratingStart,
                rd: this.rdStart,
                volatility: this.volatilityStart,
                recCount: 0,
                wins: 0,
                losses: 0,
                draws: 0
            };
            if (ratings.has(p2id)) {
                p2rating = ratings.get(p2id)!;
            }

            // Get result (only relative magnitude matters)
            let result: 1|0|0.5 = 0.5;
            if (p1.result > p2.result) {
                result = 1;
                p1rating.wins++;
                p2rating.losses++;
            } else if (p1.result < p2.result) {
                result = 0;
                p1rating.losses++;
                p2rating.wins++;
            } else {
                p1rating.draws++;
                p2rating.draws++;
            }

            // add result to each player's list of matches
            p1rating.recCount++;
            if (matches.has(p1id)) {
                const lst = matches.get(p1id)!;
                matches.set(p1id, [...lst, [p2rating.rating, p2rating.rd, result]]);
            } else {
                matches.set(p1id, [[p2rating.rating, p2rating.rd, result]]);
            }
            p2rating.recCount++;
            if (matches.has(p2id)) {
                const lst = matches.get(p2id)!;
                matches.set(p2id, [...lst, [p1rating.rating, p1rating.rd, result === 1 ? 0 : result === 0 ? 1 : result]]);
            } else {
                matches.set(p2id, [[p1rating.rating, p1rating.rd, result === 1 ? 0 : result === 0 ? 1 : result]]);
            }

            ratings.set(p1id, {...p1rating});
            ratings.set(p2id, {...p2rating});

            numRated++;
        }

        // process each set of matches simultaneously
        for (const [uid, matchlst] of matches.entries()) {
            // fetch user record
            const rating = ratings.get(uid)!;
            const {rating: newRating, rd: newRd, vol: newSigma} = glicko2(rating.rating, rating.rd, rating.volatility, matchlst, {rating: this.ratingStart, tau: this.tau});
            ratings.set(uid, {...rating, rating: newRating, rd: newRd, volatility: newSigma});
        }

        const results: IRaterResults = {
            recsReceived: batch.length,
            recsRated: numRated,
            ratings
        };
        if (errors.length > 0) {
            results.errors = errors;
        }
        if (warnings.length > 0) {
            results.warnings = warnings;
        }
        return results;
    }
}
