import crack1 from "./glass-patterns/crack-1.png";
import crack2 from "./glass-patterns/crack-2.png";
import crack3 from "./glass-patterns/crack-3.png";
import crack4 from "./glass-patterns/crack-4.png";
import crack5 from "./glass-patterns/crack-5.png";
import crack6 from "./glass-patterns/crack-6.png";

/** Altura/ancho base del impacto en pantalla (px). Motivos cuadrados. */
export const GLASS_BASE_SIZE = 120;

export const GLASS_CRACK_PATTERNS = [
  { id: "crack-1", src: crack1, size: GLASS_BASE_SIZE },
  { id: "crack-2", src: crack2, size: GLASS_BASE_SIZE },
  { id: "crack-3", src: crack3, size: GLASS_BASE_SIZE },
  { id: "crack-4", src: crack4, size: GLASS_BASE_SIZE },
  { id: "crack-5", src: crack5, size: GLASS_BASE_SIZE },
  { id: "crack-6", src: crack6, size: GLASS_BASE_SIZE },
];

export const GLASS_PATTERN_COUNT = GLASS_CRACK_PATTERNS.length;
