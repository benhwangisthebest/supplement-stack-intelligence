// Phase 3 U1 — the SEED_* emitter. The ONLY source of layout for the nine
// generated modules under src/data/ (owner ruling 2026-09-23, U1 landing (a)).
//
// Layout rule. Deterministic, width-free, and dependent on nothing but the
// value itself — there is no formatter and no line-length heuristic, because a
// width rule is exactly what the hand-authored layout could not be reduced to.
//
//   L1  file   = preamble (verbatim) + `export const NAME: TYPE[] = ` + value + ";\n"
//   L2  indent = two spaces per nesting level
//   L3  array  = `[]` when empty; ONE line `[a, b]` when every element is a
//                primitive; otherwise one element per line, each followed by ","
//   L4  object = `{}` when empty; otherwise one `key: value,` per line, in the
//                value's own key order (never sorted)
//   L5  key    = bare when a valid identifier, else a JSON string
//   L6  string = JSON.stringify (double quotes, JSON escapes); number = finite
//                only, written by String(); boolean and null as literals
//   L7  nothing else is representable — undefined, functions, Dates, NaN,
//                Infinity, -0, symbols and bigints throw rather than degrade
//
// No comments and no blank lines are emitted inside the value. Editorial notes
// that used to live between array elements live in content/notes.json, a
// sidecar that is never emitted (FU-49, decided by U2 on 2026-09-23).

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const INDENT = "  ";

function isPrimitive(value) {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function formatPrimitive(value, path) {
  if (value === null || typeof value === "boolean") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (!Number.isFinite(value) || Object.is(value, -0)) {
    throw new Error(`emit: non-representable number ${String(value)} at ${path}`);
  }
  return String(value);
}

function formatKey(key) {
  return IDENTIFIER.test(key) ? key : JSON.stringify(key);
}

function formatValue(value, depth, path) {
  if (isPrimitive(value)) return formatPrimitive(value, path);

  const pad = INDENT.repeat(depth + 1);
  const close = INDENT.repeat(depth);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.every(isPrimitive)) {
      return `[${value.map((v, i) => formatPrimitive(v, `${path}[${i}]`)).join(", ")}]`;
    }
    const lines = value.map((v, i) => `${pad}${formatValue(v, depth + 1, `${path}[${i}]`)},\n`);
    return `[\n${lines.join("")}${close}]`;
  }

  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const keys = Object.keys(value);
    if (keys.length === 0) return "{}";
    const lines = keys.map((k) => {
      if (value[k] === undefined) throw new Error(`emit: undefined at ${path}.${k}`);
      return `${pad}${formatKey(k)}: ${formatValue(value[k], depth + 1, `${path}.${k}`)},\n`;
    });
    return `{\n${lines.join("")}${close}}`;
  }

  throw new Error(`emit: non-representable ${Object.prototype.toString.call(value)} at ${path}`);
}

/**
 * Emit one SEED_* module.
 * @param {{ preamble: string, exportName: string, typeName: string }} spec
 * @param {unknown[]} value
 * @returns {string} the complete file contents
 */
export function emitModule(spec, value) {
  if (!Array.isArray(value)) throw new Error(`emit: ${spec.exportName} is not an array`);
  return `${spec.preamble}export const ${spec.exportName}: ${spec.typeName}[] = ${formatValue(value, 0, spec.exportName)};\n`;
}
