import React, { createContext, useContext, useState } from 'react';
import { manualService } from '../services/manualService';
import ManualModal from '../components/manual/ManualModal'; // OJO: Verifica si moviste el modal a views o components

const ManualContext = createContext();

export const useManual = () => {
  return useContext(ManualContext);
};

export const ManualProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentArticle, setCurrentArticle] = useState(null);
  
  // Nuevo estado para navegación
  const [navigation, setNavigation] = useState({ prev: null, next: null, parent: null });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const openManual = async (sectionKey) => {
    setIsOpen(true);
    setLoading(true);
    setError(null);
    // No reseteamos currentArticle a null inmediatamente para evitar parpadeos si ya había algo,
    // pero idealmente podrías limpiar si quieres un loading blanco.
    
    try {
      // 1. Obtener el artículo completo
      const data = await manualService.getBySectionKey(sectionKey);
      
      if (data) {
        setCurrentArticle(data);
        
        // 2. Obtener vecinos (Promesa paralela o secuencial rápida)
        // Lo hacemos en un try/catch silencioso para no bloquear la lectura si falla esto
        try {
           const navData = await manualService.getNavigationContext(data.id);
           setNavigation(navData || { prev: null, next: null, parent: null });
        } catch (navErr) {
           console.warn("Error calculando navegación", navErr);
        }

      } else {
        setError(`Sección no encontrada: ${sectionKey}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const closeManual = () => {
    setIsOpen(false);
    setCurrentArticle(null);
    setNavigation({ prev: null, next: null, parent: null });
  };

  // Función para navegar internamente (usada por los botones Siguiente/Anterior)
  const navigateTo = (sectionKey) => {
    openManual(sectionKey);
  };

  return (
    <ManualContext.Provider value={{ openManual, closeManual, navigateTo }}>
      {children}
      <ManualModal 
        isOpen={isOpen} 
        onClose={closeManual} 
        article={currentArticle} 
        navigation={navigation} // Pasamos la info nueva
        onNavigate={navigateTo} // Pasamos la función para cambiar
        loading={loading}
        error={error}
      />
    </ManualContext.Provider>
  );
};