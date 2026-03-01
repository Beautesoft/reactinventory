/**
 * Print utility for Stock Take List
 * Generates a printable format for manual stock taking
 */

/**
 * Generates and prints stock take list in a printable format
 * @param {Array} itemsToPrint - Array of items to print
 * @param {Object} userDetails - User/store details
 * @param {Function} toast - Toast notification function
 */
export const printStockTakeList = (itemsToPrint, userDetails, toast) => {
  if (!itemsToPrint || itemsToPrint.length === 0) {
    if (toast) toast.error("No items to print");
    return;
  }

  // Create print window
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    if (toast) toast.error("Please allow popups to print");
    return;
  }

  // Get current date
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Items per page
  const ITEMS_PER_PAGE = 25;
  const totalPages = Math.ceil(itemsToPrint.length / ITEMS_PER_PAGE);

  // Generate HTML content
  const htmlContent = generatePrintHTML(
    itemsToPrint,
    userDetails,
    currentDate,
    ITEMS_PER_PAGE,
    totalPages
  );

  // Write content and print
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      // Optionally close after printing (uncomment if needed)
      // printWindow.close();
    }, 250);
  };

  if (toast) toast.success(`Prepared ${itemsToPrint.length} items for printing`);
};

/**
 * Generates HTML content for printing
 * @param {Array} itemsToPrint - Items to print
 * @param {Object} userDetails - User/store details
 * @param {string} currentDate - Formatted current date
 * @param {number} itemsPerPage - Number of items per page
 * @param {number} totalPages - Total number of pages
 * @returns {string} HTML content string
 */
const generatePrintHTML = (
  itemsToPrint,
  userDetails,
  currentDate,
  itemsPerPage,
  totalPages
) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Stock Take List - ${currentDate}</title>
        <meta charset="utf-8">
        ${getPrintStyles()}
      </head>
      <body>
        ${Array.from({ length: totalPages }, (_, pageIndex) => {
          const startIndex = pageIndex * itemsPerPage;
          const endIndex = Math.min(
            startIndex + itemsPerPage,
            itemsToPrint.length
          );
          const pageItems = itemsToPrint.slice(startIndex, endIndex);
          const isLastPage = pageIndex === totalPages - 1;

          return generatePageHTML(
            pageItems,
            pageIndex,
            totalPages,
            userDetails,
            currentDate,
            itemsToPrint.length,
            isLastPage,
            pageIndex === 0,
            startIndex + 1,
            endIndex
          );
        }).join("")}
      </body>
    </html>
  `;
};

/**
 * Generates HTML for a single page
 */
const generatePageHTML = (
  pageItems,
  pageIndex,
  totalPages,
  userDetails,
  currentDate,
  totalItems,
  isLastPage,
  isFirstPage,
  startItemNumber,
  endItemNumber
) => {
  return `
    <div class="${!isLastPage ? "page-break" : ""}">
      ${
        isFirstPage
          ? `
        <div class="print-header">
          <h1>Stock Take List</h1>
          <div class="print-header-info">
            <p>${userDetails?.siteName || "Store"}</p>
          </div>
        </div>
      `
          : `
        <div class="print-info">
          <div>Stock Take List - ${userDetails?.siteName || "Store"}</div>
        </div>
      `
      }
      
      <table>
        <thead>
          <tr>
            <th class="sno">S.No</th>
            <th class="item-code">Item Code</th>
            <th class="description">Description</th>
            <th class="link-code">Link Code</th>
            <th class="qty-box">Qty</th>
            <th class="batch-box">Batch No</th>
          </tr>
        </thead>
        <tbody>
          ${pageItems
            .map(
              (item, idx) => `
            <tr>
              <td class="sno">${startItemNumber + idx}</td>
              <td class="item-code">${escapeHtml(item.stockCode || "-")}</td>
              <td class="description">${escapeHtml(item.stockName || "-")}</td>
              <td class="link-code">${escapeHtml(item.linkCode || "-")}</td>
              <td class="qty-box">
                <div class="empty-box"></div>
              </td>
              <td class="batch-box">
                <div class="empty-box"></div>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      
      ${
        isLastPage
          ? `
        <div class="print-footer">
          <p>--- End of List ---</p>
        </div>
      `
          : ""
      }
    </div>
  `;
};

/**
 * Returns CSS styles for print
 */
const getPrintStyles = () => {
  return `
    <style>
      @page {
        size: A4;
        margin: 10mm;
      }
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: Arial, sans-serif;
        font-size: 10pt;
        line-height: 1.3;
      }
      
      .print-header {
        text-align: center;
        margin-bottom: 6px;
        padding-bottom: 4px;
        border-bottom: 2px solid #000;
      }
      
      .print-header h1 {
        font-size: 16pt;
        font-weight: bold;
        margin-bottom: 2px;
      }
      
      .print-header-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 2px;
      }
      
      .print-header-info p {
        font-size: 9pt;
        margin: 2px 0;
      }
      
      .print-header-info .item-count {
        text-align: right;
      }
      
      .print-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
        font-size: 9pt;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 8px;
      }
      
      table th {
        background-color: #f0f0f0;
        border: 1px solid #000;
        padding: 4px 3px;
        font-weight: bold;
        text-align: left;
        font-size: 9pt;
      }
      
      table td {
        border: 1px solid #000;
        padding: 3px 3px;
        font-size: 9pt;
        vertical-align: middle;
      }
      
      .sno {
        width: 6%;
        text-align: center;
        font-weight: bold;
      }
      
      .item-code {
        width: 11%;
        font-weight: bold;
      }
      
      .description {
        width: 32%;
      }
      
      .link-code {
        width: 11%;
        text-align: center;
      }
      
      .qty-box {
        width: 9%;
        text-align: center;
      }
      
      .batch-box {
        width: 31%;
      }
      
      .empty-box {
        border: 1px solid #000;
        min-height: 18px;
        background-color: #fff;
      }
      
      .qty-box .empty-box {
        width: 100%;
        min-height: 18px;
      }
      
      .batch-box .empty-box {
        width: 100%;
        min-height: 18px;
      }
      
      .page-break {
        page-break-after: always;
        break-after: page;
      }
      
      .print-footer {
        margin-top: 10px;
        font-size: 8pt;
        text-align: center;
        color: #666;
      }
      
      @media print {
        .no-print {
          display: none;
        }
        
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
      }
    </style>
  `;
};

/**
 * Escapes HTML to prevent XSS
 */
const escapeHtml = (text) => {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
};
