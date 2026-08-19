/** Sembrar contraseña de Entradas con integrantes.clave_acceso (usuarios OFRN). */

export const MIN_GOTRUE_PASSWORD_LENGTH = 6;
const ADMIN_EMAIL = "ofrn.archivo@gmail.com";

type AdminClient = {
  from: (table: string) => any;
  auth: {
    admin: {
      updateUserById: (
        id: string,
        attrs: Record<string, unknown>,
      ) => Promise<{ error: { message?: string } | null }>;
    };
  };
};

export type OfrnIntegranteRow = {
  nombre?: string | null;
  apellido?: string | null;
  clave_acceso?: string | null;
};

function normalizeEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

export async function lookupOfrnIntegranteForEntradas(
  admin: AdminClient,
  email: string,
): Promise<OfrnIntegranteRow | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const select = "nombre, apellido, mail, email_acceso, clave_acceso";
  const { data: byMail, error: mailErr } = await admin
    .from("integrantes")
    .select(select)
    .ilike("mail", normalized)
    .limit(5);
  if (mailErr) {
    console.error("[ofrnEntradasPassword] integrantes.mail:", mailErr.message);
  }
  const rows = Array.isArray(byMail) ? byMail : [];
  const withClave = rows.find((r) => String(r?.clave_acceso || "").trim().length > 0);
  if (withClave) return withClave;
  if (rows[0]) return rows[0];

  const { data: byAcceso, error: accesoErr } = await admin
    .from("integrantes")
    .select(select)
    .ilike("email_acceso", normalized)
    .limit(5);
  if (accesoErr) {
    console.error("[ofrnEntradasPassword] integrantes.email_acceso:", accesoErr.message);
  }
  const accesoRows = Array.isArray(byAcceso) ? byAcceso : [];
  return accesoRows.find((r) => String(r?.clave_acceso || "").trim().length > 0) || accesoRows[0] || null;
}

export async function verifyOfrnIntegranteCredentials(
  admin: AdminClient,
  email: string,
  password: string,
): Promise<OfrnIntegranteRow | null> {
  const integrante = await lookupOfrnIntegranteForEntradas(admin, email);
  if (!integrante) return null;
  if (String(integrante.clave_acceso || "") !== String(password || "")) return null;
  return integrante;
}

async function upsertProfileFromIntegrante(
  admin: AdminClient,
  userId: string,
  email: string,
  integrante: OfrnIntegranteRow,
  markPasswordSet: boolean,
): Promise<void> {
  const { data: existing, error: existingErr } = await admin
    .from("entrada_usuario")
    .select("id, nombre, apellido, password_set_at, rol")
    .eq("id", userId)
    .maybeSingle();
  if (existingErr) {
    console.error("[ofrnEntradasPassword] leer perfil:", existingErr.message);
    return;
  }

  const fromOfrnNombre = String(integrante?.nombre || "").trim();
  const fromOfrnApellido = String(integrante?.apellido || "").trim();
  const nombre = (existing?.nombre && existing.nombre !== "—")
    ? existing.nombre
    : (fromOfrnNombre || "—");
  const apellido = (existing?.apellido && existing.apellido !== "—")
    ? existing.apellido
    : (fromOfrnApellido || "—");
  const now = new Date().toISOString();

  if (!existing) {
    const row = {
      id: userId,
      email,
      nombre,
      apellido,
      rol: email === ADMIN_EMAIL ? "admin" : "personal",
      activo: true,
      ...(markPasswordSet ? { password_set_at: now } : {}),
    };
    const { error: insertErr } = await admin.from("entrada_usuario").insert(row);
    if (insertErr) {
      const { data: byEmail } = await admin
        .from("entrada_usuario")
        .select("id, password_set_at")
        .eq("email", email)
        .maybeSingle();
      if (byEmail?.id) {
        const patch: Record<string, unknown> = { nombre, apellido };
        if (markPasswordSet && !byEmail.password_set_at) patch.password_set_at = now;
        await admin.from("entrada_usuario").update(patch).eq("id", byEmail.id);
      } else {
        console.error("[ofrnEntradasPassword] insert perfil:", insertErr.message);
      }
    }
    return;
  }

  const patch: Record<string, unknown> = { nombre, apellido, email };
  if (markPasswordSet && !existing.password_set_at) {
    patch.password_set_at = now;
  }
  const { error: updateErr } = await admin.from("entrada_usuario").update(patch).eq("id", userId);
  if (updateErr) {
    console.error("[ofrnEntradasPassword] update perfil:", updateErr.message);
  }
}

/**
 * Si el mail es de un integrante OFRN y todavía no definió clave en Entradas,
 * copia `clave_acceso` a GoTrue y marca `password_set_at`.
 * No pisa una contraseña propia (`password_set_at` ya seteado).
 * No escribe `auth_password_plain` (el broker de magic link queda aparte).
 */
export async function applyOfrnDefaultPassword(
  admin: AdminClient,
  email: string,
  userId: string,
): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized || !userId) return;

  const integrante = await lookupOfrnIntegranteForEntradas(admin, normalized);
  if (!integrante) return;

  const { data: profile } = await admin
    .from("entrada_usuario")
    .select("password_set_at")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.password_set_at) {
    await upsertProfileFromIntegrante(admin, userId, normalized, integrante, false);
    return;
  }

  const clave = String(integrante.clave_acceso || "").trim();
  let applied = false;
  if (clave.length >= MIN_GOTRUE_PASSWORD_LENGTH) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: clave,
      email_confirm: true,
    });
    if (error) {
      console.error("[ofrnEntradasPassword] updateUserById:", error.message);
    } else {
      applied = true;
    }
  }

  await upsertProfileFromIntegrante(admin, userId, normalized, integrante, applied);
}
