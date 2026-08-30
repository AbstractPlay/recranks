import type { APGameRecord } from "./schemas/gamerecord.js";

export type SoloOutcomeType = "binary" | "graded" | "score" | "timed";
export type ScoreDirection = "higher" | "lower";

export type MoveRound = APGameRecord["moves"][number];

export interface ISoloRecordHeader {
    "outcome-type"?: SoloOutcomeType;
    "score-direction"?: ScoreDirection;
    "score-label"?: string;
    "challenge-seed"?: string;
}

export interface ISoloRecordPlayer {
    score?: number;
    grade?: string;
    passed?: boolean;
    result?: number;
}

/** Engine surface needed to verify archived solo outcomes after replay. */
export interface ISoloReplayEngine {
    move(move: string, opts?: { trusted?: boolean }): unknown;
    getPlayerScore?(player: number): number | undefined;
    getPlayerGrade?(player: number): string | undefined;
    getBinaryPassed?(player: number): boolean | undefined;
    getPlayerElapsedMs?(): number | undefined;
}

export type SoloReplayFactory = (seed: string, variants: string[]) => ISoloReplayEngine;

export const isSoloRecord = (rec: APGameRecord): boolean => {
    return rec.header.players.length === 1;
};

export const soloHeader = (rec: APGameRecord): ISoloRecordHeader & APGameRecord["header"] => {
    return rec.header as ISoloRecordHeader & APGameRecord["header"];
};

export const isSeededSoloRecord = (rec: APGameRecord): boolean => {
    const seed = soloHeader(rec)["challenge-seed"];
    return isSoloRecord(rec) && typeof seed === "string" && seed.length > 0;
};

export const flattenRecordMoves = (
    rec: APGameRecord,
    orderMoves: (round: MoveRound, record: APGameRecord) => Array<string | null | { move: string }>,
): string[] => {
    const moves: string[] = [];
    for (const round of rec.moves) {
        for (const move of orderMoves(round, rec)) {
            if (move === null) {
                continue;
            }
            if (typeof move === "string") {
                moves.push(move);
            } else {
                moves.push(move.move);
            }
        }
    }
    return moves;
};

export const collectSoloOutcomeErrors = (rec: APGameRecord, engine: ISoloReplayEngine): string[] => {
    const errors: string[] = [];
    const header = soloHeader(rec);
    const player = rec.header.players[0] as ISoloRecordPlayer & (typeof rec.header.players)[0];
    const outcomeType = header["outcome-type"];

    if (outcomeType === "timed") {
        const elapsed = engine.getPlayerElapsedMs?.();
        if (player.score !== undefined && elapsed !== undefined && elapsed !== player.score) {
            errors.push(`timed score mismatch: engine ${elapsed} vs record ${player.score}`);
        }
    } else if (player.score !== undefined) {
        const actual = engine.getPlayerScore?.(1);
        if (actual !== undefined && actual !== player.score) {
            errors.push(`score mismatch: engine ${actual} vs record ${player.score}`);
        }
    }

    if (outcomeType === "graded" && player.grade !== undefined) {
        const grade = engine.getPlayerGrade?.(1);
        if (grade !== undefined && grade !== player.grade) {
            errors.push(`grade mismatch: engine ${grade} vs record ${player.grade}`);
        }
    }

    if (outcomeType === "binary" && player.passed !== undefined) {
        const passed = engine.getBinaryPassed?.(1);
        if (passed !== undefined && passed !== player.passed) {
            errors.push(`passed mismatch: engine ${passed} vs record ${player.passed}`);
        }
    }

    return errors;
};

/** Replay a seeded solo record and compare outcome fields when the engine exposes hooks. */
export const validateSeededSoloReplay = (
    rec: APGameRecord,
    factory: SoloReplayFactory,
    orderMoves: (round: MoveRound, record: APGameRecord) => Array<string | null | { move: string }>,
): string[] => {
    const header = soloHeader(rec);
    const seed = header["challenge-seed"];
    if (seed === undefined || seed.length === 0) {
        return ["missing challenge-seed"];
    }

    const variants = rec.header.game.variants ?? [];
    const moves = flattenRecordMoves(rec, orderMoves);
    const engine = factory(seed, variants);

    try {
        for (const move of moves) {
            engine.move(move, { trusted: true });
        }
    } catch (err) {
        return [`replay failed: ${String(err)}`];
    }

    return collectSoloOutcomeErrors(rec, engine);
};

/** Warnings when a solo archive is missing fields expected for seeded play. */
export const collectSoloArchiveWarnings = (rec: APGameRecord): string[] => {
    if (!isSoloRecord(rec)) {
        return [];
    }
    const header = soloHeader(rec);
    const warnings: string[] = [];
    if (header["outcome-type"] !== undefined) {
        const seed = header["challenge-seed"];
        if (seed === undefined || seed.length === 0) {
            warnings.push(
                "solo record has outcome-type but no challenge-seed; seeded solo archives must persist the assigned seed",
            );
        }
    }
    return warnings;
};
