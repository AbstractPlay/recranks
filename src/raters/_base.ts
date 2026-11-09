import AjvImport from "ajv";
import type { ValidateFunction } from "ajv";
import addFormatsImport from "ajv-formats";
import { APGameRecord } from "../schemas/gamerecord.js";
import schema from "../schemas/gamerecord.json" with { type: "json" };
import { countRecordMoves, turnModelFromRecord } from "../turnModel.js";

/** NodeNext mis-types ajv's default export as a module namespace. */
type AjvInstance = {
    compile(jsonSchema: object): ValidateFunction;
};
const ajvCtor = AjvImport as unknown as new (opts?: { allowUnionTypes?: boolean }) => AjvInstance;
const addFormats = addFormatsImport as unknown as (ajv: AjvInstance) => void;

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

        const ajv = new ajvCtor({allowUnionTypes: true});
        addFormats(ajv);
        this.validate = ajv.compile(schema);
    }

    protected checkSelfPlay(p1id: string, p2id: string, recid: string): string | null {
        if (p1id === p2id) {
            return `Record ${recid} has the same user ID for both players. Skipping.`;
        }
        return null;
    }

    protected checkInvalidPlayerResults(p1Result: number, p2Result: number, recid: string): string | null {
        if (Number.isNaN(p1Result) || Number.isNaN(p2Result)) {
            return `Record ${recid} has invalid (NaN) player results. Skipping.`;
        }
        return null;
    }

    protected roundCount(rec: APGameRecord): number {
        if (turnModelFromRecord(rec) !== undefined) {
            return countRecordMoves(rec);
        }
        return rec.moves?.length ?? 0;
    }

    /** Competitive raters only process head-to-head (2-player) records. */
    protected isCompetitiveRecord(rec: APGameRecord): boolean {
        return rec.header.players.length === 2;
    }

    /**
     * Per-player rating opt-out. `both` → skip entire record (like `header.unrated`).
     */
    protected competitiveSkipMode(rec: APGameRecord): "none" | "both" | "p1" | "p2" {
        if (rec.header.players.length !== 2) {
            return "none";
        }
        const p1Skip = rec.header.players[0].skipRating === true;
        const p2Skip = rec.header.players[1].skipRating === true;
        if (p1Skip && p2Skip) {
            return "both";
        }
        if (p1Skip) {
            return "p1";
        }
        if (p2Skip) {
            return "p2";
        }
        return "none";
    }

    protected competitiveResult(rec: APGameRecord): 1 | 0 | 0.5 {
        const p1 = rec.header.players[0].result;
        const p2 = rec.header.players[1].result;
        if (p1 > p2) {
            return 1;
        }
        if (p1 < p2) {
            return 0;
        }
        return 0.5;
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
