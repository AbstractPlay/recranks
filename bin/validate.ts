// tslint:disable: no-console
import { GameFactory, gameinfo, APGamesInformation, GameBase } from "@abstractplay/gameslib";
import { readFileSync } from "fs";
import { APGameRecord } from "../src";

interface IInvalid {
    recid: string;
    round: any[];
    move: any;
    message: string;
}

const gameid = process.argv[2];
if (gameid === undefined) {
    throw new Error("You must provide a game uid.");
}
const f = readFileSync(`bin/${gameid}.json`, "utf-8");
const recs = JSON.parse(f) as APGameRecord[];
const ginfo: APGamesInformation = gameinfo.get(gameid) as APGamesInformation;
if (ginfo === undefined) {
    throw new Error("Could not load game info");
}
console.log(ginfo);

const invalid: IInvalid[] = [];
for (const rec of recs) {
    let isInvalid = false;
    if ( (rec.moves.length === 1) && (rec.moves[0][0] === "") ) {
        console.log(`Skipping empty game ${rec.header.site.gameid}`);
        continue;
    }
    if ( (gameid === "blam") && (rec.header.game.variants !== undefined) && (rec.header.game.variants.length > 0) ) {
        console.log("Skipping 'Blam!: Overloaded' game");
        continue;
    }
    if ( (gameid === "mchess") && (rec.header.game.variants !== undefined) && (rec.header.game.variants.length > 0) ) {
        console.log("Skipping 'Martian Chess: Of Knights and Kings' game");
        continue;
    }

    let g: GameBase | undefined;
    if (ginfo.playercounts.length > 1) {
        g = GameFactory(gameid, rec.header.players.length);
    } else {
        g = GameFactory(gameid);
    }
    if (g === undefined) {
        throw new Error("Could not instantiate game");
    }
    for (const round of rec.moves) {
        for (const move of round) {
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
                    message: `${err}`
                });
                isInvalid = true;
            }
            if (isInvalid) { break; }
        }
        if (isInvalid) { break; }
    }
}
if (invalid.length > 0) {
    console.log(`Some invalid records were found: ${invalid.length}`);
    console.log(invalid);
} else {
    console.log("It appears that all games validated.");
}



