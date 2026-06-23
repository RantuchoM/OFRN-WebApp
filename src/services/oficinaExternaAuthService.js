import { supabaseOficinaExterna } from "./supabase";
import {
  requestEntradasEmailCode,
  verifyEntradasEmailCode,
  verifyEntradasMagicLink,
} from "./entradaService";

const SCRN_APP = "scrn";
const VIATICOS_APP = "viaticos_manual";

export async function getOficinaExternaSessionProfile() {
  const {
    data: { session },
  } = await supabaseOficinaExterna.auth.getSession();
  if (!session?.user) return { session: null, profile: null };

  const { data: profile, error } = await supabaseOficinaExterna
    .from("scrn_perfiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();
  if (error) throw error;

  return { session, profile: profile || null };
}

export async function ensureOficinaExternaProfile({
  nombre,
  apellido,
  dni = null,
  fecha_nacimiento = null,
  cargo = null,
  genero = null,
}) {
  const { data, error } = await supabaseOficinaExterna.rpc("scrn_ensure_profile", {
    p_nombre: nombre,
    p_apellido: apellido,
    p_dni: dni,
    p_fecha_nacimiento: fecha_nacimiento || null,
    p_cargo: cargo,
    p_genero: genero,
  });
  if (error) throw error;
  return data;
}

export async function requestOficinaExternaEmailCode(email, app = SCRN_APP) {
  return requestEntradasEmailCode(email, app);
}

export async function verifyOficinaExternaEmailCode({ email, code, app = SCRN_APP }) {
  return verifyEntradasEmailCode({ email, code, app });
}

export async function verifyOficinaExternaMagicLink({ token, app = SCRN_APP }) {
  return verifyEntradasMagicLink({ token, app });
}

export async function logoutOficinaExterna() {
  const { error } = await supabaseOficinaExterna.auth.signOut();
  if (error) throw error;
}

export { SCRN_APP, VIATICOS_APP, supabaseOficinaExterna };
