/**
 * Generates docs/E2E_Posted_Stock_Reverse.docx
 * Run: node scripts/generate-e2e-cleanup-doc.mjs
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
const outPath = path.join(__dirname, "..", "docs", "E2E_Posted_Stock_Reverse.docx");

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

const ITEM = "12200002";
const ITEM_DESC = "Agarwood oil 沉香油(10ml and 5ml)";
const UOM = "BOX";

const grnRows = [
  ["WGRNDH01110015", "E2E-1785307174659", "29/07/2026", "5"],
  ["WGRNDH01110014", "E2E-1785306999155", "29/07/2026", "5"],
  ["WGRNDH01110013", "E2E-1785306680214", "29/07/2026", "5"],
  ["WGRNDH01110012", "E2E-1785306506743", "29/07/2026", "5"],
  ["WGRNDH01110011", "E2E-1785305425813", "29/07/2026", "5"],
  ["WGRNDH01110010", "E2E-1785180455116", "27/07/2026", "5"],
  ["WGRNDH01110009", "E2E-1785177681916", "27/07/2026", "1"],
];

const gtoRows = [
  ["WGTODH01110007", "29/07/2026", "1"],
  ["WGTODH01110006", "29/07/2026", "1"],
  ["WGTODH01110005", "29/07/2026", "1"],
  ["WGTODH01110004", "29/07/2026", "1"],
  ["WGTODH01110003", "29/07/2026", "1"],
  ["WGTODH01110002", "27/07/2026", "1"],
];

const rtnRows = [
  ["WRTNDH01110006", "E2E-1785307223968", "29/07/2026", "1"],
  ["WRTNDH01110005", "E2E-1785307047293", "29/07/2026", "1"],
  ["WRTNDH01110004", "E2E-1785306727409", "29/07/2026", "1"],
  ["WRTNDH01110003", "E2E-1785306553787", "29/07/2026", "1"],
  ["WRTNDH01110002", "E2E-1785305466410", "29/07/2026", "1"],
  ["WRTNDH01110001", "E2E-1785180473846", "27/07/2026", "1"],
];

const adjRows = [
  ["WADJDH01110007", "E2E-1785307201911", "29/07/2026", "1"],
  ["WADJDH01110006", "E2E-1785307024887", "29/07/2026", "1"],
  ["WADJDH01110005", "E2E-1785306706078", "29/07/2026", "1"],
  ["WADJDH01110004", "E2E-1785306532301", "29/07/2026", "1"],
  ["WADJDH01110003", "E2E-1785305446513", "29/07/2026", "1"],
  ["WADJDH01110002", "E2E-1785180465864", "27/07/2026", "1"],
];

const sumRows = [
  ["WSUMDH01100006", "E2E-1785307213784", "29/07/2026", "1"],
  ["WSUMDH01100005", "E2E-1785307036995", "29/07/2026", "1"],
  ["WSUMDH01100004", "E2E-1785306717303", "29/07/2026", "1"],
  ["WSUMDH01100003", "E2E-1785306543685", "29/07/2026", "1"],
  ["WSUMDH01100002", "E2E-1785305456918", "29/07/2026", "1"],
  ["WSUMDH01100001", "E2E-1785180469918", "27/07/2026", "1"],
];

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
                  text: "Posted test documents",
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
              text: "Posted Documents from Testing",
              bold: true,
              font: FONT,
              size: 32,
              color: "1E3A5F",
            }),
          ],
        }),
        p("Details of documents posted during testing. All lines use the same item. From stock movement (stktrn) at DRAGON HEALTH (DH01).", {
          after: 160,
        }),

        h1("Item used"),
        makeTable(
          ["Item Code", "Description", "UOM"],
          [[ITEM, ITEM_DESC, UOM]],
          [1800, 5760, 1800]
        ),
        p("Remarks: E2E_TEST. Ref starts with E2E-.", { after: 160 }),

        h1("Stock qty — before and after testing"),
        p("Store: DRAGON HEALTH (DH01). Item: 12200002 / BOX. Confirmed from stktrn balances."),
        makeTable(
          ["When", "Qty (BOX)", "Source"],
          [
            ["Before testing", "2", "Balance before first E2E GRN (WGRNDH01110009)"],
            ["After testing", "21", "Balance after last E2E GTO / Stock Take"],
          ],
          [2200, 1600, 5560]
        ),
        p("", { after: 80 }),
        h2("How qty changed (DH01)"),
        makeTable(
          ["Movement", "Qty"],
          [
            ["Opening", "2"],
            ["Goods Receive (GRN)", "+31"],
            ["Stock Adjustment (ADJ)", "+6"],
            ["Stock Usage (SUM)", "-6"],
            ["Goods Return (RTN)", "-6"],
            ["Transfer Out (GTO)", "-6"],
            ["Stock Take", "0"],
            ["Closing", "21"],
          ],
          [5600, 3760]
        ),
        p("Check: 2 + 31 + 6 - 6 - 6 - 6 = 21", { after: 160 }),

        h1("DRAGON HEALTH HQ"),
        h2("Goods Transfer In"),
        makeTable(
          ["Doc No", "Ref", "From Store", "Item Code", "Qty", "Stock note"],
          [
            [
              "WGTIDHHQ110001",
              "E2E-1785337369992",
              "DRAGON HEALTH",
              ITEM,
              "1",
              "Posted header only — no stktrn (autoPost off)",
            ],
            [
              "WGTIDHHQ110002",
              "E2E_TEST_MANUAL",
              "DRAGON HEALTH",
              ITEM,
              "1",
              "Posted header only — no stktrn (autoPost off)",
            ],
          ],
          [1800, 2200, 1600, 1200, 600, 1960]
        ),
        p("These GTI docs did not change stock. Safe to remove headers only; no stock reverse needed.", {
          after: 160,
        }),

        h1("DRAGON HEALTH"),
        h2("Goods Receive Note"),
        makeTable(
          ["Doc No", "Ref", "Date", "Item Code", "Qty"],
          grnRows.map(([docNo, ref, date, qty]) => [docNo, ref, date, ITEM, qty]),
          [2200, 2600, 1400, 1400, 1760]
        ),

        h2("Goods Transfer Out"),
        makeTable(
          ["Doc No", "Date", "Item Code", "Qty"],
          gtoRows.map(([docNo, date, qty]) => [docNo, date, ITEM, qty]),
          [2800, 2000, 2200, 2360]
        ),

        h2("Goods Return Note"),
        makeTable(
          ["Doc No", "Ref", "Date", "Item Code", "Qty"],
          rtnRows.map(([docNo, ref, date, qty]) => [docNo, ref, date, ITEM, qty]),
          [2200, 2600, 1400, 1400, 1760]
        ),

        h2("Stock Adjustment"),
        makeTable(
          ["Doc No", "Ref", "Date", "Item Code", "Qty"],
          adjRows.map(([docNo, ref, date, qty]) => [docNo, ref, date, ITEM, qty]),
          [2200, 2600, 1400, 1400, 1760]
        ),

        h2("Stock Usage Memo"),
        makeTable(
          ["Doc No", "Ref", "Date", "Item Code", "Qty"],
          sumRows.map(([docNo, ref, date, qty]) => [docNo, ref, date, ITEM, qty]),
          [2200, 2600, 1400, 1400, 1760]
        ),

        h2("Stock Take"),
        makeTable(
          ["Doc No", "Date", "Item Code", "Variance"],
          [["PHYDH01100001", "29/07/2026", ITEM, "0"]],
          [2800, 2000, 2200, 2360]
        ),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buffer);
console.log(`Wrote ${outPath}`);
