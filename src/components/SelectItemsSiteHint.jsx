/**
 * Site context for the Select Items section (search, filters, stock list).
 * Shown under the card title so it applies to the whole picker, not only on-hand qty.
 */
export default function SelectItemsSiteHint({
  siteName = "",
  prefix = "Showing items for:",
  className = "",
}) {
  if (!siteName) return null;

  return (
    <p className={`text-sm text-slate-600 ml-4 -mt-1 ${className}`.trim()}>
      {prefix}{" "}
      <span className="font-medium text-slate-800">{siteName}</span>
    </p>
  );
}
