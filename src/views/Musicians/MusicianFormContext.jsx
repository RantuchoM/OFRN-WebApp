import { createContext, useContext } from "react";

/**
 * Contexto con el retorno del hook useMusicianForm para que las secciones
 * del formulario (Personal, Documentación, Sistema, Acceso, Giras) accedan
 * a formData, handlers y estado sin recibir decenas de props.
 */
export const MusicianFormContext = createContext(null);

export function useMusicianFormContext() {
  const ctx = useContext(MusicianFormContext);
  if (!ctx) {
    throw new Error(
      "useMusicianFormContext must be used inside MusicianForm (within MusicianFormContext.Provider)"
    );
  }
  return ctx;
}
