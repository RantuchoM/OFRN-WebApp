import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [realUser, setRealUser] = useState(null);
  const [impersonatedUser, setImpersonatedUser] = useState(null);
  // Lista de roles seleccionados explícitamente (filtro). Si está vacía o null, se usan todos los roles reales.
  const [roleFilter, setRoleFilter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("app_user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setRealUser(parsed);
        const realId = parsed?.id;
        if (realId) {
          const storedPref = localStorage.getItem(`pref_roles_${realId}`);
          if (storedPref) {
            try {
              const parsedPref = JSON.parse(storedPref);
              if (Array.isArray(parsedPref)) {
                setRoleFilter(
                  parsedPref
                    .map((r) => String(r).toLowerCase().trim())
                    .filter(Boolean),
                );
              } else if (typeof parsedPref === "string") {
                const v = parsedPref.toLowerCase().trim();
                setRoleFilter(v ? [v] : null);
              }
            } catch {
              // Backwards compat (valor simple)
              const v = String(storedPref).toLowerCase().trim();
              setRoleFilter(v ? [v] : null);
            }
          }
        }
      } catch (e) {
        localStorage.removeItem("app_user");
      }
    }
    setLoading(false);
  }, []);

  const activeUser = impersonatedUser || realUser;

  // Normalizar rol_sistema REAL del usuario: puede ser string (legacy) o array (multi-rol)
  const rawRoles = activeUser?.rol_sistema;
  const realRoles = (() => {
    if (rawRoles == null) return [];
    if (Array.isArray(rawRoles))
      return rawRoles
        .map((r) => String(r).toLowerCase().trim())
        .filter(Boolean);
    return [String(rawRoles).toLowerCase().trim()].filter(Boolean);
  })();

  // Aplicar filtro de roles: si hay uno o más seleccionados, solo esos cuentan para la app.
  const roles = (() => {
    if (!roleFilter || roleFilter.length === 0) return realRoles;
    return realRoles.filter((r) => roleFilter.includes(r));
  })();

  // Rol actualmente efectivo (para vistas que esperan un solo rol)
  const currentRole = roles[0] ?? realRoles[0] ?? "";
  const role = currentRole; // Legacy: primer rol/rol efectivo para componentes que esperan un string

  const impersonate = (targetUser) => setImpersonatedUser(targetUser);
  const stopImpersonating = () => setImpersonatedUser(null);

  // Alternar inclusión de un rol en el filtro (se usa para atajos simples).
  const toggleSystemRole = (newRole) => {
    const normalized = String(newRole || "").toLowerCase().trim();
    if (!normalized || !realRoles.includes(normalized)) {
      // Si el rol no es válido, limpiamos el filtro (todos los roles reales).
      setRoleFilter(null);
      return;
    }
    setRoleFilter((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const exists = prevList.includes(normalized);
      const next = exists
        ? prevList.filter((r) => r !== normalized)
        : [...prevList, normalized];
      // Si después de alternar no queda ninguno seleccionado, volvemos a "todos"
      return next.length === 0 ? null : next;
    });
  };

  // Fijar lista explícita de roles efectivos (aplicada a toda la app).
  const setRoleFilterExplicit = (nextRoles) => {
    if (!nextRoles || nextRoles.length === 0) {
      setRoleFilter(null);
      return;
    }
    const normalized = nextRoles
      .map((r) => String(r).toLowerCase().trim())
      .filter((r) => realRoles.includes(r));
    setRoleFilter(normalized.length === 0 ? null : normalized);
  };

  // Guardar selección actual (o una pasada) como predeterminada (multi-rol).
  const setDefaultRole = (selectedRoles) => {
    const realId = realUser?.id;
    if (!realId) return;
    const base = Array.isArray(selectedRoles) ? selectedRoles : roleFilter;
    const toPersist =
      !base || base.length === 0
        ? null
        : base
            .map((r) => String(r).toLowerCase().trim())
            .filter((r) => realRoles.includes(r));
    if (!toPersist) {
      localStorage.removeItem(`pref_roles_${realId}`);
      return;
    }
    localStorage.setItem(`pref_roles_${realId}`, JSON.stringify(toPersist));
  };

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
    role, // Legacy: rol efectivo actual
    roles, // Array de roles EFECTIVOS (tras aplicar filtro)
    availableRoles: realRoles, // Lista de roles REALES disponibles para seleccionar
    currentRole,
    toggleSystemRole,
    setRoleFilterExplicit,
    setDefaultRole,
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