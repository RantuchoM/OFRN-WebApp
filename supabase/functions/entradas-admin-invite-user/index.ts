/**
 * Pre-registra un usuario de Entradas (auth + entrada_usuario) antes del primer login OTP.
 * Solo admins de Entradas.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const VALID_ROLES = new Set(["personal", "recepcionista", "admin"]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    const parts = [e.message, e.details, e.hint, e.code].filter(
      (x) => typeof x === "string" && String(x).trim().length > 0,
    ) as string[];
    if (parts.length > 0) return parts.join(" — ");
    try {
      return JSON.stringify(error);
    } catch {
      /* ignore */
    }
  }
  return String(error);
}

type AdminClient = ReturnType<typeof createClient>;

async function findAuthUserIdByEmail(admin: AdminClient, email: string): Promise<string | null> {
  for (let page = 1; page <= 20; page += 1) {
    const { data: listed, error: listErr } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (listErr) throw new Error(`listUsers: ${listErr.message}`);
    const hit = (listed?.users || []).find((u) => normalizeEmail(u.email) === email);
    if (hit?.id) return hit.id;
    if ((listed?.users?.length || 0) < 1000) break;
  }
  return null;
}

async function ensureAuthUserForEmail(
  admin: AdminClient,
  email: string,
): Promise<string> {
  const { data: mappedUser, error: mappedErr } = await admin
    .from("entrada_auth_email_user")
    .select("user_id")
    .eq("email", email)
    .maybeSingle();
  if (mappedErr) throw new Error(`entrada_auth_email_user: ${mappedErr.message}`);
  if (mappedUser?.user_id) return String(mappedUser.user_id);

  const tempPassword = crypto.randomUUID().replace(/-/g, "");
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  let userId = created.user?.id || null;

  if (createErr) {
    const alreadyExists = /already been registered|already exists|duplicate/i.test(
      createErr.message,
    );
    if (!alreadyExists) {
      throw new Error(`No se pudo crear usuario auth para ${email}: ${createErr.message}`);
    }
    userId = await findAuthUserIdByEmail(admin, email);
    if (!userId) {
      throw new Error(`El mail ${email} ya existe en Auth pero no se pudo vincular.`);
    }
  }

  if (!userId) throw new Error("No se pudo obtener ID de usuario auth.");

  const { error: mapInsertErr } = await admin.from("entrada_auth_email_user").upsert(
    { email, user_id: userId, auth_password_plain: tempPassword },
    { onConflict: "email" },
  );
  if (mapInsertErr) throw new Error(`mapear usuario: ${mapInsertErr.message}`);

  return userId;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Config incompleta en el servidor.");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as {
      email?: string;
      nombre?: string;
      apellido?: string;
      rol?: string;
    };

    const email = normalizeEmail(body?.email);
    const nombre = String(body?.nombre || "").trim();
    const apellido = String(body?.apellido || "").trim();
    const rol = String(body?.rol || "recepcionista").trim().toLowerCase();

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "Email inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!nombre || !apellido) {
      return new Response(JSON.stringify({ error: "Nombre y apellido son obligatorios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!VALID_ROLES.has(rol)) {
      return new Response(JSON.stringify({ error: "Rol inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authErr,
    } = await supabaseUser.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Sesión inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: perfilAdmin, error: perfilErr } = await supabaseUser
      .from("entrada_usuario")
      .select("rol")
      .eq("id", user.id)
      .maybeSingle();
    if (perfilErr) throw perfilErr;
    if (perfilAdmin?.rol !== "admin") {
      return new Response(JSON.stringify({ error: "Solo administradores pueden pre-registrar usuarios." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: existingByEmail, error: existingErr } = await admin
      .from("entrada_usuario")
      .select("id, email, rol, nombre, apellido")
      .eq("email", email)
      .maybeSingle();
    if (existingErr) throw new Error(existingErr.message);

    let userId = existingByEmail?.id ? String(existingByEmail.id) : "";
    let created = false;

    if (!userId) {
      userId = await ensureAuthUserForEmail(admin, email);
      created = true;
    }

    const { data: upserted, error: upsertErr } = await admin
      .from("entrada_usuario")
      .upsert(
        {
          id: userId,
          email,
          nombre,
          apellido,
          rol,
          activo: true,
        },
        { onConflict: "id" },
      )
      .select("id, email, nombre, apellido, rol, activo")
      .single();
    if (upsertErr) throw new Error(upsertErr.message);

    return new Response(
      JSON.stringify({
        success: true,
        created,
        updated: !created,
        usuario: upserted,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const message = formatError(error);
    console.error("[entradas-admin-invite-user] ERROR:", message, error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
