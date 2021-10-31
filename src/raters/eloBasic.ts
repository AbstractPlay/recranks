import { APGameRecord } from "../schemas/gamerecord";
import { Rater, IRaterOptions, IRaterResults, IRating } from "./_base";

/**
 * This library only accepts a single K constant for all players.
 * This library also only works for two-player games.
 */
export interface IELOOptions extends IRaterOptions {
    K: (p1Rating: number, p1Games: number, p2Rating: number, p2Games: number) => number;
    ratingStart: number;
}

export class ELOBasic extends Rater {
    private ratingStart = 1200;
    private K = (p1Rating: number, p1Games: number, p2Rating: number, p2Games: number): number => { return 30; };

    constructor(opts?: IELOOptions) {
        super(opts);
        if (opts !== undefined) {
            if (opts.K !== undefined) {
                this.K = opts.K;
            }
            if (opts.ratingStart !== undefined) {
                this.ratingStart = opts.ratingStart;
            }
        }
    }

    private genRating(Ra: number, Rb: number, result: 1|0|0.5, K: number): [number, number] {
        const Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
        const Eb = 1 / (1 + Math.pow(10, (Ra - Rb) / 400));

        let newA: number = 0;
        let newB: number = 0;
        if (result === 1) {
            newA = Ra + (K * (1 - Ea));
            newB = Rb + (K * (0 - Eb));
        } else if (result === 0) {
            newA = Ra + (K * (0 - Ea));
            newB = Rb + (K * (1 - Eb));
        } else {
            newA = Ra + (K * (0.5 - Ea));
            newB = Rb + (K * (0.5 - Eb));
        }
        return [newA, newB];
    }

    public runProcessed(batch: APGameRecord[]): IRaterResults {
        const warnings: string[] = [];
        const errors: string[] = [];

        // Sort by end date ascending
        const sorted = [...batch];
        sorted.sort((a, b) => { return a.header["date-end"].localeCompare(b.header["date-end"]); });

        const ratings: Map<string, IRating> = new Map();
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
            let p1rating: IRating = {
                userid: p1id,
                rating: this.ratingStart,
                recCount: 0,
                wins: 0,
                losses: 0,
                draws: 0
            };
            if (ratings.has(p1id)) {
                p1rating = ratings.get(p1id)!;
            }
            let p2rating: IRating = {
                userid: p2id,
                rating: this.ratingStart,
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
            } else if (p1.result < p2.result) {
                result = 0;
            }

            // Calculate new ratings
            const K = this.K(p1rating.rating, p1rating.recCount, p2rating.rating, p2rating.recCount);
            const [newp1, newp2] = this.genRating(p1rating.rating, p2rating.rating, result, K);

            // Update ratings
            p1rating.rating = newp1;
            p1rating.recCount++;
            if (result === 1) {
                p1rating.wins++;
            } else if (result === 0) {
                p1rating.losses++;
            } else {
                p1rating.draws++;
            }
            p2rating.rating = newp2;
            p2rating.recCount++;
            if (result === 1) {
                p2rating.losses++;
            } else if (result === 0) {
                p2rating.wins++;
            } else {
                p1rating.draws++;
            }
            ratings.set(p1id, p1rating);
            ratings.set(p2id, p2rating);
            numRated++;
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
