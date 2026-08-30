/* eslint-env node */
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
    const { ELOBasic, Glicko2, Trueskill } = await import(
        pathToFileURL(path.join(ROOT, "build", "index.js")).href,
    );
    if (typeof ELOBasic !== "function" || typeof Glicko2 !== "function") {
        throw new Error("build/index.js missing expected raters");
    }
    if (typeof Trueskill !== "function") {
        throw new Error("build/index.js missing Trueskill");
    }
    console.log("smoke-esm-entry: import(build/index.js) OK");
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`smoke-esm-entry: ${message}`);
    process.exit(1);
}
