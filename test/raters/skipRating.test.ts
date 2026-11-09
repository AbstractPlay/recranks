/* tslint:disable:no-unused-expression */

import "mocha";
import { expect } from "chai";
import { ELOBasic, Glicko2, Trueskill } from "../../src/raters";
import { makeGameRecord } from "../helpers";

describe("per-player skipRating", () => {
    it("ELO: loser skipRating excludes loser only", () => {
        const rater = new ELOBasic({ minRounds: 0 });
        const rec = makeGameRecord({
            gameid: "asym-1",
            p1Result: 0,
            p2Result: 1,
            p1SkipRating: true,
        });
        const result = rater.runProcessed([rec]);

        expect(result.recsRated).to.equal(1);
        expect(result.ratings.has("Abstract Play|user1")).to.equal(false);
        const p2 = result.ratings.get("Abstract Play|user2")!;
        expect(p2.wins).to.equal(1);
        expect(p2.losses).to.equal(0);
        expect(p2.recCount).to.equal(1);
        expect(p2.rating).to.be.greaterThan(1200);
    });

    it("ELO: both skipRating skips the record", () => {
        const rater = new ELOBasic({ minRounds: 0 });
        const rec = makeGameRecord({
            gameid: "both-skip",
            p1SkipRating: true,
            p2SkipRating: true,
        });
        const result = rater.runProcessed([rec]);

        expect(result.recsRated).to.equal(0);
        expect(result.ratings.size).to.equal(0);
    });

    it("Glicko2: asymmetric skip keeps opponent W/L", () => {
        const rater = new Glicko2({ minRounds: 0, ratingStart: 1200, rdStart: 350 });
        const rec = makeGameRecord({
            gameid: "g-asym",
            p1Result: 0,
            p2Result: 1,
            p1SkipRating: true,
        });
        const result = rater.runProcessed([rec]);

        expect(result.recsRated).to.equal(1);
        const p2 = result.ratings.get("Abstract Play|user2")!;
        expect(p2.wins).to.equal(1);
        expect(p2.recCount).to.equal(1);
        expect(result.ratings.has("Abstract Play|user1")).to.equal(false);
    });

    it("Trueskill: asymmetric skip rates winner only", () => {
        const rater = new Trueskill({ minRounds: 0 });
        const rec = makeGameRecord({
            gameid: "ts-asym",
            p1Result: 0,
            p2Result: 1,
            p1SkipRating: true,
        });
        const result = rater.runProcessed([rec]);

        expect(result.recsRated).to.equal(1);
        expect(result.ratings.has("Abstract Play|user1")).to.equal(false);
        const p2 = result.ratings.get("Abstract Play|user2")!;
        expect(p2.wins).to.equal(1);
        expect(p2.recCount).to.equal(1);
    });
});
