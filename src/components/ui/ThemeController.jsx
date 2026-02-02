import { useEffect } from 'react';
// import { useAuth } from '../../context/AuthContext'; // Ya no es estricto si es local
// import { supabase } from '../../services/supabase'; // No se usa para leer pref

export default function ThemeController() {
  
  const hexToRgb = (hex) => {
    if (!hex) return null;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
      : null;
  };

  const applyColor = (color) => {
    document.documentElement.style.setProperty('--theme-primary', color);
  };

  const applyThemeMode = (isDark) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    // 1. CARGA INICIAL DESDE LOCALSTORAGE
    const savedColor = localStorage.getItem('theme_color');
    const savedMode = localStorage.getItem('theme_mode'); // 'dark' o 'light'

    if (savedColor) {
        const rgb = hexToRgb(savedColor);
        if (rgb) applyColor(rgb);
    } else {
        applyColor('79, 70, 229'); // Default Indigo
    }

    if (savedMode === 'dark') {
        applyThemeMode(true);
    } else {
        applyThemeMode(false);
    }

    // 2. ESCUCHAR CAMBIOS (Evento local disparado por el Modal)
    const handleLocalThemeChange = (event) => {
      const detail = event.detail;
      
      if (typeof detail === 'object') {
         if (detail.color) {
            const rgb = hexToRgb(detail.color);
            if (rgb) applyColor(rgb);
            localStorage.setItem('theme_color', detail.color); // GUARDAR
         }
         if (detail.darkMode !== undefined) {
            applyThemeMode(detail.darkMode);
            localStorage.setItem('theme_mode', detail.darkMode ? 'dark' : 'light'); // GUARDAR
         }
      }
    };

    window.addEventListener('theme-changed', handleLocalThemeChange);

    return () => {
      window.removeEventListener('theme-changed', handleLocalThemeChange);
    };

  }, []);

  return null;
}