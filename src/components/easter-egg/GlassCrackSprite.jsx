/**
 * Motivo de grieta (PNG con fondo transparente).
 */
export default function GlassCrackSprite({ src, size, className = "" }) {
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt=""
      aria-hidden
      draggable={false}
      className={`block shrink-0 pointer-events-none opacity-[0.82] ${className}`}
      style={{
        filter: "drop-shadow(0 0 1px rgba(255, 255, 255, 0.35))",
      }}
    />
  );
}
