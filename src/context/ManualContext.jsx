import React, { createContext, useContext, useState } from 'react';
import { manualService } from '../services/manualService';
import ManualModal from '../components/manual/ManualModal';

const ManualContext = createContext();

export const useManual = () => {
  return useContext(ManualContext);
};

export const ManualProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentArticle, setCurrentArticle] = useState(null);
  const [currentKey, setCurrentKey] = useState(null); // <--- NUEVO ESTADO
  const [navigation, setNavigation] = useState({ prev: null, next: null, parent: null, breadcrumbs: [], children: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const openManual = async (sectionKey) => {
    setIsOpen(true);
    setLoading(true);
    setError(null);
    setCurrentKey(sectionKey); // <--- Guardamos la key solicitada

    try {
      const data = await manualService.getBySectionKey(sectionKey);
      
      if (data) {
        setCurrentArticle(data);
        // Cargar navegación en segundo plano
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
    // No limpiamos currentKey inmediatamente por si la animación de cierre lo necesita, pero no es crítico
  };

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
        currentKey={currentKey} // <--- Pasamos la key al modal
        navigation={navigation}
        onNavigate={navigateTo}
        loading={loading}
        error={error}
      />
    </ManualContext.Provider>
  );
};