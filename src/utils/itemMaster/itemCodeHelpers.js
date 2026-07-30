/** Legacy getItemcode / usage serviceCode helpers */

export function getItemcode(code) {
  if (!code) return code;
  return (String(code) + "0000").substring(0, 12);
}

export function getUsageServiceCode(controlNo) {
  if (!controlNo) return controlNo;
  return `${controlNo}0000`;
}
