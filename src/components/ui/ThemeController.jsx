// src/components/ui/ThemeController.jsx
import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext'; 
import { supabase } from '../../services/supabase'; 

export default function ThemeController() {
  const { user } = useAuth(); 

  // Convertir HEX a RGB (para que Tailwind pueda usar opacidades)
  const hexToRgb = (hex) => {
    if (!hex) return null;
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? 
      `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
      : null;
  };

  const applyColor = (color) => {
    let rgbValue = color;
    if (color && color.startsWith('#')) {
        rgbValue = hexToRgb(color);
    }
    
    if (rgbValue) {
        // Al usar el filtro CSS invertido, NO necesitamos atenuar el color aquí.
        // Pasamos el color puro. El filtro se encargará del resto.
        document.documentElement.style.setProperty('--theme-primary', rgbValue);
        
        // (Opcional) Si quieres definir colores semánticos base para que Tailwind los use
        document.documentElement.style.setProperty('--theme-success', '16, 185, 129'); // Emerald
        document.documentElement.style.setProperty('--theme-danger',  '239, 68, 68');   // Red
        document.documentElement.style.setProperty('--theme-warning', '245, 158, 11');  // Amber
    }
  };

  const applyThemeMode = (isDark) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // 1. CARGA INICIAL
  useEffect(() => {
    const savedMode = localStorage.getItem('theme_mode');
    // Aplicar modo
    applyThemeMode(savedMode === 'dark');

    // Aplicar color
    const savedColor = localStorage.getItem('theme_color');
    applyColor(savedColor || '79, 70, 229'); // Default Indigo

    // Sync Nube
    const syncUserColor = async () => {
        if (!user) return;
        try {
            // Nota: Corregí la tabla a 'integrantes' basado en tu feedback anterior
            const { data } = await supabase
                .from('integrantes')
                .select('avatar_color')
                .eq('id', user.id)
                .maybeSingle(); // Usa maybeSingle para evitar error 406 si no existe
            
            if (data?.avatar_color) {
                const dbRgb = hexToRgb(data.avatar_color);
                if (dbRgb && dbRgb !== savedColor) {
                    applyColor(dbRgb); 
                    localStorage.setItem('theme_color', dbRgb);
                }
            }
        } catch (err) {
            console.error('Error syncing theme:', err);
        }
    };
    syncUserColor();
  }, [user]); 

  // 2. LISTENERS (Tiempo Real)
  useEffect(() => {
    const handleLocalThemeChange = async (event) => {
      const detail = event.detail;
      let newColor = null;
      let newDarkMode = undefined;

      if (typeof detail === 'string') newColor = detail;
      else if (typeof detail === 'object' && detail !== null) {
        if (detail.color) newColor = detail.color;
        if (detail.darkMode !== undefined) newDarkMode = detail.darkMode;
      }

      if (newColor) {
        const isHex = newColor.startsWith('#');
        const rgbValue = isHex ? hexToRgb(newColor) : newColor;
        applyColor(rgbValue);
        localStorage.setItem('theme_color', rgbValue); 

        if (user && isHex) { 
            await supabase.from('integrantes').update({ avatar_color: newColor }).eq('id', user.id);
        }
      }

      if (newDarkMode !== undefined) {
        applyThemeMode(newDarkMode);
        localStorage.setItem('theme_mode', newDarkMode ? 'dark' : 'light');
      }
    };

    window.addEventListener('theme-changed', handleLocalThemeChange);
    return () => window.removeEventListener('theme-changed', handleLocalThemeChange);
  }, [user]);

  return null;
}