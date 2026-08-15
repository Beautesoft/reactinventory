/**
 * Generates docs/E2E_Inyeon_UAT_Cleanup.docx
 * Run: node scripts/generate-inyeon-cleanup-doc.mjs
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  Header,
  Footer,
  PageNumber,
} from "docx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "docs", "E2E_Inyeon_UAT_Cleanup.docx");

const FONT = "Calibri";
const border = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
};

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 100 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: opts.size ?? 22,
        bold: opts.bold,
      }),
    ],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, font: FONT, size: 26, color: "1E3A5F" })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 180, after: 80 },
    children: [new TextRun({ text, bold: true, font: FONT, size: 22, color: "2563EB" })],
  });
}

function cell(text, opts = {}) {
  return new TableCell({
    borders: border,
    width: { size: opts.width ?? 1500, type: WidthType.DXA },
    shading: opts.header ? { fill: "E8EEF7" } : undefined,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: String(text ?? ""),
            font: FONT,
            size: opts.header ? 18 : 17,
            bold: !!opts.header,
          }),
        ],
      }),
    ],
  });
}

function makeTable(headers, rows, widths) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        children: headers.map((h, i) => cell(h, { header: true, width: widths[i] })),
      }),
      ...rows.map(
        (r) =>
          new TableRow({
            children: r.map((v, i) => cell(v, { width: widths[i] })),
          })
      ),
    ],
  });
}

const STOCK_ITEM = "11100001";
const STOCK_ITEM_DESC = "3 in 1 LED Face Mask";
const UOM = "UNIT";
const OUTLET = "TRIPLE ONE";
const GTO_TO = "PARKWAY PARADE";

// Run A — full post (07/08/2026). Doc No blank — fill from app after lookup by Ref.
const runA = [
  ["GRN", "", "E2E-1786040897962", STOCK_ITEM, "5", OUTLET],
  ["ADJ (+)", "", "E2E-1786040904511", STOCK_ITEM, "1", OUTLET],
  ["SUM", "", "E2E-1786040911093", STOCK_ITEM, "1", OUTLET],
  ["RTN", "", "E2E-1786040917466", STOCK_ITEM, "1", OUTLET],
  ["GTO", "", "E2E-1786040931014", STOCK_ITEM, "1", `${OUTLET} → ${GTO_TO}`],
  ["PR", "", "E2E-1786040939371", STOCK_ITEM, "1", OUTLET],
];

// Run B — GRN skipped (pre on-hand 2)
const runB = [
  ["ADJ (+)", "", "E2E-1786075137549", STOCK_ITEM, "1", OUTLET],
  ["SUM", "", "E2E-1786075146059", STOCK_ITEM, "1", OUTLET],
  ["RTN", "", "E2E-1786075154390", STOCK_ITEM, "1", OUTLET],
  ["GTO", "", "E2E-1786075163400", STOCK_ITEM, "1", `${OUTLET} → ${GTO_TO}`],
  ["PR", "", "E2E-1786075173693", STOCK_ITEM, "1", OUTLET],
];

const itemMasterRun1 = [
  ["RETAIL PRODUCT", "SINGLE", "11100131", "E2E_TEST RETAIL PRODUCT …"],
  ["SALON PRODUCT", "SINGLE", "21000035", "E2E_TEST SALON PRODUCT …"],
  ["SERVICES", "SINGLE", "31200025", "E2E_TEST SERVICES …"],
  ["VOUCHER", "SINGLE", "42300005", "E2E_TEST VOUCHER …"],
  ["PREPAID", "SINGLE", "51800003", "E2E_TEST PREPAID …"],
];

const itemMasterRun2 = [
  ["RETAIL PRODUCT", "SINGLE", "11100132", "E2E RETAIL SINGLE …"],
  ["SALON PRODUCT", "SINGLE", "21000036", "E2E SALON SINGLE …"],
  ["SALON PRODUCT", "PACKAGE", "21000037", "E2E SALON PACKAGE …"],
  ["SERVICES", "SINGLE", "31200026", "E2E SERVICES SINGLE …"],
  ["SERVICES", "PACKAGE", "31200027", "E2E SERVICES PACKAGE …"],
  ["SERVICES", "COURSE", "31200028", "E2E SERVICES COURSE …"],
  ["VOUCHER", "SINGLE", "42300006", "E2E VOUCHER SINGLE …"],
  ["PREPAID", "SINGLE", "51800004", "E2E PREPAID SINGLE …"],
];

const stockDocCols = [900, 1800, 2600, 1200, 600, 2260];

const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          margin: { top: 720, bottom: 720, left: 720, right: 720 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Inyeon UAT — E2E DB reverse",
                  font: FONT,
                  size: 18,
                  color: "666666",
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "Page ", font: FONT, size: 16, color: "888888" }),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: "888888" }),
              ],
            }),
          ],
        }),
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: "Inyeon UAT — Posted Documents & DB Reverse",
              bold: true,
              font: FONT,
              size: 32,
              color: "1E3A5F",
            }),
          ],
        }),
        p("Client: inyeon.beautecloud.com  |  Test date: 07/08/2026  |  Outlet: TRIPLE ONE", {
          after: 80,
        }),
        p(
          "Documents posted by Playwright E2E (Remarks E2E_TEST, Ref E2E-<timestamp>). Fill Doc No from the app after search. Reverse stock hdr + lines + stktrn for each posted doc.",
          { after: 160 }
        ),

        h1("Stock movement item"),
        makeTable(
          ["Item Code", "Description", "UOM", "Outlet"],
          [[STOCK_ITEM, STOCK_ITEM_DESC, UOM, OUTLET]],
          [1800, 4560, 1200, 1800]
        ),
        p("On-hand for this item went 3 → 2 → 0 across test runs. Verify Stock Balance Live after cleanup.", {
          after: 160,
        }),

        h1("Run A — full post chain"),
        makeTable(
          ["Type", "Doc No", "Ref", "Item", "Qty", "Site"],
          runA,
          stockDocCols
        ),
        p("", { after: 120 }),

        h1("Run B — GRN skipped (pre on-hand 2)"),
        p("GRN was not created — on-hand already sufficient for outbound chain.", { after: 80 }),
        makeTable(
          ["Type", "Doc No", "Ref", "Item", "Qty", "Site"],
          runB,
          stockDocCols
        ),
        p("Run B net effect: opening 2 + ADJ +1 − SUM/RTN/GTO −3 = closing 0.", { after: 160 }),

        h1("DB reverse steps (stock docs)"),
        p("1. Find doc by Ref (E2E-…) or Remarks (E2E_TEST).", { after: 60 }),
        p("2. Delete stock header + detail lines + stktrn for that Doc No.", { after: 60 }),
        p("3. GTO: check both TRIPLE ONE and PARKWAY PARADE.", { after: 60 }),
        p("4. PR: header/lines only (usually no stock movement).", { after: 160 }),

        h1("Item Master — created (delete, not reverse stock)"),
        h2("Run 1 — one per division"),
        makeTable(
          ["Division", "Type", "Stock code", "Name pattern"],
          itemMasterRun1,
          [2200, 1400, 1600, 4160]
        ),
        p("", { after: 80 }),
        h2("Run 2 — division × type matrix"),
        makeTable(
          ["Division", "Type", "Stock code", "Name pattern"],
          itemMasterRun2,
          [2200, 1400, 1600, 4160]
        ),
        p(
          "Per code: remove Stocks + ItemUomprices + ItemStocklists + ItemLinks; PACKAGE types also PackageHdrs/PackageDtls.",
          { after: 160 }
        ),

        h1("Verification checklist"),
        makeTable(
          ["Check", "Done?"],
          [
            ["No Posted rows when searching E2E on GRN/ADJ/SUM/RTN/GTO/PR lists", "☐"],
            ["Item Master E2E test rows removed (or kept intentionally)", "☐"],
            ["Stock Balance Live 11100001 @ TRIPLE ONE restored", "☐"],
            ["Stock Balance Live 11100001 @ PARKWAY PARADE (if GTO posted)", "☐"],
          ],
          [7600, 1760]
        ),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buffer);
console.log(`Wrote ${outPath}`);
