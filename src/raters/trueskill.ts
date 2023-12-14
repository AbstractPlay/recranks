import { APGameRecord } from "../schemas/gamerecord";
import { Rater, IRaterOptions, IRaterResults, IRating } from "./_base";
import { Rating, TrueSkill as TrueSkillEnv } from 'ts-trueskill';

/**
 * This library also only works for two-player games.
 */
export interface ITrueskillOptions extends IRaterOptions {
    muStart?: number;
    sigmaStart?: number;
    betaStart?: number;
    tauStart?: number;
    drawProbability?: number;
}

export interface ITrueskillRating extends IRating {
    sigma: number;
}

export class Trueskill extends Rater {
    private muStart: number|undefined = undefined;
    private sigmaStart: number|undefined = undefined;
    private betaStart: number|undefined = undefined;
    private tauStart: number|undefined = undefined;
    private drawProbability: number|undefined = undefined;
    private env: TrueSkillEnv;

    constructor(opts?: ITrueskillOptions) {
        super(opts);
        if (opts !== undefined) {
            if (opts.muStart !== undefined) {
                this.muStart = opts.muStart;
            }
            if (opts.sigmaStart !== undefined) {
                this.sigmaStart = opts.sigmaStart;
            }
            if (opts.betaStart !== undefined) {
                this.betaStart = opts.betaStart;
            }
            if (this.tauStart !== undefined) {
                this.tauStart = opts.tauStart
            }
            if (this.drawProbability !== undefined) {
                this.drawProbability = opts.drawProbability;
            }
        }
        this.env = new TrueSkillEnv(this.muStart, this.sigmaStart, this.betaStart, this.tauStart, this.drawProbability);
    }

    public runProcessed(batch: APGameRecord[]): IRaterResults {
        const warnings: string[] = [];
        const errors: string[] = [];

        // Sort by end date ascending
        const sorted = [...batch];
        sorted.sort((a, b) => { return a.header["date-end"].localeCompare(b.header["date-end"]); });

        const ratings: Map<string, ITrueskillRating> = new Map();
        const recids: Set<string> = new Set();
        let numRated = 0;
        for (let i = 0; i < batch.length; i++) {
            const rec = sorted[i];
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
            const {mu: muStart, sigma: sigmaStart} = this.env.createRating();
            let p1rating: ITrueskillRating = {
                userid: p1id,
                rating: muStart,
                sigma: sigmaStart,
                recCount: 0,
                wins: 0,
                losses: 0,
                draws: 0
            };
            if (ratings.has(p1id)) {
                p1rating = ratings.get(p1id)!;
            }
            let p2rating: ITrueskillRating = {
                userid: p2id,
                rating: muStart,
                sigma: sigmaStart,
                recCount: 0,
                wins: 0,
                losses: 0,
                draws: 0
            };
            if (ratings.has(p2id)) {
                p2rating = ratings.get(p2id)!;
            }
            const ratingP1 = this.env.createRating(p1rating.rating, p1rating.sigma);
            const ratingP2 = this.env.createRating(p2rating.rating, p2rating.sigma);

            // Get result (only relative magnitude matters)
            let ranks: [1|0,1|0];
            if (p1.result > p2.result) {
                ranks = [0,1];
                p1rating.wins++;
                p2rating.losses++;
            } else if (p1.result < p2.result) {
                ranks = [1,0];
                p1rating.losses++;
                p2rating.wins++;
            } else {
                ranks = [0,0];
                p1rating.draws++;
                p2rating.draws++;
            }

            // update rating
            p1rating.recCount++;
            p2rating.recCount++;
            const [t1, t2] = this.env.rate([[ratingP1],[ratingP2]], ranks) as Rating[][];
            p1rating.rating = t1[0].mu;
            p1rating.sigma = t1[0].sigma;
            p2rating.rating = t2[0].mu;
            p2rating.sigma = t2[0].sigma;
            ratings.set(p1id, {...p1rating});
            ratings.set(p2id, {...p2rating});

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
