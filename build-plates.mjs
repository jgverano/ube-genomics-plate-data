// Rebuilds plateN.html from plateN.tsv so the tables mirror the TSV exactly,
// including blank wells. Run: node build-plates.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { readSheet } from "./read-xlsx.mjs";

const ROWS = "ABCDEFGH".split("");
// Every plateN.tsv in this folder, in number order. A new plate needs only its TSV.
const PLATES = readdirSync(".")
  .map(file => /^plate(\d+)\.tsv$/.exec(file))
  .filter(Boolean)
  .map(match => Number(match[1]))
  .sort((a, b) => a - b);
if (PLATES.length === 0) throw new Error("no plateN.tsv files in this folder");

// Footnotes shown under the table, keyed by plate number. Plates without an entry get none.
const LEGENDS = {
  3: ["LS: LORNA SISTER", "*DAVIS BOY JIMENEZ", "**BALIK BINHI", "***3-LEAF DIOSCOREA"],
  5: ["*Additional 10 Bay"],
};

// Page styling, shared by all three plates.
const CSS = `
    body {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.4;
      background: #ffffff;
      color: #000000;
      margin: 16px;
    }

    h1 {
      font-size: 15px;
      font-weight: bold;
      margin: 0 0 12px 0;
    }

    .table-wrap {
      overflow-x: auto;
      margin-bottom: 16px;
    }

    table {
      border-collapse: collapse;
      text-align: left;
    }

    th, td {
      border: 1px solid #000000;
      padding: 6px 10px;
      white-space: nowrap;
    }

    th {
      background: #f0f0f0;
      font-weight: bold;
      text-align: center;
    }

    th.row-label {
      text-align: center;
      font-weight: bold;
      background: #f0f0f0;
    }

    td.empty {
      color: #888888;
    }

    td.cell-clickable {
      cursor: pointer;
      user-select: none;
    }

    td.cell-clickable:hover {
      background: #e8e8e8;
    }

    td.selected {
      background: #000000 !important;
      color: #ffffff !important;
    }

    .details-box {
      border: 1px solid #000000;
      padding: 12px 16px;
      max-width: 650px;
      background: #fafafa;
    }

    .details-title {
      font-weight: bold;
      margin-bottom: 8px;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.5px;
    }

    .details-grid {
      display: grid;
      grid-template-columns: 180px 1fr;
      row-gap: 6px;
      column-gap: 12px;
    }

    .details-label {
      color: #555555;
    }

    .details-val {
      font-weight: 500;
      word-break: break-word;
    }

    .no-data {
      color: #666666;
      font-style: italic;
    }
`;

// Landing page styling.
const INDEX_CSS = `
    body {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.4;
      background: #ffffff;
      color: #000000;
      margin: 16px;
    }

    h1 {
      font-size: 15px;
      font-weight: bold;
      margin: 0 0 12px 0;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      margin-bottom: 6px;
    }

    a {
      color: #000000;
      text-decoration: none;
      border-bottom: 1px solid #000000;
    }

    a:hover {
      background: #000000;
      color: #ffffff;
    }
`;

// The passport workbook is the only source of metadata. Row 1 is a header row.
const PASSPORT_XLSX = "Final-D.-alata-Accessions-Passport-1.xlsx";
const PASSPORT_DATA = Object.fromEntries(
  readSheet(PASSPORT_XLSX).slice(1).filter(row => row[0]).map(
    ([code, localName, origin]) => [code.trim(), {
      localName: localName.trim() || null,
      origin: origin.trim() || null,
    }]));

console.log(`metadata: ${Object.keys(PASSPORT_DATA).length} passport rows from ${PASSPORT_XLSX}`);

const esc = s => s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const cell = v => v === ""
  ? '          <td class="empty"></td>'
  : `          <td class="cell-clickable">${esc(v)}</td>`;

function readTsv(file) {
  const lines = readFileSync(file, "utf8").split("\n").filter(l => l.trim() !== "");
  const [header, ...body] = lines.map(l => l.split("\t").slice(1).map(v => v.trim()));
  if (header.length !== 12) throw new Error(`${file}: ${header.length} header columns, expected 12`);
  if (body.length !== 8) throw new Error(`${file}: ${body.length} rows, expected 8`);
  body.forEach((row, i) => {
    if (row.length !== 12) throw new Error(`${file}: row ${ROWS[i]} has ${row.length} values, expected 12`);
  });
  return { header, body };
}

const table = ({ header, body }) => [
  "      <thead>",
  "        <tr>",
  '          <th></th>',
  ...header.map(h => `          <th>${esc(h)}</th>`),
  "        </tr>",
  "      </thead>",
  "      <tbody>",
  ...body.flatMap((row, r) => [
    "        <tr>",
    `          <th class="row-label">${ROWS[r]}</th>`,
    ...row.map(cell),
    "        </tr>",
  ]),
  "      </tbody>",
].join("\n");

const script = `
    const normalize = value => (value || "").toUpperCase().replace(/[\\s_-]/g, "");
    const passport = Object.fromEntries(Object.entries(PASSPORT_DATA).map(([key, value]) => [normalize(key), { key, ...value }]));
    const details = document.getElementById("detailsContent");

    document.querySelectorAll("table tbody tr").forEach(row => {
      const rowName = row.querySelector("th.row-label").textContent.trim();
      row.querySelectorAll("td:not(.empty)").forEach(cell => {
        cell.addEventListener("click", () => {
          document.querySelectorAll("td.selected").forEach(item => item.classList.remove("selected"));
          cell.classList.add("selected");

          const name = cell.textContent.trim();
          const record = passport[normalize(name)];
          const lines = [
            ["Well Position", rowName + cell.cellIndex],
            ["Accession Code", name],
            ["Local / Common Name", record?.localName || "-"],
            ["Place of Collection", record?.origin || "-"],
            ["Updated Collection List", record ? "Found" : "Not found"]
          ];

          details.className = "details-grid";
          details.replaceChildren(...lines.flatMap(([label, value]) => {
            const key = document.createElement("div"); key.className = "details-label"; key.textContent = label + ":";
            const val = document.createElement("div"); val.className = "details-val"; val.textContent = value;
            return [key, val];
          }));
        });
      });
    });`;

for (const n of PLATES) {
  const tsv = readTsv(`plate${n}.tsv`);
  const legend = LEGENDS[n] && `  <div class="details-box">
    <div class="details-title">Legend</div>
${LEGENDS[n].map(line => `    <div>${esc(line)}</div>`).join("\n")}
  </div>`
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plate ${n}</title>
  <style>${CSS}  </style>
</head>
<body>

  <h1>Plate ${n}</h1>

  <div class="table-wrap">
    <table>
${table(tsv)}
    </table>
  </div>
${legend || ""}
  <div class="details-box" id="detailsBox">
    <div class="details-title">Passport Details</div>
    <div id="detailsContent" class="no-data">Click a cell to display accession passport details.</div>
  </div>

  <script>
    const PASSPORT_DATA = ${JSON.stringify(PASSPORT_DATA)};
${script}
  </script>

</body>
</html>
`;
  writeFileSync(`plate${n}.html`, html);
  const filled = tsv.body.flat().filter(Boolean).length;
  console.log(`plate${n}.html: ${filled} filled wells, ${96 - filled} blank wells`);
}

// The landing page lists every plate file, so it cannot go stale.
const links = PLATES.map(n => `    <li><a href="plate${n}.html">Plate ${n}</a></li>`).join("\n");
writeFileSync("index.html", `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ube Genomics Plate Data</title>
  <style>${INDEX_CSS}  </style>
</head>
<body>

  <h1>Ube Genomics Plate Data</h1>

  <ul>
${links}
  </ul>

</body>
</html>
`);
console.log(`index.html: ${PLATES.length} plate links`);
