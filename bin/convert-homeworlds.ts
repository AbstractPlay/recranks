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
let f = readFileSync("bin/homeworlds.raw", "utf-8");

// Normalize newlines
f = f.replace(/\r/g, "");

// Strip the chat logs by deleting all lines that start with whitespace
let linesAll = f.split(/\n/);
linesAll = linesAll.filter(l => (! l.match(/^\s+/)));
linesAll = linesAll.filter(l => (! l.match(/^\s*$/)));

// Break the records up
const recs = linesAll.join("\n").split(/\n(?=Homeworlds Online)/m);
console.log(recs.length);

// Process each game

interface IGameData {
    header: Map<string, any>;
    moves: IMove[][];
}

interface IPlayer {
    name: string;
    seat: string,
    sequence: number;
    system: string;
}

interface IMove {
    sequence: number;
    move: string;
}

// function player2seat(player: number, numplayers: number): string {
//     switch(numplayers) {
//         case 2:
//             return ["N", "S"][player - 1];
//         case 3:
//             return ["N", "E", "S"][player - 1];
//         case 4:
//             return ["N", "E", "S", "W"][player - 1];
//         default:
//             throw new Error("Could not translate player number to seat. This should never happen.");
//     }
// }

function seat2player(seat: string, numplayers: number): number {
    switch(numplayers) {
        case 2:
            if (seat === "N") { return 1; }
            else if (seat === "S") { return 2;}
            else { throw new Error(); }
        case 3:
            if (seat === "N") { return 1; }
            else if (seat === "E") { return 2;}
            else if (seat === "S") { return 3;}
            else { throw new Error(); }
        case 4:
            if (seat === "N") { return 1; }
            else if (seat === "E") { return 2;}
            else if (seat === "S") { return 3;}
            else if (seat === "W") { return 4;}
            else { throw new Error(); }
        default:
            throw new Error("Could not translate seat to player. This should never happen.");
    }
}

function seat2name(seat: string): string {
    switch (seat) {
        case "N":
            return "North";
        case "E":
            return "East";
        case "S":
            return "South";
        case "W":
            return "W";
        default:
            throw new Error("Could not translate the seat into a system name. This should never happen.");
    }
}

const gamesData: IGameData[] = [];
for (const rec of recs) {
    const node: IGameData = { header: new Map<string, any>(), moves: [[]]};
    const lines = rec.split("\n");
    let idx: number | undefined;
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const rGameID = /^Homeworlds Online \(SDG# (\d+)\)$/;
        const rDates = /^Started: (\d{4}\.\d{1,2}\.\d{1,2}), Ended: (\d{4}\.\d{1,2}\.\d{1,2})$/;
        const rVariants = /^Variants: "(.*?)"$/;
        const rPlayers = /^Participants: (.*)$/;
        const rWinner = /^Winner: (.*)$/;
        const rMove = /^\d+\) (\S.*)$/;

        if (l.match(rGameID)) {
            const m = l.match(rGameID);
            node.header.set("gameid", m![1])
        } else if (l.match(rDates)) {
            const m = l.match(rDates);
            const start = m![1].split(".").map(x => parseInt(x, 10));
            start[1] -= 1;
            node.header.set("dateStart", start);
            // console.log(node.header.get("dateStart"));
            const end = m![2].split(".").map(x => parseInt(x, 10));
            end[1] -= 1;
            node.header.set("dateEnd", end);
            // console.log(node.header.get("dateEnd"));
        } else if (l.match(rVariants)) {
            const m = l.match(rVariants);
            if (m![1].includes("Unrated")) {
                node.header.set("unrated", true);
            }
        } else if (l.match(rPlayers)) {
            const m = l.match(rPlayers);
            // tslint:disable-next-line: no-shadowed-variable
            const players = m![1].split(", ");
            const pObjs: IPlayer[] = [];
            for (const p of players) {
                if (! p.match(/^(\S+) \(([NESW])\)$/)) {
                    throw new Error();
                }
                const match = p.match(/^(\S+) \(([NESW])\)$/);
                pObjs.push({
                    name: match![1],
                    seat: match![2],
                    sequence: seat2player(match![2], players.length),
                    system: seat2name(match![2])
                });
            }
            node.header.set("players", pObjs);
        } else if (l.match(rWinner)) {
            const m = l.match(rWinner);
            const winner = m![1];
            // tslint:disable-next-line: no-shadowed-variable
            const players = node.header.get("players") as IPlayer[];
            if (players === undefined) {
                throw new Error();
            }
            const pObj = players.find(p => p.name === winner);
            if (pObj === undefined) {
                throw new Error();
            }
            node.header.set("winner", pObj.sequence);
        } else if (l.match(rMove)) {
            idx = i;
            break;
        } else {
            throw new Error(`Invalid state in record ${i + 1}`);
        }
    }
    // Confirm header is complete
    if ( (! node.header.has("gameid")) || (! node.header.has("dateStart")) || (! node.header.has("dateEnd")) || (! node.header.has("players")) || (! node.header.has("winner")) ) {
        throw new Error(`Malformed header:\n${rec}`);
    }
    // If a first move was not found, but all the header is there, skip this record
    if (idx === undefined) {
        continue;
    }
    // Now process the move list
    const players: IPlayer[] = node.header.get("players");
    if (players === undefined) { throw new Error(); }
    let movestr: string = lines.slice(idx).join(", ");
    movestr = movestr.replace(/,(?= \d+\))/g, "");
    movestr = movestr.replace(/:,/g, ":");
    const moves = movestr.split(/\s*?\d+\)\s+/g);
    let lastseq: number | undefined;
    let movenode: IMove[] = [];
    const playerRegs: [RegExp, string][] = [];
    for (const p of players) {
        playerRegs.push([new RegExp(" " + p.name + "(,?)", "gi"), " " + seat2name(p.seat) + "$1"]);
    }
    for (const move of moves) {
        if (move === "") {
            continue;
        }
        const m = move.match(/^(\S+):\s+(.+)$/);
        if (m === null) {
            throw new Error(`Invalid move found: ${move}\n${rec}`);
        }
        const name = m[1];
        let fullmove = m[2];
        const player = players.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (player === undefined) {
            console.log(rec);
            throw new Error(`Could not find player ${name}`);
        }
        // Replace home system names with cardinal direction instead
        for (const r of playerRegs) {
            fullmove = fullmove.replace(r[0], r[1]);
        }
        if ( (lastseq !== undefined) && (player.sequence < lastseq) ) {
            node.moves.push(movenode);
            movenode = [];
        }
        lastseq = player.sequence;
        movenode.push({sequence: player.sequence, move: fullmove});
    }
    if (node.moves.length > 0) {
        node.moves = node.moves.slice(1);
    }
    gamesData.push(node);
}

const gameObjs: APGameRecord[] = [];
for (const rec of gamesData) {
    const gameid = rec.header.get("gameid")!;
    let unrated = false;
    const hVariants = rec.header.get("unrated");
    if ( (hVariants!== undefined) && (hVariants === true) ) {
        unrated = true;
    }
    const playerObjs = [];
    const players: IPlayer[] = rec.header.get("players");
    const winner: number = rec.header.get("winner");
    for (const p of players!.sort((a, b) => a.sequence - b.sequence)) {
        let result = 0;
        if (winner === p.sequence) {
            result = 1;
        }
        playerObjs.push({
            name: p.name,
            userid: p.name,
            is_ai: false,
            result
        });
    }

    const obj: APGameRecord = {
        header: {
            game: {
                name: "Homeworlds"
            },
            site: {
                name: "Super Duper Games",
                gameid
            },
            // @ts-ignore
            players: playerObjs,
            unrated,
            "date-start": new Date(...rec.header.get("dateStart")! as [number, number, number], 0, 0, 0, 0).toISOString(),
            "date-end": new Date(...rec.header.get("dateEnd")! as [number, number, number], 0, 0, 0, 0).toISOString(),
            "date-generated": new Date().toISOString()
        },
        moves: rec.moves
    };
        // moves: rec.moves.map((round) => { return round.map((m) => { return {move: m}; }); })

    gameObjs.push(obj);
}

console.log(gameObjs.length);
writeFileSync("bin/homeworlds.json", JSON.stringify(gameObjs));
