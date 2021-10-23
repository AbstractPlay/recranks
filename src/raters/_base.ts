import Ajv from "ajv";
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
    protected validate: Ajv.ValidateFunction;

    constructor(opts?: IRaterOptions) {
        if (opts !== undefined) {
            if (opts.failHard !== undefined) {
                this.failHard = opts.failHard;
            }
            if (opts.minRounds !== undefined) {
                this.minRounds = opts.minRounds;
            }
            if (opts.respectUnrated !== undefined) {
                this.respectUnrated = opts.respectUnrated;
            }
        }

        const ajv = new Ajv();
        this.validate = ajv.compile(schema);
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
