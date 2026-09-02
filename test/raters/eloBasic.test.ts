/* tslint:disable:no-unused-expression */

import "mocha";
import { expect } from "chai";
import { ELOBasic } from "../../src/raters";
import { makeGameRecord } from "../helpers";

describe("ELO Basic", () => {
    it("instantiates with default settings", () => {
        const rater = new ELOBasic();
        expect(rater).to.not.be.undefined;
    });

    it("updates ratings for a win (K=30, equal start)", () => {
        const rater = new ELOBasic({ minRounds: 0 });
        const rec = makeGameRecord({ gameid: "g1", p1Result: 1, p2Result: 0 });
        const result = rater.runProcessed([rec]);

        expect(result.recsRated).to.equal(1);
        const p1 = result.ratings.get("Abstract Play|user1")!;
        const p2 = result.ratings.get("Abstract Play|user2")!;
        expect(p1.rating).to.be.closeTo(1215, 0.01);
        expect(p2.rating).to.be.closeTo(1185, 0.01);
        expect(p1.wins).to.equal(1);
        expect(p2.losses).to.equal(1);
    });

    it("leaves ratings unchanged for a draw between equal players", () => {
        const rater = new ELOBasic({ minRounds: 0 });
        const rec = makeGameRecord({ gameid: "g1", p1Result: 2, p2Result: 2 });
        const result = rater.runProcessed([rec]);

        const p1 = result.ratings.get("Abstract Play|user1")!;
        const p2 = result.ratings.get("Abstract Play|user2")!;
        expect(p1.rating).to.equal(1200);
        expect(p2.rating).to.equal(1200);
        expect(p1.draws).to.equal(1);
        expect(p2.draws).to.equal(1);
    });

    it("skips self-play with a warning", () => {
        const rater = new ELOBasic({ minRounds: 0 });
        const rec = makeGameRecord({ gameid: "g1", p1Userid: "same", p2Userid: "same" });
        const result = rater.runProcessed([rec]);

        expect(result.recsRated).to.equal(0);
        expect(result.warnings).to.have.lengthOf(1);
        expect(result.warnings![0]).to.include("same user ID");
    });

    it("leaves ratings unchanged for a draw when both players have result 1", () => {
        const rater = new ELOBasic({ minRounds: 0 });
        const rec = makeGameRecord({ gameid: "g1", p1Result: 1, p2Result: 1 });
        const result = rater.runProcessed([rec]);

        expect(result.recsRated).to.equal(1);
        const p1 = result.ratings.get("Abstract Play|user1")!;
        const p2 = result.ratings.get("Abstract Play|user2")!;
        expect(p1.rating).to.equal(1200);
        expect(p2.rating).to.equal(1200);
        expect(p1.draws).to.equal(1);
        expect(p2.draws).to.equal(1);
    });

    it("leaves ratings unchanged for a draw when both players have result 0", () => {
        const rater = new ELOBasic({ minRounds: 0 });
        const rec = makeGameRecord({ gameid: "g1", p1Result: 0, p2Result: 0 });
        const result = rater.runProcessed([rec]);

        expect(result.recsRated).to.equal(1);
        const p1 = result.ratings.get("Abstract Play|user1")!;
        const p2 = result.ratings.get("Abstract Play|user2")!;
        expect(p1.rating).to.equal(1200);
        expect(p2.rating).to.equal(1200);
        expect(p1.draws).to.equal(1);
        expect(p2.draws).to.equal(1);
    });

    it("skips records with too few rounds", () => {
        const rater = new ELOBasic({ minRounds: 5 });
        const rec = makeGameRecord({ gameid: "g1", rounds: 2 });
        const result = rater.runProcessed([rec]);

        expect(result.recsRated).to.equal(0);
        expect(result.warnings).to.have.lengthOf(1);
        expect(result.warnings![0]).to.include("fewer than 5 rounds");
    });

    it("rejects negative minRounds", () => {
        expect(() => new ELOBasic({ minRounds: -1 })).to.throw("minRounds must be >= 0");
    });

    it("skips solo records without errors", () => {
        const rater = new ELOBasic({ minRounds: 0 });
        const rec = makeGameRecord({ gameid: "solo-1" });
        rec.header.players = [{
            name: "Solo",
            userid: "solo-user",
            result: 73,
            score: 73,
        }];
        const result = rater.runProcessed([rec]);

        expect(result.recsRated).to.equal(0);
        expect(result.errors ?? []).to.have.lengthOf(0);
    });
});
