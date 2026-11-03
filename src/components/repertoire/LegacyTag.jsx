/**
 * Tag naranja reutilizable para apariciones de historial legacy.
 */
export default function LegacyTag({ className = "", size = "sm" }) {
  const sizeCls =
    size === "xs"
      ? "text-[8px] px-1 py-0.5"
      : "text-[9px] px-1.5 py-0.5";
  return (
    <span
      className={`inline-flex items-center rounded border border-orange-300 bg-orange-100 font-bold uppercase tracking-wide text-orange-800 leading-none ${sizeCls} ${className}`}
    >
      Legacy
    </span>
  );
}
