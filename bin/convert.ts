// tslint:disable: no-console

/*
 * Preparatory instructions:
 *   - Delete any leading empty lines.
 *   - Delete the last chat log and result marker.
 *   - "Round" may need to be normalized (putting quotes around the number)
 */

import { readFileSync, writeFileSync } from "fs";
import { APGameRecord } from "../src/schemas/gamerecord"

// Load entire file
let f = readFileSync("bin/mchess.raw", "utf-8");

// Normalize newlines
f = f.replace(/\r/g, "");

// Strip the chat logs
const rChatWin = /1-0\n[\s\S]*?(?=\[Event)/gm;
const rChatLoss = /0-1\n[\s\S]*?(?=\[Event)/gm;
const rChatDraw = /1\/2-1\/2\n[\s\S]*?(?=\[Event)/gm;
f = f.replace(rChatWin, "\n");
f = f.replace(rChatLoss, "\n");
f = f.replace(rChatDraw, "\n");

// Break the records up
const recs = f.split(/\n(?=\[Event)/m);

// Process each game

interface IGameData {
    header: Map<string, string>;
    moves: string[][];
}

const gamesData: IGameData[] = [];
const rHeader = /^\[(\S+) \"(.*?)\"\]$/
for (let i = 0; i < recs.length; i++) {
    // Break header from move list
    const parts = recs[i].split("\n\n");
    if (parts.length !== 2) {
        console.log(recs[i]);
        throw new Error(`Record ${i} appears to be malformed.`);
    }

    // Process the header
    const header: Map<string, string> = new Map();
    for (const l of parts[0].split("\n")) {
        const m = l.match(rHeader);
        if (m === null) {
            throw new Error(`Malformed header: ${l}.`);
        }
        header.set(m[1], m[2]);
    }

    // Process the move list
    let moveStr = parts[1];
    // strip newlines
    moveStr = moveStr.replace(/\n/g, " ");
    // strip trailing space
    moveStr = moveStr.replace(/\s+$/, "");
    // strip the first move number
    moveStr = moveStr.slice(3);

    const rounds = moveStr.split(/\s+\d+\.\s+/);
    const isolated = rounds.map((x) => {return x.split(/\s+/)});
    gamesData.push({header, moves: isolated});
}

const gameObjs: APGameRecord[] = [];
for (const rec of gamesData) {
    const hGameId = rec.header.get("SDGID")!;
    if (hGameId === undefined) {
        console.log(rec);
        throw new Error("Missing SDGID");
    }
    const sdgid = hGameId.split(" ");
    const id = sdgid.pop();
    const name = sdgid.join(" ");
    let unrated = false;
    const hVariants = rec.header.get("Variants");
    let varlist: string[] = [];
    if (hVariants !== undefined) {
        if (hVariants.toLowerCase().includes("unrated")) {
            unrated = true;
        }
        varlist = hVariants.split(", ").filter(x => (x !== "No undo") && (x !== "Unrated") && (x !== "Hard time"));
    }
    if ( (hVariants!== undefined) && (hVariants.toLowerCase().includes("unrated")) ) {
        unrated = true;
    }
    const p1Name = rec.header.get("Red")!;    // Black for Cannon, Red for everything else
    const p2Name = rec.header.get("Blue")!;      // Red for Cannon, Blue for everything else
    const result = rec.header.get("Result")!;
    let p1ai = false;
    let p2ai = false;
    if (p1Name === "AI_by_unic") {
        p1ai = true;
    }
    if (p2Name === "AI_by_unic") {
        p2ai = true;
    }
    let p1Result: number;
    let p2Result: number;
    if (result === "1-0") {
        p1Result = 1;
        p2Result = 0;
    } else if (result === "0-1") {
        p1Result = 0;
        p2Result = 1;
    } else {
        p1Result = 0.5;
        p2Result = 0.5;
    }

    const startdate: [number, number, number] = rec.header.get("Date")!.split(".").map((x) => {return parseInt(x, 10);}) as [number, number, number];
    startdate[1] -= 1;
    const enddate: [number, number, number] = rec.header.get("DateEnded")!.split(".").map((x) => {return parseInt(x, 10);}) as [number, number, number];
    enddate[1] -= 1;
    const obj: APGameRecord = {
        header: {
            game: {
                name
            },
            site: {
                name: "Super Duper Games",
                gameid: id
            },
            players: [
                {
                    name: p1Name,
                    userid: p1Name,
                    is_ai: p1ai,
                    result: p1Result
                },
                {
                    name: p2Name,
                    userid: p2Name,
                    is_ai: p2ai,
                    result: p2Result
                }
            ],
            unrated,
            "date-start": new Date(...startdate, 0, 0, 0, 0).toISOString(),
            "date-end": new Date(...enddate, 0, 0, 0, 0).toISOString(),
            "date-generated": new Date().toISOString()
        },
        moves: rec.moves
    };
        // moves: rec.moves.map((round) => { return round.map((m) => { return {move: m}; }); })

    // Add variants
    if (varlist.length > 0) {
        obj.header.game.variants = [...varlist];
    }

    // Add event
    const hEvent = rec.header.get("Event")!;
    if ( (hEvent !== "SDG Match") && (! hEvent.startsWith("Ladder")) ) {
        obj.header.event = hEvent;
        obj.header.round = rec.header.get("Round")!
    }

    gameObjs.push(obj);
}

console.log(gameObjs.length);
writeFileSync("bin/mchess.json", JSON.stringify(gameObjs));
