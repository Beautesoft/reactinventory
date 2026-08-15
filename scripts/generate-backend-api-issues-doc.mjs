/**
 * Generates docs/Backend_API_Issues_SYY.docx
 * Run: node scripts/generate-backend-api-issues-doc.mjs
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
} from "docx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "docs", "Backend_API_Issues_SYY.docx");

const FONT = "Calibri";
const border = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
};

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 80 },
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
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, bold: true, font: FONT, size: 26, color: "1E3A5F" })],
  });
}

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

const doc = new Document({
  sections: [
    {
      properties: {
        page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "React Inventory — Backend API issues (SE01 / SYY)",
                  font: FONT,
                  size: 16,
                  color: "666666",
                }),
              ],
            }),
          ],
        }),
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
          children: [
            new TextRun({
              text: "Backend API Issues",
              bold: true,
              font: FONT,
              size: 32,
              color: "1E3A5F",
            }),
          ],
        }),
        p("Please fix these three APIs."),

        h1("1. Titles — 404"),
        p("GET https://syy.beautecloud.com/lb/api/Titles?filter[where][productLicense]=SE01"),
        p("Need 200 and a row for site SE01 (at least companyHeader1). Empty array is OK. 404 is not OK."),
        p("Used for print and reports."),

        h1("2. GetInvitems — 500"),
        p("GET http://103.253.15.75:9619/WebInventoryAPI_ForReact/api/GetInvitems?Site=SE01"),
        p('Need 200: { "result": [ { "itemcode": "", "itemdesc": "", "Uom": "", "item_Price": 0, "Cost": 0 } ] }'),
        p('No items → "result": []. Do not return 500.'),
        p("Used to load items on GRN and other stock screens."),

        h1("3. getInventoryAuth — menus incomplete"),
        p("GET http://103.253.15.75:9619/WebInventoryAPI_ForReact/api/getInventoryAuth?userCode=nick"),
        p("SYY currently returns only 8 forms. Please return all of these (same as the full list) plus Replenishment Report."),
        makeTable(
          ["#", "Form name"],
          [
            ["1", "Goods Receive Note List"],
            ["2", "Goods Transfer Out List"],
            ["3", "Goods Transfer In List"],
            ["4", "Goods Return List"],
            ["5", "Stock Adjustment List"],
            ["6", "Stock Balance"],
            ["7", "Stock Usage Memo List"],
            ["8", "Stock Movement - Detail"],
            ["9", "Purchase Requisition"],
            ["10", "Stock Balance Report"],
            ["11", "Stock Take"],
            ["12", "itemmaster"],
            ["13", "Replenishment Report  ← add this (name only)"],
          ],
          [800, 8560]
        ),
        p("Also allow save/toggle for Replenishment Report on postInventoryAuth."),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buffer);
console.log(`Wrote ${outPath}`);
