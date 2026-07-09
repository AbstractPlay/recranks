import Ajv, {type ValidateFunction} from "ajv";
import addFormats from "ajv-formats";
import { APGameRecord } from "../schemas/gamerecord"
import schema from "../schemas/gamerecord.json";

export interface IRaterOptions {
    failHard?: boolean;
    minRounds?: number;
    respectUnrated?: boolean;
}

export interface IRating {
    userid: string;
    rating: number;
    recCount: number;
    wins: number;
    losses: number;
    draws: number;
    [key: string]: any;
}

export interface IRaterResults {
    ratings: Map<string, IRating>;
    recsReceived: number;
    recsRated: number;
    warnings?: string[];
    errors?: string[];
}

export abstract class Rater {

    protected failHard: boolean = false;
    protected minRounds: number = 3;
    protected respectUnrated: boolean = true;
    protected validate: ValidateFunction;

    constructor(opts?: IRaterOptions) {
        if (opts !== undefined) {
            if (opts.failHard !== undefined) {
                this.failHard = opts.failHard;
            }
            if (opts.minRounds !== undefined) {
                if (opts.minRounds < 0) {
                    throw new Error(`minRounds must be >= 0, got ${opts.minRounds}`);
                }
                this.minRounds = opts.minRounds;
            }
            if (opts.respectUnrated !== undefined) {
                this.respectUnrated = opts.respectUnrated;
            }
        }

        const ajv = new Ajv({allowUnionTypes: true});
        addFormats(ajv);
        this.validate = ajv.compile(schema);
    }

    protected checkSelfPlay(p1id: string, p2id: string, recid: string): string | null {
        if (p1id === p2id) {
            return `Record ${recid} has the same user ID for both players. Skipping.`;
        }
        return null;
    }

    protected checkContradictoryResults(p1Result: number, p2Result: number, recid: string): string | null {
        if (p1Result === p2Result && (p1Result === 1 || p1Result === 0)) {
            return `Record ${recid} has contradictory results (both players have result ${p1Result}). Skipping.`;
        }
        if (Number.isNaN(p1Result) || Number.isNaN(p2Result)) {
            return `Record ${recid} has invalid (NaN) player results. Skipping.`;
        }
        return null;
    }

    protected roundCount(rec: APGameRecord): number {
        return rec.moves?.length ?? 0;
    }

    public abstract runProcessed(batch: APGameRecord[]): IRaterResults;

    public run(batch: string[]): IRaterResults {
        const recs: APGameRecord[] = [];
        for (let i = 0; i < batch.length; i++) {
            const rec = JSON.parse(batch[i]) as APGameRecord;
            if (! this.validate(rec)) {
                throw new Error(`Record ${i} is not a valid game record.`);
            }
            recs.push(rec);
        }
        return this.runProcessed(recs);
    }
}
