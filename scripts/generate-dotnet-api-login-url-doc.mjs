/**
 * Generates docs/API_LOGIN_URL_DotNet_APIs.docx
 * Run: node scripts/generate-dotnet-api-login-url-doc.mjs
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  WidthType,
} from "docx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "docs", "API_LOGIN_URL_DotNet_APIs.docx");

const FONT = "Calibri";
const border = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
};

function cell(text, opts = {}) {
  return new TableCell({
    borders: border,
    width: { size: opts.width ?? 2000, type: WidthType.DXA },
    shading: opts.header ? { fill: "E8EEF7" } : undefined,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: String(text ?? ""),
            font: FONT,
            size: 18,
            bold: !!opts.header,
          }),
        ],
      }),
    ],
  });
}

function makeTable(headers, rows, widths) {
  return new Table({
    width: { size: 10080, type: WidthType.DXA },
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

const rows = [
  ["POST", "api/webBI_Login", "Login"],
  ["GET", "api/getInventoryAuth?userCode=", "Menus"],
  ["GET", "api/postInventoryAuth?UserCode=&ReportCode=&Active=", "Save menu access"],
  ["GET", "api/User?siteCode=NIL", "User list (Settings)"],
  ["GET", "api/GetInvitems?Site=", "Item list (Dashboard, Stock Balance, GRN/GTO/GTI/RTN/ADJ/SUM/Take/PR/PO)"],
  ["GET", "api/GetStkOutOwn?Site=", "GTO own docs"],
  ["GET", "api/GetStkInOwn?Site=", "GTI own docs"],
  ["GET", "api/Brand?siteCode=", "Report filter"],
  ["GET", "api/Range?siteCode=&brandCode=NIL", "Report filter"],
  ["GET", "api/department?siteCode=", "Report filter"],
  ["GET", "api/StockList?siteCode=", "Report filter"],
  ["GET", "api/Supplier?siteCode=", "Movement report"],
  ["GET", "api/MovementCode?siteCode=", "Movement report"],
  ["POST", "api/webInventory_StockBalance", "Stock Balance Report"],
  ["POST", "api/webBI_StockMovementDetail", "Stock Movement Report"],
  ["GET", "api/SaveOutItemBatchSno?...", "GTO/GTI post (only if BATCH_SNO=Yes)"],
  ["GET", "api/postOutItemBatchSno?...", "GTO post (only if BATCH_SNO=Yes)"],
  ["GET", "api/postItemBatchSno?...", "RTN post (only if BATCH_SNO=Yes)"],
];

const doc = new Document({
  sections: [
    {
      properties: {
        page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: "API_LOGIN_URL (.NET) APIs",
              bold: true,
              font: FONT,
              size: 32,
              color: "1E3A5F",
            }),
          ],
        }),
        makeTable(["Method", "API", "Used for"], rows, [1200, 4680, 4200]),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buffer);
console.log(`Wrote ${outPath}`);
