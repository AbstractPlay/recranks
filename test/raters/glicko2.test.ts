/* tslint:disable:no-unused-expression */

import "mocha";
import { expect } from "chai";
import { Glicko2, type IGlickoRating } from "../../src/raters";
import { makeGameRecord } from "../helpers";

describe("Glicko-2", () => {
    it("produces same ratings regardless of input order", () => {
        const rater = new Glicko2({ minRounds: 0 });
        const early = makeGameRecord({
            gameid: "early",
            dateEnd: "2024-01-01T10:00:00Z",
            p1Userid: "alice",
            p2Userid: "bob",
            p1Result: 1,
            p2Result: 0,
        });
        const late = makeGameRecord({
            gameid: "late",
            dateEnd: "2024-01-02T10:00:00Z",
            p1Userid: "alice",
            p2Userid: "bob",
            p1Result: 0,
            p2Result: 1,
        });

        const forward = rater.runProcessed([early, late]);
        const reverse = rater.runProcessed([late, early]);

        const forwardAlice = forward.ratings.get("Abstract Play|alice")!.rating;
        const reverseAlice = reverse.ratings.get("Abstract Play|alice")!.rating;
        expect(forwardAlice).to.be.closeTo(reverseAlice, 0.01);
    });

    it("counts wins in chronological order", () => {
        const rater = new Glicko2({ minRounds: 0 });
        const early = makeGameRecord({
            gameid: "early",
            dateEnd: "2024-01-01T10:00:00Z",
            p1Userid: "alice",
            p2Userid: "bob",
            p1Result: 1,
            p2Result: 0,
        });
        const late = makeGameRecord({
            gameid: "late",
            dateEnd: "2024-01-02T10:00:00Z",
            p1Userid: "alice",
            p2Userid: "bob",
            p1Result: 0,
            p2Result: 1,
        });

        const result = rater.runProcessed([late, early]);
        const alice = result.ratings.get("Abstract Play|alice")!;
        expect(alice.wins).to.equal(1);
        expect(alice.losses).to.equal(1);
    });

    it("skips self-play with a warning", () => {
        const rater = new Glicko2({ minRounds: 0 });
        const rec = makeGameRecord({ gameid: "g1", p1Userid: "same", p2Userid: "same" });
        const result = rater.runProcessed([rec]);

        expect(result.recsRated).to.equal(0);
        expect(result.warnings).to.have.lengthOf(1);
        expect(result.warnings![0]).to.include("same user ID");
    });

    it("updates rating after a win", () => {
        const rater = new Glicko2({ minRounds: 0 });
        const rec = makeGameRecord({ gameid: "g1", p1Result: 1, p2Result: 0 });
        const result = rater.runProcessed([rec]);

        const p1 = result.ratings.get("Abstract Play|user1")!;
        expect(p1.rating).to.be.greaterThan(1500);
        expect(p1.wins).to.equal(1);
    });

    it("increases RD for inactive players when the batch is empty", () => {
        const rater = new Glicko2({ minRounds: 0 });
        const rec = makeGameRecord({
            gameid: "g1",
            p1Userid: "alice",
            p2Userid: "bob",
            p1Result: 1,
            p2Result: 0,
        });
        const period0 = rater.runProcessed([rec]);
        const alice0 = period0.ratings.get("Abstract Play|alice")!;

        rater.knownRatings = new Map(period0.ratings as Map<string, IGlickoRating>);
        const period1 = rater.runProcessed([]);

        const alice1 = period1.ratings.get("Abstract Play|alice")!;
        expect(alice1.rd).to.be.greaterThan(alice0.rd);
        expect(alice1.rating).to.equal(alice0.rating);
        expect(alice1.volatility).to.equal(alice0.volatility);
    });

    it("increases RD for players who sit out while opponents play", () => {
        const rater = new Glicko2({ minRounds: 0 });
        const period0 = rater.runProcessed([
            makeGameRecord({
                gameid: "g1",
                p1Userid: "alice",
                p2Userid: "bob",
                p1Result: 1,
                p2Result: 0,
            }),
        ]);
        const bobRd0 = period0.ratings.get("Abstract Play|bob")!.rd;

        rater.knownRatings = new Map(period0.ratings as Map<string, IGlickoRating>);
        const period1 = rater.runProcessed([
            makeGameRecord({
                gameid: "g2",
                dateEnd: "2024-02-01T10:00:00Z",
                p1Userid: "alice",
                p2Userid: "carol",
                p1Result: 1,
                p2Result: 0,
            }),
        ]);

        const bob1 = period1.ratings.get("Abstract Play|bob")!;
        expect(bob1.rd).to.be.greaterThan(bobRd0);
        expect(bob1.rating).to.equal(period0.ratings.get("Abstract Play|bob")!.rating);
    });

    it("carries knownRatings across periods like summarize", () => {
        const rater = new Glicko2({ minRounds: 0 });
        const period0 = rater.runProcessed([
            makeGameRecord({
                gameid: "g1",
                dateEnd: "2024-01-01T10:00:00Z",
                p1Userid: "alice",
                p2Userid: "bob",
                p1Result: 1,
                p2Result: 0,
            }),
        ]);

        rater.knownRatings = new Map(period0.ratings as Map<string, IGlickoRating>);
        const period1 = rater.runProcessed([]);

        const bob1 = period1.ratings.get("Abstract Play|bob")!;
        expect(bob1.rd).to.be.greaterThan(period0.ratings.get("Abstract Play|bob")!.rd);
        expect(period1.ratings.size).to.equal(period0.ratings.size);
    });
});
