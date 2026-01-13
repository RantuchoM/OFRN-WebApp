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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Función clave: Recibe la 'key' (ej: 'giras_paso_1') y busca el contenido
  const openManual = async (sectionKey) => {
    setIsOpen(true);
    setLoading(true);
    setError(null);
    setCurrentArticle(null);

    try {
      const data = await manualService.getBySectionKey(sectionKey);
      if (data) {
        setCurrentArticle(data);
      } else {
        setError(`No se encontró documentación para: ${sectionKey}`);
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
  };

  return (
    <ManualContext.Provider value={{ openManual, closeManual }}>
      {children}
      {/* El Modal vive aquí, invisible hasta que isOpen sea true */}
      <ManualModal 
        isOpen={isOpen} 
        onClose={closeManual} 
        article={currentArticle} 
        loading={loading}
        error={error}
      />
    </ManualContext.Provider>
  );
};