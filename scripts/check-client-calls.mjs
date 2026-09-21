// A server module must never CALL a function exported from a "use client"
// module: React refuses it at runtime ("Attempted to call X() from the
// server"), and the build does not catch it. This walks the tree and fails
// on any such call. Types and JSX rendering are fine and are ignored.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["app", "components", "lib"];
const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(name)) files.push(p);
  }
}
for (const r of roots) walk(r);

const isClient = (s) => /^\s*(["'])use client\1/.test(s);
const clientExports = new Map();
for (const f of files) {
  const s = readFileSync(f, "utf8");
  if (!isClient(s)) continue;
  const names = [...s.matchAll(/^export (?:const|function|async function) ([a-z]\w*)/gm)].map((m) => m[1]);
  if (names.length) clientExports.set(f.replace(/\.tsx?$/, ""), new Set(names));
}

const problems = [];
for (const f of files) {
  const s = readFileSync(f, "utf8");
  if (isClient(s)) continue;
  for (const m of s.matchAll(/import \{([^}]*)\} from "@\/([^"]+)";/g)) {
    const names = clientExports.get(m[2]);
    if (!names) continue;
    for (const raw of m[1].split(",")) {
      const item = raw.trim();
      if (!item || item.startsWith("type ")) continue;
      const name = item.split(/\s+as\s+/)[0].trim();
      if (names.has(name) && new RegExp(`\\b${name}\\(`).test(s)) problems.push(`${f}: calls ${name}() from client module ${m[2]}`);
    }
  }
}
if (problems.length) {
  console.error("Server code calls functions from \"use client\" modules:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("check-client-calls: ok");
