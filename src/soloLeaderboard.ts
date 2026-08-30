import type { APGameRecord } from "./schemas/gamerecord.js";
import { soloHeader, type ScoreDirection, type ISoloRecordPlayer } from "./soloValidate.js";

export interface ISoloLeaderboardRow {
    userid: string;
    name: string;
    score: number;
    grade?: string;
    passed?: boolean;
    dateEnd: string;
    attempts: number;
}

export const soloLeaderboardBucket = (rec: APGameRecord): string => {
    const variants = (rec.header.game.variants ?? []).join("|");
    const seed = soloHeader(rec)["challenge-seed"] ?? "";
    return [rec.header.game.name, variants, seed].join("\t");
};

const scoreDirection = (rec: APGameRecord): ScoreDirection => {
    return soloHeader(rec)["score-direction"] ?? "higher";
};

const playerScore = (rec: APGameRecord): number => {
    const player = rec.header.players[0] as ISoloRecordPlayer;
    return player.score ?? player.result ?? 0;
};

/** True when `candidate` ranks better than `incumbent` for this bucket's score direction. */
export const soloAttemptIsBetter = (candidate: APGameRecord, incumbent: APGameRecord): boolean => {
    const dir = scoreDirection(candidate);
    const next = playerScore(candidate);
    const prev = playerScore(incumbent);
    if (dir === "higher") {
        if (next !== prev) {
            return next > prev;
        }
    } else if (next !== prev) {
        return next < prev;
    }
    return candidate.header["date-end"] < incumbent.header["date-end"];
};

/**
 * Group solo records by game + variant + challenge-seed; keep best attempt per userid.
 * Returns rows sorted best-first within each bucket.
 */
export const buildSoloLeaderboards = (
    records: APGameRecord[],
): Map<string, ISoloLeaderboardRow[]> => {
    const buckets = new Map<string, Map<string, { best: APGameRecord; attempts: number }>>();

    for (const rec of records) {
        if (rec.header.players.length !== 1) {
            continue;
        }
        const player = rec.header.players[0];
        if (player.userid === undefined || player.userid === "") {
            continue;
        }

        const bucketKey = soloLeaderboardBucket(rec);
        let byUser = buckets.get(bucketKey);
        if (byUser === undefined) {
            byUser = new Map();
            buckets.set(bucketKey, byUser);
        }

        const existing = byUser.get(player.userid);
        if (existing === undefined) {
            byUser.set(player.userid, { best: rec, attempts: 1 });
        } else {
            existing.attempts += 1;
            if (soloAttemptIsBetter(rec, existing.best)) {
                existing.best = rec;
            }
        }
    }

    const result = new Map<string, ISoloLeaderboardRow[]>();
    for (const [bucketKey, byUser] of buckets) {
        const rows: ISoloLeaderboardRow[] = [];
        for (const [userid, entry] of byUser) {
            const player = entry.best.header.players[0] as ISoloRecordPlayer & (typeof entry.best.header.players)[0];
            rows.push({
                userid,
                name: player.name,
                score: playerScore(entry.best),
                grade: player.grade,
                passed: player.passed,
                dateEnd: entry.best.header["date-end"],
                attempts: entry.attempts,
            });
        }
        const sample = [...byUser.values()][0]?.best;
        const dir = sample !== undefined ? scoreDirection(sample) : "higher";
        rows.sort((a, b) => {
            if (dir === "higher") {
                if (a.score !== b.score) {
                    return b.score - a.score;
                }
            } else if (a.score !== b.score) {
                return a.score - b.score;
            }
            return a.dateEnd.localeCompare(b.dateEnd);
        });
        result.set(bucketKey, rows);
    }

    return result;
};

export const soloLeaderboardToCsv = (boards: Map<string, ISoloLeaderboardRow[]>): string => {
    const lines = ["bucket,userid,name,score,grade,passed,date-end,attempts"];
    for (const [bucket, rows] of boards) {
        const escapedBucket = bucket.replace(/"/g, "\"\"");
        for (const row of rows) {
            lines.push([
                `"${escapedBucket}"`,
                row.userid,
                `"${row.name.replace(/"/g, "\"\"")}"`,
                row.score,
                row.grade ?? "",
                row.passed === undefined ? "" : row.passed ? "true" : "false",
                row.dateEnd,
                row.attempts,
            ].join(","));
        }
    }
    return lines.join("\n");
};
