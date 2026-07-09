/* tslint:disable:no-unused-expression */

import "mocha";
import { expect } from "chai";
import { Trueskill } from "../../src/raters";
import { makeGameRecord } from "../helpers";

describe("TrueSkill", () => {
    it("applies custom tauStart and drawProbability", () => {
        const defaultRater = new Trueskill({ minRounds: 0 });
        const customRater = new Trueskill({ minRounds: 0, tauStart: 0.5, drawProbability: 0.2 });

        const rec = makeGameRecord({ gameid: "g1", p1Result: 1, p2Result: 0 });
        const defaultResult = defaultRater.runProcessed([rec]);
        const customResult = customRater.runProcessed([rec]);

        const defaultP1 = defaultResult.ratings.get("Abstract Play|user1")!.rating;
        const customP1 = customResult.ratings.get("Abstract Play|user1")!.rating;
        expect(customP1).to.not.equal(defaultP1);
    });

    it("skips self-play with a warning", () => {
        const rater = new Trueskill({ minRounds: 0 });
        const rec = makeGameRecord({ gameid: "g1", p1Userid: "same", p2Userid: "same" });
        const result = rater.runProcessed([rec]);

        expect(result.recsRated).to.equal(0);
        expect(result.warnings).to.have.lengthOf(1);
        expect(result.warnings![0]).to.include("same user ID");
    });

    it("updates mu on win", () => {
        const rater = new Trueskill({ minRounds: 0 });
        const rec = makeGameRecord({ gameid: "g1", p1Result: 1, p2Result: 0 });
        const result = rater.runProcessed([rec]);

        const p1 = result.ratings.get("Abstract Play|user1")!;
        const p2 = result.ratings.get("Abstract Play|user2")!;
        expect(p1.rating).to.be.greaterThan(25);
        expect(p2.rating).to.be.lessThan(25);
        expect(p1.wins).to.equal(1);
        expect(p2.losses).to.equal(1);
    });
});
