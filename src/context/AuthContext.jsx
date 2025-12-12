import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  
  // 'loading' solo controla la verificación INICIAL de sesión al abrir la app.
  // No debe usarse para las peticiones de login manuales.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("app_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Error al leer usuario guardado", e);
        localStorage.removeItem("app_user");
      }
    }
    setLoading(false);
  }, []);

  // --- 1. LOGIN ---
  const login = async (email, password) => {
    // ¡IMPORTANTE!: No hacemos setLoading(true) aquí para no desmontar la vista.
    try {
      console.log("Intentando login con:", email); // Debug
      
      const { data, error } = await supabase
        .from("integrantes")
        .select("*")
        .ilike("mail", email) // Verifica que tu columna en Supabase sea 'mail' y no 'email'
        .eq("clave_acceso", password)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUser(data);
        localStorage.setItem("app_user", JSON.stringify(data));
        return { success: true };
      } else {
        return {
          success: false,
          error: "Credenciales incorrectas o usuario no habilitado.",
        };
      }
    } catch (err) {
      console.error("Login error:", err);
      return { success: false, error: err.message };
    }
  };

  // --- 2. RECUPERAR CONTRASEÑA ---
  const recoverPassword = async (email) => {
    try {
      const { data: userFound, error: searchError } = await supabase
        .from("integrantes")
        .select("id, nombre, apellido")
        .ilike("mail", email)
        .maybeSingle();

      if (searchError) throw searchError;
      if (!userFound) {
        return { success: false, error: "No existe un usuario con ese email." };
      }

      const tempPass = Math.random().toString(36).slice(-6).toUpperCase();

      const { error: updateError } = await supabase
        .from("integrantes")
        .update({ clave_acceso: tempPass })
        .eq("id", userFound.id);

      if (updateError) throw updateError;

      return { success: true, tempPass: tempPass, userName: userFound.nombre };

    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // --- 3. CAMBIAR CONTRASEÑA ---
  const changePassword = async (email, oldPassword, newPassword) => {
    try {
        if(newPassword.length < 4) return { success: false, error: "La nueva clave es muy corta." };

        const { data: userFound, error: authError } = await supabase
            .from("integrantes")
            .select("id")
            .ilike("mail", email)
            .eq("clave_acceso", oldPassword)
            .maybeSingle();
        
        if (authError) throw authError;
        if (!userFound) return { success: false, error: "El email o la contraseña actual no coinciden." };

        const { error: updateError } = await supabase
            .from("integrantes")
            .update({ clave_acceso: newPassword })
            .eq("id", userFound.id);

        if (updateError) throw updateError;

        return { success: true };

    } catch (err) {
        return { success: false, error: err.message };
    }
  };

  const logout = () => {
    localStorage.removeItem("app_user");
    setUser(null);
    // Recargar página para limpiar estados
    window.location.reload();
  };

  const value = {
    user,
    loading,
    login,
    logout,
    recoverPassword,
    changePassword,
    isAdmin: user?.rol_sistema === "admin",
    isEditor: user?.rol_sistema === "editor" || user?.rol_sistema === "admin",
    isGeneral: user?.rol_sistema === "consulta_general",
    userName: user ? `${user.nombre} ${user.apellido}` : "",
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);