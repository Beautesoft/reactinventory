import fs from "fs";
import path from "path";

const jsonlPath = path.resolve("e2e/reports/matrix-current.jsonl");

function readRows() {
  if (!fs.existsSync(jsonlPath)) return [];
  return fs
    .readFileSync(jsonlPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function recordUatRow(row) {
  fs.mkdirSync(path.dirname(jsonlPath), { recursive: true });
  fs.appendFileSync(
    jsonlPath,
    `${JSON.stringify({ at: new Date().toISOString(), ...row })}\n`
  );
}

export function uatRows() {
  return readRows();
}

function qtyCell(snap, site, item) {
  const cell = snap?.[site]?.[item];
  if (!cell || cell.trnBalqty == null) return "—";
  return String(cell.trnBalqty);
}

function lineText(lines) {
  if (!lines?.length) return "";
  return lines
    .map(
      (l) =>
        `${l.itemcode} qty=${l.docQty} memo1=${l.ordMemo1 || "-"} memo2=${l.ordMemo2 || "-"} memo4=${l.ordMemo4 || "-"}`
    )
    .join(" · ");
}

export function writeUatReport() {
  const rows = readRows();
  const dir = path.resolve("e2e/reports");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(dir, `matrix-${stamp}.json`);
  const mdPath = path.join(dir, `matrix-${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2));

  const sites = ["ZE01", "ZEHQ"];
  const items = ["11600007", "11600012"];
  const header = [
    "Case",
    "Menu",
    "Ref",
    "Doc",
    "Status",
    ...sites.flatMap((s) => items.map((i) => `${s} ${i} before`)),
    ...sites.flatMap((s) => items.map((i) => `${s} ${i} after`)),
    "Lines",
    "Note",
  ];

  const md = [
    "# Batch matrix UAT",
    "",
    `Generated ${new Date().toISOString()}`,
    "",
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.map((r) => {
      const before = sites.flatMap((s) =>
        items.map((i) => qtyCell(r.stockBefore, s, i))
      );
      const after = sites.flatMap((s) =>
        items.map((i) => qtyCell(r.stockAfter, s, i))
      );
      const cells = [
        r.caseId || "",
        r.menu || "",
        r.ref || "",
        r.docNo || "",
        r.docStatus ?? "",
        ...before,
        ...after,
        lineText(r.lines).replace(/\|/g, "/"),
        String(r.note || "").replace(/\|/g, "/"),
      ];
      return `| ${cells.join(" | ")} |`;
    }),
    "",
    "On-hand is `Itemonqties.trnBalqty` (first matching row per item and site).",
    "Document lines are `StkMovdocDtls` after the UI post.",
    "",
  ].join("\n");

  fs.writeFileSync(mdPath, md);
  fs.copyFileSync(mdPath, path.join(dir, "matrix-latest.md"));
  fs.copyFileSync(jsonPath, path.join(dir, "matrix-latest.json"));
  return { jsonPath, mdPath, count: rows.length };
}
