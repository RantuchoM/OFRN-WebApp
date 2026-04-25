/**
 * Crea un usuario en auth.users y su fila en public.scrn_perfiles (mismo id).
 * Cualquier usuario con sesión válida puede invocar (p. ej. al cargar a alguien
 * con mail nuevo en una reserva). Solo un admin puede marcar el nuevo perfil
 * con es_admin = true.
 * Si el email ya está en auth, reutiliza ese id e inserta scrn_perfiles si aún
 * no existe.
 * Requiere SUPABASE_SERVICE_ROLE_KEY en el entorno.
 * FK en DB: scrn_perfiles.id → auth.users(id) (ON DELETE CASCADE).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (obj: unknown, status: number) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Body = {
  email?: string;
  nombre?: string;
  apellido?: string;
  dni?: string;
  fecha_nacimiento?: string | null;
  cargo?: string | null;
  genero?: string | null;
  es_admin?: boolean;
};

type SupabaseServiceClient = ReturnType<typeof createClient>;

/** Busca id de auth.users por email (paginado; adecuado para instancias medianas). */
async function findUserIdByEmail(
  supabaseAdmin: SupabaseServiceClient,
  email: string,
): Promise<string | null> {
  const e = email.toLowerCase();
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error("listUsers:", error);
      return null;
    }
    const users = data?.users ?? [];
    const found = users.find((u) => (u.email || "").toLowerCase() === e);
    if (found?.id) return found.id;
    if (users.length < 200) break;
  }
  return null;
}

/** Texto completo del error (PostgREST a vece pone el detalle en `details` o propiedades anidadas). */
function errFullText(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return `${err.name} ${err.message}`;
  if (typeof err === "object") {
    const o = err as Record<string, unknown>;
    const parts: string[] = [];
    for (const k of ["message", "details", "hint", "code", "statusText", "name"]) {
      if (o[k] != null) parts.push(String(o[k]));
    }
    if (parts.length) return parts.join(" ");
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

/**
 * La FK a auth.users se evalúa en Postgres. Reintentar insert mientras el fallo
 * aparezca por esa FK.
 */
function isPostgresForeignKeyToAuthScrn(err: unknown) {
  if (err == null) return false;
  const t = errFullText(err).toLowerCase();
  if (err && typeof err === "object" && (err as { code?: string }).code === "23503") return true;
  if (t.includes("scrn_perfiles_id_fkey")) return true;
  if (t.includes("23503")) return true;
  if (t.includes("violate") && t.includes("foreign key")) return true;
  if (t.includes("foreign key") && t.includes("scrn_perfiles")) return true;
  if (t.includes("foreign key") && t.includes("auth.users")) return true;
  if (t.includes("key (id)=") && t.includes("is not present in table")) return true;
  return false;
}

/** Espera a que el uuid aparezca en auth.users (Postgres) vía RPC; si el RPC no existe, no falla. */
async function waitUntilAuthIdInPostgres(
  supabaseAdmin: SupabaseServiceClient,
  newId: string,
): Promise<{ ok: true } | { error: string }> {
  const max = 100;
  const delayMs = 200;
  for (let i = 0; i < max; i++) {
    const { data, error } = await supabaseAdmin.rpc("scrn_auth_user_id_in_db", { p_id: newId });
    if (error) {
      const em = (error.message || "") + (error.hint || "");
      if (
        /function\s+public\.scrn_auth_user_id_in_db|does not exist|42883|PGRST202/i.test(
          em,
        )
      ) {
        return { ok: true };
      }
      console.error("[create-scrn-perfil] scrn_auth_user_id_in_db", error);
      return { error: em || "Error comprobando auth.users" };
    }
    if (data === true) return { ok: true };
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return {
    error:
      "Tras 20s el uuid aún no figura en auth.users (Postgres) según scrn_auth_user_id_in_db. " +
      "Suele ser distinto project ref o credenciales de la edge vs. el front. " +
      "Revisá VITE_SUPABASE_URL y en Edge Functions / Secrets SUPABASE_URL + SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY del MISMO proyecto.",
  };
}

async function insertScrnPerfilWithRetry(
  supabaseAdmin: SupabaseServiceClient,
  row: Record<string, unknown>,
): Promise<{ error: { message: string; code?: string } | null }> {
  const max = 80;
  const delayMs = 200;
  for (let attempt = 0; attempt < max; attempt++) {
    const { error } = await supabaseAdmin.from("scrn_perfiles").insert(row);
    if (!error) return { error: null };
    if (!isPostgresForeignKeyToAuthScrn(error)) {
      return { error: error as { message: string; code?: string } };
    }
    console.warn(
      `[create-scrn-perfil] insert FK reintento ${attempt + 1}/${max}:`,
      errFullText(error),
    );
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return {
    error: {
      message:
        "Timeout: el INSERT en scrn_perfiles sigue chocando con el FK a auth.users. " +
        "En Supabase (mismo proyecto), ejecutá en SQL Editor: docs/transporte-scrn-perfil-auth-check-rpc.sql. " +
        "Comprobá además VITE_SUPABASE_URL / secrets de la edge con el mismo project ref que el front.",
    },
  };
}

function isDuplicateEmailError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("already been registered") ||
    m.includes("user already registered") ||
    m.includes("email address is already") ||
    m.includes("duplicate key") ||
    m.includes("unique constraint") ||
    m.includes("already exists")
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "Falta configuración del servidor" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "No autorizado" }, 401);
  }

  // En Edge, getUser() sin token no toma siempre el header; hace falta pasar el JWT.
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    return json({ error: "No autorizado" }, 401);
  }

  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const {
    data: { user: caller },
    error: userErr,
  } = await supabaseUser.auth.getUser(jwt);
  if (userErr || !caller) {
    return json(
      { error: userErr?.message || "Sesión inválida o token expirado" },
      401,
    );
  }

  const { data: callerPerfil, error: callerPerfilErr } = await supabaseUser
    .from("scrn_perfiles")
    .select("es_admin")
    .eq("id", caller.id)
    .maybeSingle();
  if (callerPerfilErr) {
    return json({ error: callerPerfilErr.message }, 500);
  }
  const callerIsAdmin = Boolean(callerPerfil?.es_admin);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const email = (body.email || "").trim().toLowerCase();
  const nombre = (body.nombre || "").trim();
  const apellido = (body.apellido || "").trim();
  const dniRaw = (body.dni || "").trim();
  /** null si no viene DNI: evita 'PENDIENTE' que suele chocar con CHECK de solo números en la DB */
  const dni = dniRaw === "" ? null : dniRaw;
  if (!email || !nombre || !apellido) {
    return json({ error: "Faltan email, nombre o apellido" }, 400);
  }

  const newEsAdmin = Boolean(body.es_admin) && callerIsAdmin;

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const password =
    (globalThis.crypto && "randomUUID" in globalThis.crypto
      ? crypto.randomUUID()
      : `${Date.now()}`) + "Aa1!";

  let newId: string | null = null;

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nombre,
      apellido,
      ...(dni ? { dni } : {}),
    },
  });

  if (createErr) {
    const msg = String(createErr.message || "");
    if (!isDuplicateEmailError(msg)) {
      return json({ error: msg || "No se pudo crear el usuario" }, 400);
    }
    const byEmail = await findUserIdByEmail(supabaseAdmin, email);
    if (!byEmail) {
      return json(
        { error: "Ese email ya está registrado pero no se pudo vincular el perfil. Reintentá o contactá soporte." },
        409,
      );
    }
    newId = byEmail;
  } else {
    newId = created?.user?.id ?? null;
  }

  if (!newId) {
    return json({ error: "No se recibió id de usuario tras crear la cuenta" }, 500);
  }

  const { data: existingPro, error: proFetchErr } = await supabaseAdmin
    .from("scrn_perfiles")
    .select("id")
    .eq("id", newId)
    .maybeSingle();

  if (proFetchErr) {
    return json({ error: proFetchErr.message }, 500);
  }

  if (existingPro) {
    return json({ ok: true, id: newId, alreadyExists: true }, 200);
  }

  const waitDb = await waitUntilAuthIdInPostgres(supabaseAdmin, newId);
  if ("error" in waitDb) {
    if (!createErr) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(newId);
      } catch {
        /* no-op */
      }
    }
    return json({ error: waitDb.error }, 503);
  }

  const row: Record<string, unknown> = {
    id: newId,
    nombre,
    apellido,
    dni,
    cargo: body.cargo?.trim() || null,
    genero: (body.genero || "-").trim() || "-",
    es_admin: newEsAdmin,
  };
  const fnRaw = body.fecha_nacimiento != null && String(body.fecha_nacimiento).trim() !== ""
    ? String(body.fecha_nacimiento).trim().slice(0, 10)
    : null;
  row.fecha_nacimiento = fnRaw;

  const { error: insErr } = await insertScrnPerfilWithRetry(supabaseAdmin, row);

  if (insErr) {
    if (!createErr) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(newId);
      } catch {
        /* no-op */
      }
    }
    const d = (insErr as { details?: string; hint?: string; code?: string }).details;
    const h = (insErr as { hint?: string }).hint;
    return json(
      {
        error: insErr.message || "No se pudo guardar el perfil",
        code: (insErr as { code?: string }).code,
        details: d,
        hint: h,
      },
      400,
    );
  }

  return json({ ok: true, id: newId, alreadyExists: false }, 200);
});
