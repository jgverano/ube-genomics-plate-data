// Minimal .xlsx reader: reads one sheet as rows of strings.
// Uses the `unzip` command, so it needs no npm package. macOS and Linux have it.
import { execFileSync } from "node:child_process";

const unzip = (file, entry) =>
  execFileSync("unzip", ["-p", file, entry], { encoding: "utf8", maxBuffer: 1 << 28 });

// &amp; last, so "&amp;lt;" does not become "<".
const unescape = s => s
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&amp;/g, "&");

const texts = xml => [...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => m[1]).join("");
const column = ref => [...ref].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

export function readSheet(file, sheet = 1) {
  const shared = [...unzip(file, "xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map(m => unescape(texts(m[1])));

  const rows = [];
  const xml = unzip(file, `xl/worksheets/sheet${sheet}.xml`);
  for (const row of xml.matchAll(/<row[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const values = [];
    for (const cell of (row[1] || "").matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const [, ref, attrs, inner = ""] = cell;
      const type = (attrs.match(/\bt="([^"]+)"/) || [])[1];
      const raw = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      values[column(ref)] = type === "inlineStr" ? unescape(texts(inner))
        : raw === undefined ? ""
        : type === "s" ? shared[+raw] ?? ""
        : unescape(raw);
    }
    rows.push(Array.from({ length: values.length }, (_, i) => values[i] ?? ""));
  }
  return rows;
}
