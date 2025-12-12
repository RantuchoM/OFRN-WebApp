import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("app_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // --- 1. LOGIN ---
  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("integrantes")
        .select("*")
        .ilike("mail", email)
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
    } finally {
      setLoading(false);
    }
  };

  // --- 2. RECUPERAR CONTRASEÑA (Olvidé mi clave) ---
  const recoverPassword = async (email) => {
    setLoading(true);
    try {
      // 1. Verificar si el usuario existe
      const { data: userFound, error: searchError } = await supabase
        .from("integrantes")
        .select("id, nombre, apellido")
        .ilike("mail", email)
        .maybeSingle();

      if (searchError) throw searchError;
      if (!userFound) {
        // Por seguridad, a veces se prefiere no decir si existe o no, 
        // pero para uso interno diremos la verdad.
        return { success: false, error: "No existe un usuario con ese email." };
      }

      // 2. Generar contraseña temporal (6 caracteres alfanuméricos)
      const tempPass = Math.random().toString(36).slice(-6).toUpperCase();

      // 3. Actualizar en Base de Datos
      const { error: updateError } = await supabase
        .from("integrantes")
        .update({ clave_acceso: tempPass })
        .eq("id", userFound.id);

      if (updateError) throw updateError;

      // 4. RETORNAR LA CLAVE (Para simular el envío de mail en UI)
      // * En producción, aquí llamarías a una Edge Function para enviar el mail *
      return { success: true, tempPass: tempPass, userName: userFound.nombre };

    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // --- 3. CAMBIAR CONTRASEÑA (Desde Login o Perfil) ---
  const changePassword = async (email, oldPassword, newPassword) => {
    setLoading(true);
    try {
        if(newPassword.length < 4) return { success: false, error: "La nueva clave es muy corta." };

        // 1. Validar credenciales actuales (Email + Clave Vieja)
        const { data: userFound, error: authError } = await supabase
            .from("integrantes")
            .select("id")
            .ilike("mail", email)
            .eq("clave_acceso", oldPassword)
            .maybeSingle();
        
        if (authError) throw authError;
        if (!userFound) return { success: false, error: "El email o la contraseña actual no coinciden." };

        // 2. Actualizar clave
        const { error: updateError } = await supabase
            .from("integrantes")
            .update({ clave_acceso: newPassword })
            .eq("id", userFound.id);

        if (updateError) throw updateError;

        return { success: true };

    } catch (err) {
        return { success: false, error: err.message };
    } finally {
        setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("app_user");
    setUser(null);
    window.location.reload();
  };

  const value = {
    user,
    loading,
    login,
    logout,
    recoverPassword, // <--- Nueva
    changePassword,  // <--- Nueva
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