/**
 * Parse voucher number input — supports comma-separated values and ranges (e.g. V001-V010).
 * Legacy: EditItem.parseVoucherNumbers
 */
export function parseVoucherNumbers(voucherString) {
  if (!voucherString || typeof voucherString !== "string") return [];
  const result = [];
  const vouchers = voucherString.split(",").map((v) => v.trim()).filter(Boolean);

  for (const voucher of vouchers) {
    if (voucher.includes("-")) {
      const [start, end] = voucher.split("-");
      const prefixMatch = start.match(/^(\D*)(\d+)$/);
      const endMatch = end.match(/^(\D*)(\d+)$/);

      if (prefixMatch && endMatch) {
        const prefixStart = prefixMatch[1];
        const numberStart = prefixMatch[2];
        const prefixEnd = endMatch[1];
        const numberEnd = endMatch[2];

        if (prefixStart !== prefixEnd) {
          throw new Error(`Mismatched prefixes: ${prefixStart} vs ${prefixEnd}`);
        }

        const startNum = parseInt(numberStart, 10);
        const endNum = parseInt(numberEnd, 10);
        const numberLength = numberStart.length;

        for (let i = startNum; i <= endNum; i++) {
          result.push(prefixStart + i.toString().padStart(numberLength, "0"));
        }
      } else {
        result.push(voucher);
      }
    } else {
      result.push(voucher);
    }
  }

  return result;
}
