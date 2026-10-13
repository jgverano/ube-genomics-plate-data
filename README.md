# Ube Genomics Plate Data

Plain text standalone HTML tables for QR code scanning. Each plate is isolated on its own page with no links to other plates.

## QR Code Direct Links

- **Plate 1:** `https://jgverano.github.io/ube-genomics-plate-data/plate1.html`
- **Plate 2:** `https://jgverano.github.io/ube-genomics-plate-data/plate2.html`
- **Plate 3:** `https://jgverano.github.io/ube-genomics-plate-data/plate3.html`

## Files

- [index.html](index.html) (landing page linking the three plates)
- [plate1.html](plate1.html) (standalone Plate 1 table)
- [plate2.html](plate2.html) (standalone Plate 2 table)
- [plate3.html](plate3.html) (standalone Plate 3 table)
- [plate1.tsv](plate1.tsv)
- [plate2.tsv](plate2.tsv)
- [plate3.tsv](plate3.tsv)
- Final-D.-alata-Accessions-Passport-1.xlsx (local only, not in the repo — the metadata source)
- [build-plates.mjs](build-plates.mjs) (build script)
- [read-xlsx.mjs](read-xlsx.mjs) (reads a sheet from an .xlsx file)
- Updated-List-of-PRCRTC-Ube-Collection-4.xlsx (local only, not in the repo — reference only, the build does not read it)

## Regenerating the HTML

Run one command after you change a TSV file or the passport workbook:

```sh
node build-plates.mjs
```

The script reads two sources:

| Source | Gives |
|---|---|
| `plateN.tsv` | The well layout. Each plate needs its own TSV file. |
| `Final-D.-alata-Accessions-Passport-1.xlsx` | The accession code, the local name, and the place of collection. All three plates share it. |

Both `.xlsx` files stay out of the repo. They hold the names of the people who made
them inside the file metadata. Keep the passport workbook in this folder, or the
build stops.

The script copies the well text as written in the TSV. A blank TSV cell becomes a blank
table cell, so every plate shows all 8 rows and 12 columns.

`read-xlsx.mjs` uses the `unzip` command. It needs no npm package. macOS and Linux
include `unzip`.

## A cell shows "Not found". Why?

The well text must match a code in the passport workbook. The comparison ignores case,
spaces, hyphens, and underscores. So `la-627`, `LA_627`, and `LA627` all match `LA-627`.

The two workbooks hold the same 191 codes. The passport workbook alone gives the same
"Found" answer, so the collection workbook is not read anymore.
