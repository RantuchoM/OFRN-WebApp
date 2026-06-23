const HINT_STORAGE_KEY = "ofrn:pwa-orientation-hint-v2";

export function isAndroidStandalonePwa() {
  if (typeof window === "undefined") return false;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  return standalone && /Android/i.test(navigator.userAgent);
}

export function isLikelyAndroidTablet() {
  if (typeof window === "undefined") return false;
  const shortSide = Math.min(window.screen?.width ?? 0, window.screen?.height ?? 0);
  return shortSide >= 600;
}

/** WebAPK antiguo con portrait bloqueado: viewport vertical en pantalla ancha. */
export function isOrientationLikelyLocked() {
  if (!isAndroidStandalonePwa() || !isLikelyAndroidTablet()) return false;
  if (window.innerWidth >= window.innerHeight) return false;

  const longSide = Math.max(window.screen?.width ?? 0, window.screen?.height ?? 0);
  const shortSide = Math.min(window.screen?.width ?? 0, window.screen?.height ?? 0);
  return shortSide >= 600 && longSide / shortSide >= 1.25;
}

export function tryUnlockScreenOrientation() {
  try {
    window.screen?.orientation?.unlock?.();
  } catch {
    /* Bloqueado por WebAPK o SO */
  }
}

export function shouldShowPwaOrientationHint() {
  if (!isOrientationLikelyLocked()) return false;
  try {
    return localStorage.getItem(HINT_STORAGE_KEY) !== "1";
  } catch {
    return false;
  }
}

export function dismissPwaOrientationHint() {
  try {
    localStorage.setItem(HINT_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}
