import { expect } from "chai";
import {
    countRecordMoveSlots,
    countRecordMoves,
    inferTurnModelFromMoves,
    legacyRoundUsesSequence,
    movesInReplayOrder,
    SIMULTANEOUS_ELIM_TOKEN,
    turnModelFromRecord,
} from "../src/turnModel";
import type { APGameRecord } from "../src/schemas/gamerecord";

function baseRecord(moves: APGameRecord["moves"], headerExtra: Record<string, unknown> = {}): APGameRecord {
    return {
        header: {
            game: { name: "Test" },
            site: { name: "Abstract Play", gameid: "test-1" },
            "date-start": "2024-01-01T12:00:00Z",
            "date-end": "2024-01-01T13:00:00Z",
            "date-generated": "2024-01-01T13:00:00Z",
            players: [
                { name: "A", result: 1 },
                { name: "B", result: 0 },
            ],
            ...headerExtra,
        },
        moves,
    };
}

describe("turnModel helpers", () => {
    it("turnModelFromRecord reads header turn-model", () => {
        const rec = baseRecord([["a1", "b1"]], { "turn-model": "skip-turn" });
        expect(turnModelFromRecord(rec)).to.equal("skip-turn");
    });

    it("countRecordMoves legacy path equals moves.length", () => {
        const rec = baseRecord([["a1", "b1"], ["a2", "b2"], ["a3", "b3"]]);
        expect(countRecordMoves(rec)).to.equal(3);
    });

    it("countRecordMoves with skip-turn header ignores all-null rounds", () => {
        const rec = baseRecord([
            ["m1", null, null],
            [null, null, null],
            ["m2", null, null],
        ], { "turn-model": "skip-turn" });
        expect(countRecordMoves(rec)).to.equal(2);
    });

    it("countRecordMoveSlots legacy path sums round widths", () => {
        const rec = baseRecord([["a1", "b1"], ["a2"]]);
        expect(countRecordMoveSlots(rec)).to.equal(3);
    });

    it("countRecordMoveSlots with simultaneous header skips null seats", () => {
        const rec = baseRecord([
            ["a1", null],
            [null, "b2"],
        ], { "turn-model": "simultaneous" });
        expect(countRecordMoveSlots(rec)).to.equal(2);
    });

    it("inferTurnModelFromMoves detects legacy simultaneous elim token", () => {
        const rec = baseRecord([[SIMULTANEOUS_ELIM_TOKEN, "move"]]);
        expect(inferTurnModelFromMoves(rec)).to.equal("simultaneous");
    });

    it("legacyRoundUsesSequence detects sequenced object rounds", () => {
        expect(legacyRoundUsesSequence([
            { sequence: 2, move: "second" },
            { sequence: 1, move: "first" },
        ])).to.equal(true);
        expect(legacyRoundUsesSequence(["a1", "b1"])).to.equal(false);
    });

    it("movesInReplayOrder sorts by sequence for skip-turn header", () => {
        const round = [
            { sequence: 3, move: "third" },
            null,
            { sequence: 1, move: "first" },
        ];
        const rec = baseRecord([round], { "turn-model": "skip-turn" });
        const ordered = movesInReplayOrder(round, rec);
        expect(ordered.map((slot) => (typeof slot === "object" && slot !== null ? slot.move : slot))).to.deep.equal([
            "first",
            "third",
            null,
        ]);
    });
});
