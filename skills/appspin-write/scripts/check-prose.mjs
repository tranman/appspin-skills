#!/usr/bin/env node
// check-prose: the mechanical part of appspin-write's rules on Markdown files.
//
//   node check-prose.mjs <file.md>...
//
// Rule breaks print as file:line: message and exit 1. Signals print under
// `signals:` and never fail. `ok` means no rule breaks. Node only, no
// dependencies; macOS and Linux.
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";

const WORDS = /\b(just|easy|easily|simply)\b/gi;

// GitHub's heading slug: lowercase, drop punctuation but hyphens, underscores and spaces, spaces to hyphens.
const slug = (text) =>
  text
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\p{L}\p{M}\p{N}_ -]/gu, "")
    .replace(/ /g, "-");

const headingsOf = (lines) => {
  const seen = {};
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    // A closing run of # needs a space before it, so "C#" keeps its #; links and emphasis slug as their text, images as nothing.
    const m = /^#{1,6}\s+(.+?)(?:\s+#+)?\s*$/.exec(lines[i]);
    if (!m) continue;
    let s = slug(
      m[1]
        .replace(/!\[[^\]]*\](?:\([^)]*\)|\[[^\]]*\])/g, "")
        .replace(/\[([^\]]*)\](?:\([^)]*\)|\[[^\]]*\])/g, "$1")
        .replace(/(`+).*?\1|(?<![\p{L}\p{N}_])(_+)(?=\S)(.*?\S)\2(?![\p{L}\p{N}_])/gu, (span, code, _, text) =>
          code ? span : text,
        ),
    );
    if (seen[s] !== undefined) s = `${s}-${++seen[s]}`;
    else seen[s] = 0;
    out.push({ line: i + 1, text: m[1], slug: s });
  }
  return out;
};

const sentencesOf = (text) =>
  text
    .split(/(?<=[.!?])\s+(?=[A-Z`"([])/)
    .map((s) => s.trim())
    .filter(Boolean);
const wordsOf = (text) => text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
const listOf = (text) => text.split(",").map((s) => s.trim());
// What each line is, and the abbreviations a file declares; the one place fences and front matter are read.
const kindsOf = (raw) => {
  const kind = new Array(raw.length).fill("prose");
  const assumed = [];
  let fence = null; // the open fence's run, such as ``` or ~~~~
  let col = 0; // where the open block's text starts; a fence indented four past it is an indented code block's text
  let front = raw[0] === "---" && raw.slice(1).some((l) => /^---\s*$/.test(l));
  for (let i = 0; i < raw.length; i++) {
    const l = raw[i];
    if (front) {
      kind[i] = "front";
      const a = /^abbreviations:\s*(.+)$/.exec(l);
      if (a) assumed.push(...listOf(a[1]));
      if (i > 0 && /^---\s*$/.test(l)) front = false;
      continue;
    }
    const a = /<!--\s*abbreviations:\s*(.+?)\s*-->/.exec(l);
    if (a) assumed.push(...listOf(a[1]));
    const f = l.search(/\S/) < col + 4 && /^\s*(`{3,}|~{3,})/.exec(l);
    if (fence) {
      kind[i] = "code";
      // A fence closes on a run of its own character alone, at least as long as the opening.
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length && l.trim() === f[1]) fence = null;
      continue;
    }
    if (l.trim()) {
      const item = /^ *(?:[-*+]|\d+[.)]) +/.exec(l);
      col = item ? item[0].length : Math.min(col, l.search(/\S/));
    }
    if (f) {
      fence = f[1];
      kind[i] = "code";
      continue;
    }
    if (/^\s*\|/.test(l)) kind[i] = "table";
    else if (/^\[[^\]^][^\]]*\]:(\s|$)/.test(l))
      kind[i] = "ref"; // a reference-style link's definition, not a footnote
    else if (/^#{1,6}\s/.test(l)) kind[i] = "heading";
    // A line underlined with = or - is a setext heading, but under a list item or quote - is a thematic break.
    else if (
      /^ {0,3}(=+|-+)\s*$/.test(l) &&
      kind[i - 1] === "prose" &&
      !/^\s*(?:[-*+>]|\d+[.)])(\s|$)/.test(raw[i - 1])
    ) {
      kind[i - 1] = "heading";
      kind[i] = "underline";
    } else if (!l.trim()) kind[i] = "blank";
  }
  return {
    kind,
    assumed,
    headings: headingsOf(raw.map((l, i) => (kind[i] !== "heading" ? "" : kind[i + 1] === "underline" ? `# ${l}` : l))),
  };
};
// A root-relative link resolves from the repository root, as GitHub resolves it.
const rootOf = (dir) => (existsSync(resolve(dir, ".git")) || dirname(dir) === dir ? dir : rootOf(dirname(dir)));
const slugsOf = new Map(); // a link target's heading slugs, read once per file

const check = (file) => {
  const raw = readFileSync(file, "utf8").split(/\r?\n/);
  const breaks = [];
  const signals = [];
  const report = (line, msg) => breaks.push({ line, msg });

  const { kind, assumed, headings } = kindsOf(raw);
  // Text the sentence rules read: comments go, code spans become one word, link targets go.
  const bare = raw.map((l, i) =>
    kind[i] === "prose" || kind[i] === "heading"
      ? l
          .replace(/<!--.*?-->/g, "")
          .replace(/`[^`]+`/g, "X")
          .replace(/\]\([^)]*\)/g, "]")
      : "",
  );

  const byText = {};
  for (const h of headings) {
    const t = h.text.toLowerCase();
    if (byText[t]) report(h.line, `heading "${h.text}" repeats line ${byText[t]}`);
    else byText[t] = h.line;
  }

  // 2–5 capitals; README is six, and GOV.UK and ASD-STE100 are names.
  const expanded = {};
  raw.forEach((l, i) => {
    if (kind[i] === "code") return;
    for (const m of l.matchAll(/\(([A-Z]{2,5})\)/g)) if (expanded[m[1]] === undefined) expanded[m[1]] = i + 1;
  });
  const abbrSeen = new Set(assumed);
  bare.forEach((text, i) => {
    if (kind[i] !== "prose") return;
    for (const m of text.matchAll(/(?<![\w.-])([A-Z]{2,5})s?(?![\w-]|\.\w)/g)) {
      const a = m[1];
      if (abbrSeen.has(a)) continue;
      abbrSeen.add(a);
      const at = expanded[a];
      if (at === undefined) signals.push(`${file}:${i + 1}: ${a} is never written out`);
      else if (at > i + 1) signals.push(`${file}:${i + 1}: ${a} is used before it is written out at line ${at}`);
    }
  });

  raw.forEach((l, i) => {
    if (kind[i] === "code") return;
    let targets;
    if (kind[i] === "ref") {
      // CommonMark lets a definition's target start on the next line.
      const def = /^\[[^\]]+\]:\s*(\S+)/.exec(l) ?? (kind[i + 1] === "prose" && /^\s*(\S+)/.exec(raw[i + 1]));
      if (!def) {
        report(i + 1, "link definition has no target");
        return;
      }
      targets = [def[1].replace(/^<(.*)>$/, "$1")]; // CommonMark allows <target>
    } else targets = [...l.replace(/`[^`]+`/g, "").matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]);
    for (const target of targets) {
      if (/^(https?:|mailto:)/.test(target)) continue;
      const [path, anchor] = target.split("#");
      let slugs = headings.map((h) => h.slug);
      let decoded, name;
      try {
        [decoded, name] = [path, anchor].map((s) => s && decodeURIComponent(s));
      } catch {
        report(i + 1, `link target ${target} is not a valid address`);
        continue;
      }
      if (path) {
        const full = decoded.startsWith("/")
          ? resolve(rootOf(resolve(dirname(file))), "." + decoded)
          : resolve(dirname(file), decoded);
        if (!existsSync(full)) {
          report(i + 1, `link target ${path} does not exist`);
          continue;
        }
        if (anchor === undefined || !statSync(full).isFile() || !/\.md$/i.test(full)) continue;
        if (!slugsOf.has(full))
          slugsOf.set(
            full,
            kindsOf(readFileSync(full, "utf8").split(/\r?\n/)).headings.map((h) => h.slug),
          );
        slugs = slugsOf.get(full);
      }
      if (anchor !== undefined && !slugs.includes(name))
        report(i + 1, `anchor #${anchor} matches no heading in ${path || "this file"}`);
    }
  });

  bare.forEach((text, i) => {
    if (!text) return;
    for (const m of text.matchAll(WORDS)) report(i + 1, `"${m[0]}"`);
  });

  let para = [];
  let paraStart = 0;
  const flush = () => {
    if (!para.length) return;
    const ss = sentencesOf(para.join(" "));
    ss.forEach((s) => {
      const n = wordsOf(s).length;
      if (n > 25) signals.push(`${file}:${paraStart}: sentence of ${n} words`);
    });
    if (ss.length > 6) signals.push(`${file}:${paraStart}: paragraph of ${ss.length} sentences`);
    para = [];
  };
  raw.forEach((l, i) => {
    if (kind[i] === "prose") {
      const item = /^\s*(?:[-*+]|\d+\.)\s+/.test(l); // a list item is its own paragraph
      if (item) flush();
      if (!para.length) paraStart = i + 1;
      para.push(bare[i].trim().replace(/^(?:[-*+]|\d+\.)\s+/, ""));
    } else flush();
  });
  flush();
  breaks.sort((a, b) => a.line - b.line);
  return { breaks: breaks.map((b) => `${file}:${b.line}: ${b.msg}`), signals };
};

const files = process.argv.slice(2);
if (!files.length) {
  console.error("usage: check-prose.mjs <file.md>...");
  process.exit(2);
}
let failed = false;
for (const file of files) {
  const { breaks, signals } = check(file);
  for (const b of breaks) console.log(b);
  signals.sort((a, b) => Number(/:(\d+): /.exec(a)[1]) - Number(/:(\d+): /.exec(b)[1]));
  if (signals.length) {
    console.log("signals:");
    for (const s of signals) console.log(s);
  }
  if (breaks.length) failed = true;
}
if (!failed) console.log("ok");
process.exit(failed ? 1 : 0);
