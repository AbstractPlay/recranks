import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";
import { expect } from "chai";
import schema from "../src/schemas/gamerecord.json" with { type: "json" };
import { makeGameRecord } from "./helpers.js";

type AjvInstance = {
    compile(jsonSchema: object): (data: unknown) => boolean;
};
const ajvCtor = AjvImport as unknown as new (opts?: { allowUnionTypes?: boolean }) => AjvInstance;
const addFormats = addFormatsImport as unknown as (ajv: AjvInstance) => void;

function compileValidator() {
    const ajv = new ajvCtor({ allowUnionTypes: true });
    addFormats(ajv);
    return ajv.compile(schema);
}

describe("gamerecord schema", () => {
    it("accepts optional arena header.site fields", () => {
        const validate = compileValidator();
        const rec = makeGameRecord({ gameid: "table-uuid", unrated: true });
        rec.header.site.playMode = "arena";
        rec.header.site.arenaTcId = "blitz_5_3";
        rec.header.site.arenaClock = { startSec: 300, incSec: 3, maxSec: 300 };

        expect(validate(rec)).to.equal(true);
    });

    it("rejects unknown properties on header.site", () => {
        const validate = compileValidator();
        const rec = makeGameRecord();
        (rec.header.site as Record<string, unknown>).extraField = true;

        expect(validate(rec)).to.equal(false);
    });
});
