// Probe support — load the owner's gateway settings from `.env.local` so the
// OP-4 probes can be run bare (`npm run probe:advisor`) instead of with the
// values pasted onto the command line every time.
//
// ---------------------------------------------------------------------------
// WHY THIS IS AN ALLOWLIST AND NOT A DOTENV LOADER
// ---------------------------------------------------------------------------
// `.env.local` on a developer machine also carries `SUPABASE_SERVICE_ROLE_KEY`.
// `CLAUDE.md` §2.3 rule 14 confines that key to the dev seed script, and a
// general-purpose loader would put it into the environment of every probe
// process for no reason at all — the probes never use it, and "it was already
// in the file" is not a purpose.
//
// So this reads the file and exports ONLY names matching `OMNIROUTE_`. Anything
// else in the file is parsed and discarded. Widening the prefix is a deliberate
// act, not a default.
//
// ---------------------------------------------------------------------------
// IT NEVER PRINTS A VALUE
// ---------------------------------------------------------------------------
// Nothing in this module writes a parsed value to stdout, stderr, a file, or an
// exception message. `summarise()` reports NAMES and their SOURCE only, because
// the one thing an operator needs to see is which settings were found and where
// they came from — never what they are. Ruling 3: no secret enters the
// repository, and by extension no secret enters a pasted probe transcript.
//
// `.env.local` itself is ignored by `.gitignore:27` (`.env*.local`), verified
// with `git check-ignore` before this file was written.

import fs from "node:fs";
import path from "node:path";

/** Only these reach `process.env`. See the header — this is the rule 14 fence. */
const ALLOWED_PREFIX = "OMNIROUTE_";

export interface LoadedEnv {
  /** Names taken from the file. NEVER their values. */
  fromFile: string[];
  /** Names already present in the shell, which the file did not override. */
  fromShell: string[];
  /** Absolute path read, or null when there was no file. */
  file: string | null;
}

/**
 * Parse `KEY=value` lines. PURE — takes text, returns pairs, touches nothing.
 *
 * Deliberately small: comments, blank lines, an optional `export ` prefix, and
 * one layer of matching quotes. It is not a shell parser and does not try to be
 * — a probe helper that silently mis-parses an operator's key would waste a
 * live call and produce a confusing 401.
 */
export function parseEnvFile(text: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) continue;

    const withoutExport = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eq = withoutExport.indexOf("=");
    if (eq <= 0) continue;

    const key = withoutExport.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    let value = withoutExport.slice(eq + 1).trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length >= 2) {
      value = value.slice(1, -1);
    }
    out.push([key, value]);
  }
  return out;
}

/**
 * Read `.env.local` from the repository root and export the allowlisted names.
 *
 * An existing shell value WINS. `OMNIROUTE_BASE_URL=… npm run probe:advisor`
 * must keep working, and must keep meaning what it says: a one-off override
 * that a stale file cannot silently defeat.
 *
 * A missing file is not an error — the probe's own pre-flight already reports
 * unset settings with instructions, and that is the better place for it.
 */
export function loadProbeEnv(repoRoot = process.cwd()): LoadedEnv {
  const file = path.join(repoRoot, ".env.local");
  if (!fs.existsSync(file)) return { fromFile: [], fromShell: [], file: null };

  const fromFile: string[] = [];
  const fromShell: string[] = [];

  for (const [key, value] of parseEnvFile(fs.readFileSync(file, "utf8"))) {
    if (!key.startsWith(ALLOWED_PREFIX)) continue; // rule 14 fence
    if (process.env[key] !== undefined && process.env[key] !== "") {
      fromShell.push(key);
      continue;
    }
    process.env[key] = value;
    fromFile.push(key);
  }

  return { fromFile: fromFile.sort(), fromShell: fromShell.sort(), file };
}

/** A one-line report of NAMES and SOURCES. Contains no value, by construction. */
export function summarise(loaded: LoadedEnv): string {
  if (loaded.file === null) {
    return "env: no .env.local found — using the shell environment only";
  }
  const parts: string[] = [];
  if (loaded.fromFile.length > 0) parts.push(`.env.local → ${loaded.fromFile.join(", ")}`);
  if (loaded.fromShell.length > 0) parts.push(`shell (kept) → ${loaded.fromShell.join(", ")}`);
  if (parts.length === 0) parts.push(`.env.local read, no ${ALLOWED_PREFIX}* settings in it`);
  return `env: ${parts.join("  |  ")}`;
}
