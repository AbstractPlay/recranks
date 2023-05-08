/* tslint:disable:no-unused-expression */

import "mocha";
import { expect } from "chai";
import { ELOBasic } from '../../src/raters';

describe("ELO Basic", () => {
    it ("Basic settings", () => {
        expect(true).to.be.true;
        const rater = new ELOBasic();
        expect(rater).to.not.be.undefined;
    });
});
