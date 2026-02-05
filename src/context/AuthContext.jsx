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
  // Normalizamos el rol para comparaciones seguras
  const role = activeUser?.rol_sistema?.toLowerCase().trim() || "";

  const impersonate = (targetUser) => setImpersonatedUser(targetUser);
  const stopImpersonating = () => setImpersonatedUser(null);

  // Login normal (con credenciales de la tabla integrantes)
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

  // --- NUEVA FUNCIÓN PARA INVITADOS ---
  // Permite iniciar sesión sin contraseña si el token fue validado externamente
  const loginAsGuest = (guestUserData) => {
    // Inyectamos el usuario directamente al estado
    setRealUser(guestUserData);
    // Persistimos en localStorage para que no se pierda al recargar la página
    localStorage.setItem("app_user", JSON.stringify(guestUserData));
  };

  const logout = () => {
    localStorage.removeItem("app_user");
    setRealUser(null);
    setImpersonatedUser(null);
    // Forzamos recarga para limpiar estados de memoria
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
    loginAsGuest, // <--- Exportamos la nueva función
    logout,
    // --- LÓGICA DE PERMISOS CENTRALIZADA (Case Insensitive) ---
    isAdmin: role === "admin",
    isEditor: ["admin", "editor"].includes(role),
    isManagement: [
      "admin",
      "editor",
      "coord_general",
      "produccion_general",
      "director",
    ].includes(role),
    isPersonal: [
      "musico",
      "archivista",
      "personal",
      "consulta_personal",
    ].includes(role),
    isGuest:
      role === "invitado" ||
      role === "consulta_personal" ||
      activeUser?.id === "guest-general",
    // Esta es la única que siempre mira al usuario real
    isActuallyAdmin: realUser?.rol_sistema?.toLowerCase().trim() === "admin",
    userName: activeUser ? `${activeUser.nombre} ${activeUser.apellido}` : "",
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);