import { supabase } from "../services/supabase";

/** Public VAPID (pareja en secrets Edge: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY). */
const DEFAULT_VAPID_PUBLIC =
  "BMIftERNIoqcdWUPzIcebfDQbUGVwUrBA7hJHtAK_fUlPAnFOwhDP7UeoR-9SAgB7tPCUY5gP2sb5Z0rK6ZeOp4";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function getVapidPublicKey() {
  return String(
    import.meta.env.VITE_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC || "",
  ).trim();
}

export function isWebPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Guarda suscripción Web Push del integrante (para cron T−10 / T+15).
 * Idempotente por endpoint.
 *
 * @param {number|string} integranteId
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function ensureWebPushSubscription(integranteId) {
  const vapid = getVapidPublicKey();
  if (!vapid) return { ok: false, reason: "no_vapid" };
  if (!integranteId || integranteId === "guest-general") {
    return { ok: false, reason: "no_integrante" };
  }
  if (!isWebPushSupported()) return { ok: false, reason: "unsupported" };

  let permission = Notification.permission;
  if (permission === "default") {
    try {
      permission = await Notification.requestPermission();
    } catch {
      return { ok: false, reason: "permission_error" };
    }
  }
  if (permission !== "granted") return { ok: false, reason: "denied" };

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
    }
    const json = sub.toJSON();
    const endpoint = json.endpoint;
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!endpoint || !p256dh || !auth) {
      return { ok: false, reason: "invalid_sub" };
    }

    const { data, error } = await supabase.rpc("web_push_subscribe", {
      p_integrante_id: Number(integranteId),
      p_endpoint: endpoint,
      p_p256dh: p256dh,
      p_auth: auth,
      p_user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : null,
    });

    if (error) throw error;
    if (data && data.ok === false) {
      return { ok: false, reason: data.reason || "rpc_failed" };
    }
    return { ok: true };
  } catch (e) {
    console.warn("ensureWebPushSubscription", e);
    return { ok: false, reason: e?.message || "error" };
  }
}
