import moment from "moment-timezone";
import { roundMoney } from "@/utils/uomDecimalQty";

const getApprovedQty = (item) => {
  if (item.reqAppqty != null && item.reqAppqty !== "") {
    return parseFloat(item.reqAppqty) || 0;
  }
  return parseFloat(item.reqdQty) || 0;
};

const convertDateToISO = (dateStr) => {
  if (!dateStr || dateStr.trim() === "") return "";

  try {
    if (dateStr.includes("T") || dateStr.includes("Z")) {
      return dateStr;
    }

    const parsedDate = moment(dateStr);
    if (parsedDate.isValid()) {
      return parsedDate.toISOString();
    }

    const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      const parsed = moment(dateMatch[1]);
      if (parsed.isValid()) {
        return parsed.toISOString();
      }
    }

    return dateStr;
  } catch {
    return dateStr;
  }
};

export const calculateTransferTotals = (lineItems) => {
  const transferLineItems = lineItems.filter((item) => getApprovedQty(item) > 0);

  const totals = transferLineItems.reduce(
    (acc, item) => {
      const approvedQty = getApprovedQty(item);
      const price = roundMoney(item.reqdItemprice || item.reqdPrice || 0);
      const discPer = roundMoney(item.reqdDiscper || 0);
      const discAmt = roundMoney((approvedQty * price * discPer) / 100);
      return {
        totalQty: acc.totalQty + approvedQty,
        totalFoc: acc.totalFoc + Number(item.reqdFocqty || 0),
        totalDisc: acc.totalDisc + discAmt,
        totalAmt: acc.totalAmt + roundMoney(approvedQty * price - discAmt),
      };
    },
    { totalQty: 0, totalFoc: 0, totalDisc: 0, totalAmt: 0 }
  );

  totals.totalDisc = roundMoney(totals.totalDisc);
  totals.totalAmt = roundMoney(totals.totalAmt);

  return { transferLineItems, totals };
};

export const buildTransferLineDetails = (prData, lineItems, docNo, movCode, movType) => {
  const { transferLineItems } = calculateTransferTotals(lineItems);
  const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");

  return transferLineItems.map((item, index) => {
    const approvedQty = getApprovedQty(item);
    const focQty = parseFloat(item.reqdFocqty || 0);
    const totalQty = approvedQty + focQty;
    const price = roundMoney(item.reqdItemprice || item.reqdPrice || 0);
    const discPer = roundMoney(item.reqdDiscper || 0);
    const discAmt = roundMoney((approvedQty * price * discPer) / 100);
    const amount = roundMoney(approvedQty * price - discAmt);

    const itemRemark1Raw = item.itemRemark1 || item.ordMemo1 || "fefo";
    let transferType = "fefo";
    let extractedUOM = null;

    if (itemRemark1Raw.includes("-")) {
      const parts = itemRemark1Raw.split("-");
      transferType = parts[0].toLowerCase();
      extractedUOM = parts.slice(1).join("-");
    } else {
      transferType = itemRemark1Raw.toLowerCase();
    }

    const docUom = extractedUOM || item.docUom || item.uom;
    if (!docUom) {
      throw new Error(
        `Cannot determine the UOM for item ${item.reqdItemcode} on ${prData.reqNo}. ` +
          `Re-save the PR line with its UOM before approving.`
      );
    }

    const batchBreakdownStr = item.itemRemark2 || item.ordMemo2 || "";
    const noBatchMatch = batchBreakdownStr.match(/NOBATCH:(\d+)/i);
    const noBatchQty = noBatchMatch ? String(noBatchMatch[1]) : "0";

    const cleanBatchBreakdownStr = batchBreakdownStr
      .split(",")
      .filter((pair) => {
        const trimmed = pair.trim();
        return trimmed && !trimmed.toUpperCase().startsWith("NOBATCH:");
      })
      .join(",");

    const ordMemo4Source = item.ordMemo4 || "";
    const docExpdateSource = item.docExpdate || "";
    let recQtyFields = { recQty1: 0, recQty2: 0, recQty3: 0, recQty4: 0, recQty5: 0 };
    let ordMemo4Str = "";

    if (cleanBatchBreakdownStr && transferType === "specific") {
      const batchPairs = cleanBatchBreakdownStr.split(",").filter(Boolean);
      const expDateSource = ordMemo4Source || docExpdateSource;
      const expDatePairs = expDateSource ? expDateSource.split(",").filter(Boolean) : [];

      const ordMemo4Parts = batchPairs.map((pair, idx) => {
        const [, qty] = pair.split(":");
        const qtyNum = parseFloat(qty) || 0;

        let expDate = "";
        if (expDatePairs[idx]) {
          const expDatePair = expDatePairs[idx];
          const lastColonIndex = expDatePair.lastIndexOf(":");
          if (lastColonIndex > 0) {
            expDate = convertDateToISO(expDatePair.substring(0, lastColonIndex).trim());
          } else {
            expDate = convertDateToISO(expDatePair.trim());
          }
        }

        if (idx < 4) {
          recQtyFields[`recQty${idx + 1}`] = qtyNum;
        }

        return `${expDate}:${qtyNum}`;
      });

      ordMemo4Str = ordMemo4Parts.join(",");
      recQtyFields.recQty5 = parseFloat(noBatchQty) || 0;
    } else if (ordMemo4Source) {
      ordMemo4Str = ordMemo4Source;
    } else if (docExpdateSource) {
      try {
        const formattedParts = docExpdateSource.split(",").map((part) => {
          const lastColonIndex = part.lastIndexOf(":");
          if (lastColonIndex > 0) {
            const datePart = part.substring(0, lastColonIndex).trim();
            const qtyPart = part.substring(lastColonIndex + 1);
            return `${convertDateToISO(datePart)}:${qtyPart}`;
          }
          return convertDateToISO(part.trim());
        });
        ordMemo4Str = formattedParts.join(",");
      } catch {
        ordMemo4Str = docExpdateSource;
      }
    }

    const formattedPrice = roundMoney(price);
    const formattedDiscPer = roundMoney(discPer);
    const formattedDiscAmt = roundMoney(discAmt);
    const formattedAmount = roundMoney(amount);

    return {
      docNo,
      movCode,
      movType,
      docLineno: index + 1,
      docDate: moment().format("YYYY-MM-DD"),
      createDate: moment().format("YYYY-MM-DD"),
      itemcode: item.reqdItemcode,
      itemdesc: item.reqdItemdesc,
      docQty: approvedQty,
      docFocqty: focQty,
      docTtlqty: totalQty,
      docPrice: formattedPrice,
      docPdisc: formattedDiscPer,
      docDisc: formattedDiscAmt,
      docAmt: formattedAmount,
      ...recQtyFields,
      recTtl: totalQty,
      postedQty: 0,
      cancelQty: 0,
      createUser: userDetails?.username || "SYSTEM",
      docUom,
      docExpdate: "",
      docBatchNo: item.docBatchNo || "",
      itmBrand: item.brandcode || "",
      itmRange: "",
      itmBrandDesc: item.brandname || "",
      itmRangeDesc: "",
      DOCUOMDesc: item.DOCUOMDesc || "",
      itemRemark: item.itemRemark || "",
      docMdisc: 0,
      itemprice: formattedPrice,
      ordMemo1: transferType,
      ordMemo2: cleanBatchBreakdownStr,
      ordMemo3: noBatchQty,
      ordMemo4: ordMemo4Str,
    };
  });
};

export const buildTransferHeader = (prData, options) => {
  const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
  const hqSiteCode = userDetails?.HQSiteCode || userDetails?.siteCode || "HQ";
  const requestingSiteCode = prData.itemsiteCode;
  const {
    docNo,
    movCode,
    movType,
    storeNo,
    docRef1,
    docRef2 = "",
    docRemk1,
    docStatus = "0",
    postDate = "",
    totals,
  } = options;

  return {
    docNo,
    movCode,
    movType,
    storeNo,
    fstoreNo: hqSiteCode,
    tstoreNo: requestingSiteCode,
    docRef1,
    docRef2,
    docDate: moment().format("YYYY-MM-DD"),
    postDate,
    docStatus,
    docQty: totals.totalQty,
    docAmt: totals.totalAmt,
    docAttn: prData.reqAttn || "",
    docRemk1,
    staffNo: userDetails?.usercode || userDetails?.username || "SYSTEM",
    bname: prData.reqBname || "",
    baddr1: prData.reqBaddr1 || "",
    baddr2: prData.reqBaddr2 || "",
    baddr3: prData.reqBaddr3 || "",
    bpostcode: prData.reqBpostcode || "",
    daddr1: prData.reqDaddr1 || "",
    daddr2: prData.reqDaddr2 || "",
    daddr3: prData.reqDaddr3 || "",
    dpostcode: prData.reqDpostcode || "",
    createUser: userDetails?.username || "SYSTEM",
    createDate: new Date().toISOString(),
  };
};
