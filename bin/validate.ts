// tslint:disable: no-console
import { GameFactory, gameinfo, APGamesInformation, GameBase } from "@abstractplay/gameslib";
import { readFileSync } from "fs";
import { APGameRecord } from "../src";
import { movesInReplayOrder } from "../src/turnModel";
import {
    collectSoloOutcomeErrors,
    isSeededSoloRecord,
    isSoloRecord,
    validateSeededSoloReplay,
} from "../src/soloValidate";
import { buildSoloLeaderboards, soloLeaderboardToCsv } from "../src/soloLeaderboard";

interface IInvalid {
    recid: string;
    round: unknown;
    move: unknown;
    message: string;
}

function loadRecords(path: string): APGameRecord[] {
    const f = readFileSync(path, "utf-8");
    const parsed = JSON.parse(f);
    return Array.isArray(parsed) ? parsed as APGameRecord[] : [parsed as APGameRecord];
}

function createSeededSoloGame(gameid: string, seed: string, variants: string[]): GameBase {
    const ginfo = gameinfo.get(gameid) as APGamesInformation | undefined;
    if (ginfo === undefined) {
        throw new Error(`Unknown game uid: ${gameid}`);
    }

    let g: GameBase | undefined;
    if (ginfo.playercounts.length === 1 && ginfo.playercounts[0] === 1) {
        g = GameFactory(gameid);
    } else {
        g = GameFactory(gameid, 1);
    }
    if (g === undefined) {
        throw new Error(`Could not instantiate game ${gameid}`);
    }

    if (variants.length > 0 && "variants" in g) {
        g.variants = [...variants];
    }

    if (typeof g.initRng !== "function") {
        throw new Error(`Game ${gameid} does not support seeded solo replay (initRng missing)`);
    }
    g.initRng(seed);
    return g;
}

function validateRecord(gameid: string, rec: APGameRecord): IInvalid[] {
    const invalid: IInvalid[] = [];
    const recid = `${rec.header.site.name}|${rec.header.site.gameid}`;

    if ((rec.moves.length === 1) && (rec.moves[0][0] === "")) {
        console.log(`Skipping empty game ${rec.header.site.gameid}`);
        return invalid;
    }
    if ((gameid === "blam") && (rec.header.game.variants !== undefined) && (rec.header.game.variants.length > 0)) {
        console.log("Skipping 'Blam!: Overloaded' game");
        return invalid;
    }
    if ((gameid === "mchess") && (rec.header.game.variants !== undefined) && (rec.header.game.variants.length > 0)) {
        console.log("Skipping 'Martian Chess: Of Knights and Kings' game");
        return invalid;
    }

    if (isSeededSoloRecord(rec)) {
        const replayErrors = validateSeededSoloReplay(
            rec,
            (seed, variants) => createSeededSoloGame(gameid, seed, variants),
            movesInReplayOrder,
        );
        for (const message of replayErrors) {
            invalid.push({ recid, round: [], move: null, message });
        }
        return invalid;
    }

    const ginfo: APGamesInformation = gameinfo.get(gameid) as APGamesInformation;
    let g: GameBase | undefined;
    if (ginfo.playercounts.length > 1) {
        g = GameFactory(gameid, rec.header.players.length);
    } else {
        g = GameFactory(gameid);
    }
    if (g === undefined) {
        throw new Error("Could not instantiate game");
    }

    let isInvalid = false;
    for (const round of rec.moves) {
        const ordered = movesInReplayOrder(round, rec);
        for (const move of ordered) {
            try {
                if (move === null) {
                    continue;
                }
                if (typeof move === "string") {
                    g.move(move);
                } else {
                    g.move(move.move);
                }
            } catch (err) {
                invalid.push({
                    recid: rec.header.site.gameid as string,
                    round,
                    move,
                    message: `${err}`,
                });
                isInvalid = true;
            }
            if (isInvalid) { break; }
        }
        if (isInvalid) { break; }
    }

    if (!isInvalid && isSoloRecord(rec) && rec.header["outcome-type"] !== undefined) {
        for (const message of collectSoloOutcomeErrors(rec, g)) {
            invalid.push({ recid, round: [], move: null, message });
        }
    }

    return invalid;
}

const args = process.argv.slice(2);
if (args[0] === "--solo-leaderboard") {
    const path = args[1];
    if (path === undefined) {
        throw new Error("Usage: validate.ts --solo-leaderboard <records.json>");
    }
    const boards = buildSoloLeaderboards(loadRecords(path));
    console.log(soloLeaderboardToCsv(boards));
    process.exit(0);
}

const gameid = args[0];
if (gameid === undefined) {
    throw new Error("Usage: validate.ts <game-uid>  |  validate.ts --solo-leaderboard <records.json>");
}
const filePath = args[1] ?? `bin/${gameid}.json`;
const recs = loadRecords(filePath);
const ginfo: APGamesInformation = gameinfo.get(gameid) as APGamesInformation;
if (ginfo === undefined) {
    throw new Error("Could not load game info");
}
console.log(ginfo);

const invalid: IInvalid[] = [];
for (const rec of recs) {
    invalid.push(...validateRecord(gameid, rec));
}

if (invalid.length > 0) {
    console.log(`Some invalid records were found: ${invalid.length}`);
    console.log(invalid);
} else {
    console.log("It appears that all games validated.");
}
