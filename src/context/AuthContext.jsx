import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [realUser, setRealUser] = useState(null);
  const [impersonatedUser, setImpersonatedUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("app_user");
    if (storedUser) {
      try {
        setRealUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("app_user");
      }
    }
    setLoading(false);
  }, []);

  const activeUser = impersonatedUser || realUser;

  // Normalizar rol_sistema: puede ser string (legacy) o array (multi-rol)
  const rawRoles = activeUser?.rol_sistema;
  const roles = (() => {
    if (rawRoles == null) return [];
    if (Array.isArray(rawRoles)) return rawRoles.map((r) => String(r).toLowerCase().trim()).filter(Boolean);
    return [String(rawRoles).toLowerCase().trim()].filter(Boolean);
  })();
  const role = roles[0] ?? ""; // Legacy: primer rol para componentes que esperan un string

  const impersonate = (targetUser) => setImpersonatedUser(targetUser);
  const stopImpersonating = () => setImpersonatedUser(null);

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase
        .from("integrantes")
        .select("*")
        .ilike("mail", email)
        .eq("clave_acceso", password)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setRealUser(data);
        localStorage.setItem("app_user", JSON.stringify(data));
        return { success: true };
      }
      return { success: false, error: "Credenciales incorrectas." };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const loginAsGuest = (guestUserData) => {
    setRealUser(guestUserData);
    localStorage.setItem("app_user", JSON.stringify(guestUserData));
  };

  const logout = () => {
    localStorage.removeItem("app_user");
    setRealUser(null);
    setImpersonatedUser(null);
    window.location.href = "/login"; 
  };

  const value = {
    user: activeUser,
    realUser,
    isImpersonating: !!impersonatedUser,
    impersonate,
    stopImpersonating,
    loading,
    login,
    loginAsGuest,
    logout,
    // --- LÓGICA DE PERMISOS (multi-rol: flags por includes) ---
    isAdmin: roles.includes("admin"),
    isDifusion: roles.includes("difusion"),
    // Rol técnico: acceso a eventos técnicos y logística, pero fuera de Management/Editor
    isTechnician: roles.includes("tecnico"),
    // Rol específico de curaduría de repertorio (acceso global a programación de repertorio por ensamble)
    isCurador: roles.includes("curador"),
    // Editor global de datos: incluye admin, editor y curador
    isEditor: roles.some((r) => ["admin", "editor", "curador"].includes(r)),
    // Vista de gestión general (agenda, ensembles, repertorio por ensamble, etc.)
    isManagement: roles.some((r) =>
      ["admin", "editor", "curador", "coord_general", "consulta_general", "produccion_general", "director"].includes(r)
    ),
    isPersonal: roles.some((r) => ["musico", "archivista", "personal", "consulta_personal"].includes(r)),
    isGuest: roles.includes("invitado") || activeUser?.id === "guest-general",
    isArreglador: roles.includes("arreglador"),
    isArchivista: roles.includes("archivista"),
    isActuallyAdmin: (() => {
      const raw = realUser?.rol_sistema;
      if (raw == null) return false;
      const realRoles = Array.isArray(raw) ? raw.map((r) => String(r).toLowerCase().trim()) : [String(raw).toLowerCase().trim()];
      return realRoles.includes("admin");
    })(),
    role, // Legacy: primer rol (roles[0])
    roles, // Array normalizado para comprobaciones multi-rol
    userName: activeUser ? `${activeUser.nombre} ${activeUser.apellido}` : "",
    userId: activeUser?.id || null,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/** Formatea rol_sistema para mostrar (soporta string legacy o text[]) */
export function getRolesDisplay(rolSistema) {
  if (rolSistema == null) return "";
  return Array.isArray(rolSistema) ? rolSistema.join(", ") : String(rolSistema);
}