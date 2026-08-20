import type { APGameRecord } from "./schemas/gamerecord";

export type TurnModel = "sequential" | "simultaneous" | "sequenced" | "skip-turn";

/** Legacy simultaneous elimination placeholder in published move slots (gameslib). */
export const SIMULTANEOUS_ELIM_TOKEN = "\u0091";

type MoveSlot = APGameRecord["moves"][number][number];
type Round = APGameRecord["moves"][number];

const TURN_MODELS: TurnModel[] = ["sequential", "simultaneous", "sequenced", "skip-turn"];

export const turnModelFromRecord = (rec: APGameRecord): TurnModel | undefined => {
    const raw = rec.header["turn-model"];
    if (typeof raw === "string" && (TURN_MODELS as string[]).includes(raw)) {
        return raw as TurnModel;
    }
    return undefined;
};

export const slotMoveText = (slot: MoveSlot): string | undefined => {
    if (slot === null) {
        return undefined;
    }
    if (typeof slot === "string") {
        return slot;
    }
    return slot.move;
};

/** Whether a move slot carries no replayable move (null, empty, or legacy elim token). */
export const isEmptyMoveSlot = (slot: MoveSlot, treatElimTokenAsEmpty: boolean): boolean => {
    if (slot === null) {
        return true;
    }
    const text = slotMoveText(slot);
    if (text === undefined || text === "") {
        return true;
    }
    if (treatElimTokenAsEmpty && text === SIMULTANEOUS_ELIM_TOKEN) {
        return true;
    }
    return false;
};

export const roundHasRealMove = (round: Round, treatElimTokenAsEmpty: boolean): boolean =>
    round.some((slot) => !isEmptyMoveSlot(slot, treatElimTokenAsEmpty));

/** Best-effort legacy inference when {@link turnModelFromRecord} is absent. */
export const inferTurnModelFromMoves = (rec: APGameRecord): TurnModel | undefined => {
    if (rec.moves.some((round) => round.some((slot) => slot === null))) {
        return "skip-turn";
    }
    if (rec.moves.some((round) => round.some((slot) => slotMoveText(slot) === SIMULTANEOUS_ELIM_TOKEN))) {
        return "simultaneous";
    }
    if (rec.moves.some((round) => legacyRoundUsesSequence(round))) {
        return "sequenced";
    }
    return undefined;
};

export const legacyRoundUsesSequence = (round: Round): boolean => {
    let sawSequencedObject = false;
    for (const slot of round) {
        if (slot === null) {
            continue;
        }
        if (typeof slot === "string") {
            return false;
        }
        if (slot.sequence === undefined) {
            return false;
        }
        sawSequencedObject = true;
    }
    return sawSequencedObject;
};

export const shouldSortRoundBySequence = (rec: APGameRecord, round: Round): boolean => {
    const model = turnModelFromRecord(rec);
    if (model === "sequenced" || model === "skip-turn") {
        return true;
    }
    return legacyRoundUsesSequence(round);
};

const sequenceOf = (slot: MoveSlot): number => {
    if (slot !== null && typeof slot === "object" && slot.sequence !== undefined) {
        return slot.sequence;
    }
    return Number.MAX_SAFE_INTEGER;
};

/** Replay order for one round row (seating order unless sequence sort applies). */
export const movesInReplayOrder = (round: Round, rec: APGameRecord): MoveSlot[] => {
    if (!shouldSortRoundBySequence(rec, round)) {
        return round;
    }
    return [...round]
        .map((slot, seatIndex) => ({ slot, seatIndex }))
        .sort((a, b) => {
            const seqDiff = sequenceOf(a.slot) - sequenceOf(b.slot);
            if (seqDiff !== 0) {
                return seqDiff;
            }
            return a.seatIndex - b.seatIndex;
        })
        .map(({ slot }) => slot);
};

/**
 * Number of logical rounds for stats/raters.
 * Legacy records (no header): {@link APGameRecord.moves}.length — bit-identical to today.
 */
export const countRecordMoves = (rec: APGameRecord): number => {
    const model = turnModelFromRecord(rec);
    if (model === undefined) {
        return rec.moves?.length ?? 0;
    }
    return rec.moves.filter((round) => roundHasRealMove(round, false)).length;
};

/**
 * Total replayable move slots (hours-per-move denominator).
 * Legacy records (no header): sum of round widths — bit-identical to today.
 */
export const countRecordMoveSlots = (rec: APGameRecord): number => {
    const model = turnModelFromRecord(rec);
    if (model === undefined) {
        return rec.moves.reduce((sum, round) => sum + round.length, 0);
    }
    let total = 0;
    for (const round of rec.moves) {
        for (const slot of round) {
            if (!isEmptyMoveSlot(slot, false)) {
                total++;
            }
        }
    }
    return total;
};
