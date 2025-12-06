{
type: created file
fileName: Gemini/src/utils/time.js
fullContent:
// Convierte Segundos (int) a Texto legible (Ej: 305 -> "5:05" o "1h 5m")
export const formatSecondsToTime = (seconds) => {
    if (!seconds && seconds !== 0) return "00:00";
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
  
    // Si hay horas, formato 1h 20m 30s
    if (h > 0) {
      return `${h}h ${m}m ${s > 0 ? s + 's' : ''}`;
    }
    // Si solo minutos, formato MM:SS para que sea más musical
    return `${m}:${s.toString().padStart(2, '0')}`;
};

// Convierte input de usuario (Texto) a Segundos (Int)
// Soporta: "5" (5 min), "5:30" (5 min 30 seg)
export const inputToSeconds = (input) => {
    if (!input) return 0;
    const str = input.toString().trim();

    if (str.includes(':')) {
        const [min, seg] = str.split(':').map(Number);
        return (min * 60) + (seg || 0);
    }

    if (!isNaN(str)) {
        // Asumimos que si pone un número entero son MINUTOS (ej: "5" -> 300s)
        // Si quisieras que fueran segundos, cambia esto.
        return parseInt(str) * 60;
    }

    return 0;
};