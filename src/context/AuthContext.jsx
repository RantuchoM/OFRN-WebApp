import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Ahora 'user' es el registro de la tabla integrantes
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Al iniciar, buscamos si hay un usuario guardado en el navegador
    const storedUser = localStorage.getItem("app_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      // CONSULTA DIRECTA A TU TABLA
      const { data, error } = await supabase
        .from("integrantes")
        .select("*")
        .ilike("mail", email) // ilike ignora mayúsculas/minúsculas
        .eq("clave_acceso", password) // Compara contraseña directa
        .maybeSingle();
      console.log("Resultado Supabase:", { data, error }); // <--- MIRA ESTO EN LA CONSOLA (F12)
      if (error) throw error;

      if (data) {
        // LOGIN EXITOSO
        setUser(data);
        localStorage.setItem("app_user", JSON.stringify(data)); // Guardar sesión
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
    // Helpers de roles basados en tu columna 'rol_sistema'
    isAdmin: user?.rol_sistema === "admin",
    isEditor: user?.rol_sistema === "editor" || user?.rol_sistema === "admin",
    isGeneral: user?.rol_sistema === "consulta_general",
    // El nombre para mostrar en la UI
    userName: user ? `${user.nombre} ${user.apellido}` : "",
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
