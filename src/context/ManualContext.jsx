import React, { createContext, useContext, useState, useEffect } from 'react';
import { manualService } from '../services/manualService';
import ManualModal from '../components/manual/ManualModal';
import { useAuth } from './AuthContext'; // Tu AuthContext que provee el 'user' de 'integrantes'

const ManualContext = createContext();

export const useManual = () => {
  return useContext(ManualContext);
};

export const ManualProvider = ({ children }) => {
  // Estado visual: Por defecto TRUE (Visible)
  const [showTriggers, setShowTriggers] = useState(true);
  
  const [isOpen, setIsOpen] = useState(false);
  const [currentArticle, setCurrentArticle] = useState(null);
  const [currentKey, setCurrentKey] = useState(null);
  const [navigation, setNavigation] = useState({ prev: null, next: null, breadcrumbs: [], children: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { user } = useAuth(); // Este user viene de la tabla 'integrantes'

  // --- 1. CARGAR PREFERENCIA AL INICIO ---
  useEffect(() => {
    if (user && user.id) {
      manualService.getUiSettings(user.id).then(settings => {
        if (settings) {
          // Si la DB dice "hide: true", entonces "show" es false
          setShowTriggers(!settings.hide_manual_triggers);
        }
      });
    }
  }, [user]);

  // --- 2. TOGGLE (INTERRUPTOR) ---
  const toggleVisibility = async () => {
    // Cambio optimista inmediato en la UI
    const newShowState = !showTriggers;
    setShowTriggers(newShowState); 
    
    if (user && user.id) {
      try {
        // Guardamos en DB el inverso (Si quiero verlos, hide=false)
        await manualService.toggleTriggersVisibility(user.id, !newShowState);
      } catch (e) {
        console.error("Error guardando preferencia", e);
        // Opcional: Revertir si falla
      }
    }
  };

  // ... (Resto de funciones openManual, closeManual igual que antes) ...
  const openManual = async (sectionKey) => {
      setIsOpen(true);
      setLoading(true);
      setError(null);
      setCurrentKey(sectionKey);
      try {
        const data = await manualService.getBySectionKey(sectionKey);
        if (data) {
            setCurrentArticle(data);
            manualService.getNavigationContext(data.id)
            .then(nav => setNavigation(nav || { prev: null, next: null, breadcrumbs: [], children: [] }))
            .catch(e => console.warn(e));
        } else {
            setCurrentArticle(null);
            setError(`Sección no encontrada`);
        }
      } catch (err) {
        setCurrentArticle(null);
        setError(err.message);
      } finally {
        setLoading(false);
      }
  };

  const closeManual = () => {
    setIsOpen(false);
    setCurrentArticle(null);
    setNavigation({ prev: null, next: null, breadcrumbs: [], children: [] });
  };

  const navigateTo = (sectionKey) => openManual(sectionKey);

  return (
    <ManualContext.Provider value={{ 
        openManual, 
        closeManual, 
        navigateTo, 
        showTriggers,      // <--- IMPORTANTE: Exponemos el estado
        toggleVisibility   // <--- IMPORTANTE: Exponemos la función
    }}>
      {children}
      <ManualModal 
        isOpen={isOpen} 
        onClose={closeManual} 
        article={currentArticle}
        currentKey={currentKey}
        navigation={navigation}
        onNavigate={navigateTo}
        loading={loading}
        error={error}
      />
    </ManualContext.Provider>
  );
};