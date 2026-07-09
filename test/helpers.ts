import { APGameRecord } from "../src/schemas/gamerecord";

export interface ITestGameOptions {
    gameid?: string | number;
    dateEnd?: string;
    p1Userid?: string;
    p2Userid?: string;
    p1Result?: number;
    p2Result?: number;
    rounds?: number;
    unrated?: boolean;
}

export function makeGameRecord(opts: ITestGameOptions = {}): APGameRecord {
    const rounds = opts.rounds ?? 3;
    const moves: APGameRecord["moves"] = [];
    for (let i = 0; i < rounds; i++) {
        moves.push(["e4", "e5"]);
    }

    return {
        header: {
            game: { name: "Test Game" },
            site: {
                name: "Abstract Play",
                gameid: opts.gameid ?? `game-${Math.random().toString(36).slice(2, 9)}`,
            },
            "date-start": "2024-01-01T12:00:00Z",
            "date-end": opts.dateEnd ?? "2024-01-01T13:00:00Z",
            "date-generated": "2024-01-01T13:00:00Z",
            players: [
                {
                    name: "Player One",
                    userid: opts.p1Userid ?? "user1",
                    result: opts.p1Result ?? 1,
                },
                {
                    name: "Player Two",
                    userid: opts.p2Userid ?? "user2",
                    result: opts.p2Result ?? 0,
                },
            ],
            unrated: opts.unrated,
        },
        moves,
    };
}
