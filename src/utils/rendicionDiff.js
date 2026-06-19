function safeNum(v) {
  const n = parseFloat(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Diferencia rendición vs anticipo: positivo = reintegro, negativo = devolución. */
export function calcDevolucionReintegro(ant, rend) {
  const diff = safeNum(rend) - safeNum(ant);
  return {
    dev: diff < 0 ? Math.abs(diff) : 0,
    reint: diff > 0 ? diff : 0,
  };
}

/** Valores para PDF/Excel: la columna sin saldo siempre muestra $0,00 (o "0" editable). */
export function calcDevolucionReintegroForExport(
  ant,
  rend,
  keepEditable = false,
  fmtMoney,
) {
  const { dev, reint } = calcDevolucionReintegro(ant, rend);
  const raw = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return keepEditable ? "0" : fmtMoney(0);
    return String(num);
  };
  const zero = keepEditable ? "0" : fmtMoney(0);
  return {
    dev: dev > 0 ? (keepEditable ? raw(dev) : fmtMoney(dev)) : zero,
    reint: reint > 0 ? (keepEditable ? raw(reint) : fmtMoney(reint)) : zero,
  };
}

export function formatRendicionDiffUi(value) {
  const n = safeNum(value);
  return `$ ${n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
