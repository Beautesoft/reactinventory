/**
 * Generates docs/React_Inventory_User_Manual.docx
 * Run: node scripts/generate-user-manual.mjs
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
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
const docsDir = path.join(__dirname, "..", "docs");
const shotDir = path.join(docsDir, "manual-screenshots");
const outPath = path.join(docsDir, "React_Inventory_User_Manual.docx");
const fallbackPath = path.join(docsDir, "React_Inventory_User_Manual_tmp.docx");
const obsoleteDocs = [
  path.join(docsDir, "React_Inventory_User_Manual_v2.docx"),
  path.join(docsDir, "React_Inventory_User_Manual_tmp.docx"),
];

/** Read PNG IHDR width/height */
function pngSize(buf) {
  if (!buf || buf.length < 24 || buf[0] !== 0x89) {
    return { width: 1280, height: 720 };
  }
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

function scaleToWidth(width, height, maxWidth = 540) {
  if (width <= maxWidth) return { width, height };
  const ratio = maxWidth / width;
  return {
    width: maxWidth,
    height: Math.max(1, Math.round(height * ratio)),
  };
}

const FONT = "Calibri";
const thin = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" };
const borders = { top: thin, bottom: thin, left: thin, right: thin };
const hThin = { style: BorderStyle.SINGLE, size: 4, color: "1E3A5F" };
const hBorders = { top: hThin, bottom: hThin, left: hThin, right: hThin };

const runs = (parts) =>
  parts.map((part) =>
    typeof part === "string"
      ? new TextRun({ text: part, size: 22, font: FONT })
      : new TextRun({ size: 22, font: FONT, ...part })
  );

const para = (children, opts = {}) =>
  new Paragraph({
    spacing: { after: opts.after ?? 140, before: opts.before ?? 0, line: 276 },
    alignment: opts.align,
    indent: opts.indent,
    children: Array.isArray(children) ? children : runs([children]),
  });

const p = (text, opts = {}) =>
  para(
    [
      new TextRun({
        text,
        size: opts.size ?? 22,
        font: FONT,
        bold: opts.bold,
        italics: opts.italics,
        color: opts.color,
      }),
    ],
    opts
  );

const rich = (parts, opts = {}) => para(runs(parts), opts);

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 140 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 12, color: "1E3A5F", space: 6 },
    },
    children: [new TextRun({ text, font: FONT, bold: true, size: 28, color: "1E3A5F" })],
  });

const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 24, color: "1D4ED8" })],
  });

const h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 22, color: "334155" })],
  });

const shot = (label, fileName) => {
  const filePath = fileName ? path.join(shotDir, fileName) : null;
  if (filePath && fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath);
    const raw = pngSize(data);
    const size = scaleToWidth(raw.width, raw.height, 540);
    return new Paragraph({
      spacing: { before: 100, after: 160 },
      children: [
        new ImageRun({
          type: "png",
          data,
          transformation: { width: size.width, height: size.height },
          altText: {
            name: fileName,
            title: label,
            description: label,
          },
        }),
      ],
    });
  }

  return new Paragraph({
    spacing: { before: 100, after: 140 },
    border: {
      top: { style: BorderStyle.DASHED, size: 8, color: "64748B", space: 10 },
      bottom: { style: BorderStyle.DASHED, size: 8, color: "64748B", space: 10 },
      left: { style: BorderStyle.DASHED, size: 8, color: "64748B", space: 10 },
      right: { style: BorderStyle.DASHED, size: 8, color: "64748B", space: 10 },
    },
    shading: { fill: "F8FAFC" },
    children: [
      new TextRun({
        text: fileName
          ? `📷  [Missing ${fileName} — run: npm run docs:screenshots]`
          : `📷  [Insert screenshot: ${label}]`,
        size: 20,
        font: FONT,
        italics: true,
        color: "475569",
      }),
    ],
  });
};

const bullet = (text) =>
  new Paragraph({
    spacing: { after: 70 },
    indent: { left: 420 },
    children: [new TextRun({ text: `•  ${text}`, size: 22, font: FONT })],
  });

const step = (n, text) =>
  new Paragraph({
    spacing: { after: 70 },
    indent: { left: 420 },
    children: [new TextRun({ text: `${n}.  ${text}`, size: 22, font: FONT })],
  });

const note = (text) =>
  new Paragraph({
    spacing: { before: 60, after: 120 },
    indent: { left: 200 },
    border: {
      left: { style: BorderStyle.SINGLE, size: 18, color: "2563EB", space: 10 },
    },
    children: [
      new TextRun({ text: "Note: ", bold: true, size: 20, font: FONT, color: "1E40AF" }),
      new TextRun({ text, size: 20, font: FONT, color: "334155", italics: true }),
    ],
  });

const cell = (text, opts = {}) =>
  new TableCell({
    borders: opts.header ? hBorders : borders,
    width: { size: opts.width ?? 2500, type: WidthType.DXA },
    shading: opts.header ? { fill: "1E3A5F" } : opts.alt ? { fill: "F1F5F9" } : { fill: "FFFFFF" },
    children: [
      new Paragraph({
        spacing: { after: 36, before: 36 },
        children: [
          new TextRun({
            text,
            size: 18,
            font: FONT,
            bold: !!opts.header || !!opts.bold,
            color: opts.header ? "FFFFFF" : "1F2937",
          }),
        ],
      }),
    ],
  });

const table = (headers, rows, widths) =>
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        children: headers.map((h, i) => cell(h, { header: true, width: widths[i] })),
      }),
      ...rows.map(
        (row, ri) =>
          new TableRow({
            children: row.map((c, i) =>
              cell(String(c), { width: widths[i], alt: ri % 2 === 1, bold: i === 0 })
            ),
          })
      ),
    ],
  });

const spacer = (after = 80) => new Paragraph({ spacing: { after }, children: [] });

const doc = new Document({
  creator: "React Inventory",
  title: "React Inventory User Manual",
  description: "User guide for React Inventory stock control system",
  sections: [
    {
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              border: {
                bottom: { style: BorderStyle.SINGLE, size: 6, color: "E2E8F0", space: 4 },
              },
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "React Inventory  ·  User Manual",
                  size: 16,
                  font: FONT,
                  color: "64748B",
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
              border: {
                top: { style: BorderStyle.SINGLE, size: 6, color: "E2E8F0", space: 4 },
              },
              spacing: { before: 80 },
              children: [
                new TextRun({ text: "Confidential  ·  Page ", size: 16, font: FONT, color: "64748B" }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, font: FONT, color: "64748B" }),
                new TextRun({ text: " of ", size: 16, font: FONT, color: "64748B" }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: FONT, color: "64748B" }),
              ],
            }),
          ],
        }),
      },
      children: [
        // ===== COVER =====
        spacer(200),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [
            new TextRun({ text: "REACT INVENTORY", bold: true, size: 52, font: FONT, color: "1E3A5F" }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "User Manual", bold: true, size: 36, font: FONT, color: "2563EB" }),
          ],
        }),
        p(
          "This guide covers day-to-day use of React Inventory: login, stock documents, purchase requisitions, reports, and settings."
        ),

        // ===== 1 =====
        h1("1. Getting started"),
        h2("1.1 Login"),
        p(
          "Each session is tied to one outlet. Stock documents, balances, and lists always apply to the outlet you choose at login. If your company has an HQ branch (for example DRAGON HEALTH HQ), log in as that outlet when you need to approve purchase requisitions or receive transfers at HQ."
        ),
        step(1, "Open the app link provided by your company."),
        step(2, "Select your Outlet, enter username and password, then click Login."),
        step(3, "You arrive on the Dashboard for that outlet."),
        shot("Login", "01-login.png"),
        p("Always choose the correct outlet before working — switching outlets requires logout and login again."),

        h2("1.2 Menus"),
        p(
          "The left sidebar groups the main areas of the system. Your administrator controls which menus you can see; if a menu is missing, ask for access rather than assuming the feature is unavailable."
        ),
        bullet("Dashboard — quick overview for your site."),
        bullet("Stock Control — documents (GRN, transfers, PR, Stock Take, Item Master, and others)."),
        bullet("Reports — Stock Balance, Stock Movement, Replenishment."),
        bullet("Settings — menu access for users (administrators only)."),
        bullet("Logout — ends your session."),
        shot("Main screen with sidebar", "02-dashboard-layout.png"),
        shot("Sidebar expanded", "03-sidebar-expanded.png"),

        // ===== 2 =====
        h1("2. Save and Post"),
        p(
          "Most Stock Control documents share the same lifecycle. Open means you can still edit. Posted means the document is final and stock has been updated (for stock-moving documents)."
        ),
        step(1, "Open the module → Create New (or open an existing Open document)."),
        step(2, "Fill the header (references, supplier or destination, dates, remarks), then add item lines."),
        step(3, "If the item uses batches, assign a new or existing batch before you Save or Post."),
        rich([{ text: "Save", bold: true }, " — keeps the document Open so you can edit later. Stock is not updated yet."]),
        rich([{ text: "Post", bold: true }, " — finalises the document and updates stock. Post only when details are correct."]),
        p(
          "Use a clear Remarks or Ref value for test documents (for example E2E_TEST) so they are easy to find and clean up in the database later."
        ),
        shot("Document list", "05-list-grn.png"),
        shot("Document form", "06-form-grn.png"),
        shot("Print preview", "16-print-grn.png"),

        // ===== 3 =====
        h1("3. Stock Control"),

        h2("3.1 Goods Receive Note (GRN)"),
        p(
          "Use GRN when goods arrive from a supplier into the outlet you are logged into. Posting a GRN increases on-hand stock. If batch control is on for the item, create a new batch (or select an existing one when appropriate) on the line before posting."
        ),
        step(1, "Stock Control → Goods Receive Note → Create New."),
        step(2, "Enter Ref, select Supply No (supplier), Delivery Date, Term, and Remarks."),
        step(3, "Search items, enter quantity (and price if shown), add to Selected Items."),
        step(4, "Assign batch details if prompted."),
        step(5, "Save to keep Open, or Post when the receipt is confirmed."),

        h2("3.2 Goods Transfer Out (GTO)"),
        p(
          "Use GTO to send stock from your outlet to another site. For Dragon Health, transfers to head office typically use To Store = DRAGON HEALTH HQ. You must select To Store before items become available. Posting reduces stock at the sending outlet."
        ),
        step(1, "Create GTO → select To Store (for example DRAGON HEALTH HQ) → add items."),
        step(2, "Choose an existing batch with available quantity."),
        step(3, "Save → Post. Stock is reduced at the sending site."),
        shot("GTO form", "07-form-gto.png"),
        p(
          "Depending on company setup, the destination may receive stock automatically, or that site must complete a Goods Transfer In (GTI)."
        ),

        h2("3.3 Goods Transfer In (GTI)"),
        p(
          "GTI receives stock that was transferred into this outlet. Open GTI documents may appear after a GTO from another site, or after HQ approves a Purchase Requisition that requested stock from HQ (see section 4). With auto-post enabled on transfers, stock may already update at the destination when GTO is posted — still open GTI when your process requires a receive document."
        ),
        step(1, "Log in at the receiving outlet (for Dragon Health HQ transfers, use DRAGON HEALTH HQ)."),
        step(2, "Open an Open GTI, or Create New → select From Store → add items."),
        step(3, "Confirm lines and batches → Save → Post to increase on-hand stock."),
        shot("GTI form", "23-form-gti.png"),
        shot("GTI list", "20-list-gti.png"),

        h2("3.4 Goods Return Note (RTN)"),
        p(
          "Use RTN when returning stock to a supplier. Posting decreases on-hand stock. Select the supplier, add return quantities, and pick an existing batch that still has stock."
        ),
        step(1, "Create RTN → select Supply No → add return lines."),
        step(2, "Assign existing batches → Save → Post."),
        shot("RTN form", "19-form-rtn.png"),

        h2("3.5 Stock Adjustment (ADJ)"),
        p(
          "Use ADJ to correct quantities when stock does not match the system (for example damage, found stock, or counting corrections). Positive quantities increase stock; negative quantities decrease it. Enter the signed quantity carefully and Post only after checking the reason in Remarks."
        ),
        step(1, "Create ADJ → enter Ref and Remark → add lines with the adjustment quantity."),
        step(2, "Assign batch as required → Save → Post."),
        shot("ADJ form", "17-form-adj.png"),

        h2("3.6 Stock Usage Memo (SUM)"),
        p(
          "Use SUM to issue stock for internal use (clinic use, samples, consumption) without returning it to a supplier. Posting decreases on-hand stock from an existing batch."
        ),
        step(1, "Create SUM → enter Ref and Remark → add items and quantities."),
        step(2, "Select existing batch → Save → Post."),
        shot("SUM form", "18-form-sum.png"),

        h2("3.7 Stock Take"),
        p(
          "Stock Take records physical counts against system quantity. Work carefully: select items (Step 1), enter counted quantities and confirm each line (Step 2), then Post. Posting writes stock transactions (type TKE) and adjusts on-hand only where counted differs from system quantity."
        ),
        step(1, "Create Stock Take → select items → Next."),
        step(2, "Enter counted quantities, tick Confirm Update on each line."),
        step(3, "Save while counting if needed; Post when the count is finished."),
        shot("Stock Take form", "08-form-stock-take.png"),
        shot("Stock Take list", "22-list-stock-take.png"),

        h2("3.8 Stock Balance (live)"),
        p(
          "Live Stock Balance shows current on-hand for the logged-in outlet. It is for enquiry only — it does not create or post documents. Use reports when you need a dated snapshot or export."
        ),
        shot("Stock Balance", "09-stock-balance-live.png"),

        h2("3.9 Item Master"),
        p(
          "Item Master maintains the catalog used on documents and reports (codes, descriptions, UOM, packages, prices, and related options). Change master data carefully — wrong UOM or stock type settings affect every document that uses the item."
        ),
        step(1, "Open Item Master → Create New or open an existing item."),
        step(2, "Enter description, classification, UOM, and prices as required → Save."),
        shot("Item Master list", "12-item-master-list.png"),
        shot("Item Master form", "13-item-master-form.png"),

        // ===== 4 =====
        h1("4. Purchase Requisition (PR)"),
        p(
          "Use PR when a site requests stock. Choosing a supplier (or HQ) when you create the PR does not move stock by itself and does not create a GTI. Stock only moves after the correct approve / receive steps below."
        ),

        h2("4.1 Outlet — create and post"),
        step(1, "Create PR → select who to request from (HQ, or another supplier)."),
        step(2, "Add items and quantities → Save, then Post when ready for review."),
        shot("PR form", "21-form-pr.png"),
        shot("PR list", "10-pr-list.png"),

        h2("4.2 HQ — approve or reject"),
        p(
          "An HQ user logs in as the HQ outlet (DRAGON HEALTH HQ) to review Posted PRs. Approve or Reject after checking lines and approved quantities."
        ),
        step(1, "Log in as DRAGON HEALTH HQ (or your company HQ outlet)."),
        step(2, "Open a Posted PR → review lines."),
        step(3, "Approve or Reject."),
        shot("PR screen", "11-pr-approval.png"),

        h2("4.3 When a GTI is created"),
        bullet("GTI is created only when HQ Approves and the PR Request To is HQ."),
        bullet("An Open GTI then appears at the requesting outlet — open it, confirm lines, and Post to receive stock."),
        bullet("If the PR was requested from another supplier (not HQ), Approve does not create a GTI."),

        // ===== 5 =====
        h1("5. Reports"),
        p(
          "Open Reports from the sidebar. Set filters (dates, item, brand, and so on) → Generate → review on screen → export if your company uses Excel/PDF export."
        ),
        bullet("Stock Balance Report — on-hand for a date / filters."),
        bullet("Stock Movement Report — stock in and out over a period."),
        bullet("Replenishment Report — items at or below reorder level."),
        shot("Report filters", "14-report-stock-balance.png"),

        // ===== 6 =====
        h1("6. Settings"),
        p(
          "Administrators use Settings to turn menu access on or off for each user. Select the user, set access for the menus they need, then save. Users only see menus they are allowed to open."
        ),
        shot("Settings", "15-settings.png"),

        spacer(200),
        p("— End of User Manual —", {
          italics: true,
          color: "64748B",
          size: 20,
          align: AlignmentType.CENTER,
          after: 40,
        }),
      ],
    },
  ],
});

fs.mkdirSync(docsDir, { recursive: true });
const buffer = await Packer.toBuffer(doc);
let writtenPath = outPath;
try {
  fs.writeFileSync(outPath, buffer);
  console.log("Wrote:", outPath);
} catch (err) {
  if (err.code === "EBUSY" || err.code === "EPERM") {
    fs.writeFileSync(fallbackPath, buffer);
    writtenPath = fallbackPath;
    console.log("Primary file locked — wrote:", fallbackPath);
  } else {
    throw err;
  }
}
for (const obsolete of obsoleteDocs) {
  if (obsolete === writtenPath) continue;
  try {
    if (fs.existsSync(obsolete)) {
      fs.unlinkSync(obsolete);
      console.log("Removed:", obsolete);
    }
  } catch (err) {
    console.log("Could not remove (close if open):", obsolete, err.code || err.message);
  }
}
console.log("Bytes:", buffer.length);
