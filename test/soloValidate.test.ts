import "mocha";
import { expect } from "chai";
import type { APGameRecord } from "../src/schemas/gamerecord";
import { movesInReplayOrder } from "../src/turnModel";
import {
    collectSoloArchiveWarnings,
    collectSoloOutcomeErrors,
    isSeededSoloRecord,
    validateSeededSoloReplay,
} from "../src/soloValidate";
import { buildSoloLeaderboards, soloLeaderboardToCsv } from "../src/soloLeaderboard";

const SEED = "20260819-graded-fixture";

function makeGradedSoloRecord(): APGameRecord {
    return {
        header: {
            game: { name: "Solo Puzzle", variants: ["standard"] },
            site: { name: "Abstract Play", gameid: "solo-graded-1" },
            "date-start": "2026-08-19T14:00:00.000Z",
            "date-end": "2026-08-19T14:30:00.000Z",
            "date-generated": "2026-08-19T14:30:01.000Z",
            "outcome-type": "graded",
            "score-direction": "higher",
            "score-label": "points",
            "challenge-seed": SEED,
            unrated: true,
            players: [{
                name: "alice",
                userid: "user-alice",
                score: 73,
                grade: "good",
                result: 1,
            }],
        },
        moves: [
            ["score"],
            ["score"],
            ["finish"],
        ],
    };
}

describe("soloValidate", () => {
    it("detects seeded solo records", () => {
        const rec = makeGradedSoloRecord();
        expect(isSeededSoloRecord(rec)).to.equal(true);
    });

    it("replays seeded moves and matches graded outcome", () => {
        const rec = makeGradedSoloRecord();
        const applied: string[] = [];
        const errors = validateSeededSoloReplay(
            rec,
            (_seed, _variants) => ({
                move(m: string) {
                    applied.push(m);
                },
                getPlayerScore: () => 73,
                getPlayerGrade: () => "good",
            }),
            movesInReplayOrder,
        );

        expect(applied).to.deep.equal(["score", "score", "finish"]);
        expect(errors).to.deep.equal([]);
    });

    it("reports score and grade mismatches", () => {
        const rec = makeGradedSoloRecord();
        const errors = collectSoloOutcomeErrors(rec, {
            move: () => undefined,
            getPlayerScore: () => 50,
            getPlayerGrade: () => "pass",
        });
        expect(errors.some((e) => e.includes("score mismatch"))).to.equal(true);
        expect(errors.some((e) => e.includes("grade mismatch"))).to.equal(true);
    });

    it("warns when outcome-type is present without challenge-seed", () => {
        const rec = makeGradedSoloRecord();
        delete (rec.header as { "challenge-seed"?: string })["challenge-seed"];
        const warnings = collectSoloArchiveWarnings(rec);
        expect(warnings).to.have.lengthOf(1);
        expect(warnings[0]).to.include("challenge-seed");
    });
});

describe("soloLeaderboard", () => {
    it("keeps best attempt per user on the same seed", () => {
        const base = makeGradedSoloRecord();
        const retry = structuredClone(base);
        retry.header.site.gameid = "solo-graded-2";
        retry.header.players[0].score = 90;
        retry.header.players[0].grade = "excellent";
        retry.header["date-end"] = "2026-08-19T15:00:00.000Z";

        const boards = buildSoloLeaderboards([base, retry]);
        const key = "Solo Puzzle\tstandard\t20260819-graded-fixture";
        const rows = boards.get(key)!;
        expect(rows).to.have.lengthOf(1);
        expect(rows[0].score).to.equal(90);
        expect(rows[0].attempts).to.equal(2);
    });

    it("emits CSV rows", () => {
        const csv = soloLeaderboardToCsv(buildSoloLeaderboards([makeGradedSoloRecord()]));
        expect(csv.split("\n")[0]).to.equal("bucket,userid,name,score,grade,passed,date-end,attempts");
        expect(csv).to.include("user-alice");
        expect(csv).to.include("good");
    });
});
