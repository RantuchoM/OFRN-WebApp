import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext'; 
import { supabase } from '../../services/supabase'; 

export default function ThemeController() {
  const { user } = useAuth(); 

  const hexToRgb = (hex) => {
    if (!hex) return null;
    // Soporte para formato corto #FFF y largo #FFFFFF
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? 
      `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
      : null;
  };

  const applyColor = (color) => {
    // Detectamos si es HEX para convertirlo, o si ya es RGB (ej: "79, 70, 229")
    let rgbValue = color;
    if (color && color.startsWith('#')) {
        rgbValue = hexToRgb(color);
    }
    
    if (rgbValue) {
        document.documentElement.style.setProperty('--theme-primary', rgbValue);
    }
  };

  const applyThemeMode = (isDark) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // 1. CARGA INICIAL (Híbrida: Local Inmediato -> Sync Nube)
  useEffect(() => {
    // A) MODO OSCURO (Solo Local)
    const savedMode = localStorage.getItem('theme_mode');
    if (savedMode === 'dark') {
        applyThemeMode(true);
    } else {
        applyThemeMode(false);
    }

    // B) COLOR (Estrategia: Carga rápida local -> Verificación nube)
    const savedColor = localStorage.getItem('theme_color');
    if (savedColor) {
        // 1. Inmediato: Usar caché local
        applyColor(savedColor);
    } else {
        // Default si no hay nada
        applyColor('79, 70, 229'); 
    }

    // C) SINCRONIZACIÓN: Chequear si la BD tiene algo más nuevo/diferente
    const syncUserColor = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('users')
                .select('avatar_color')
                .eq('id', user.id)
                .single();
            
            if (data?.avatar_color) {
                const dbRgb = hexToRgb(data.avatar_color);
                
                // Si lo que hay en BD es diferente a lo que tengo en local (o no tenía nada)
                // actualizamos para sincronizar este dispositivo.
                if (dbRgb && dbRgb !== savedColor) {
                    console.log('🔄 Sincronizando tema desde la nube...');
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

  // 2. ESCUCHAR CAMBIOS EN TIEMPO REAL
  useEffect(() => {
    const handleLocalThemeChange = async (event) => {
      const detail = event.detail;
      
      let newColor = null;
      let newDarkMode = undefined;

      // Normalizar input (string u objeto)
      if (typeof detail === 'string') {
          newColor = detail;
      } else if (typeof detail === 'object' && detail !== null) {
          if (detail.color) newColor = detail.color;
          if (detail.darkMode !== undefined) newDarkMode = detail.darkMode;
      }

      // --- CAMBIO DE COLOR ---
      if (newColor) {
        const isHex = newColor.startsWith('#');
        const rgbValue = isHex ? hexToRgb(newColor) : newColor;
        
        // 1. Aplicar visualmente
        applyColor(rgbValue);
        
        // 2. Guardar Local (para la próxima carga rápida)
        localStorage.setItem('theme_color', rgbValue); 

        // 3. Guardar en BD (si es un cambio intencional del usuario y es HEX válido)
        if (user && isHex) { 
            await supabase
                .from('users')
                .update({ avatar_color: newColor })
                .eq('id', user.id);
        }
      }

      // --- CAMBIO DE MODO ---
      if (newDarkMode !== undefined) {
        applyThemeMode(newDarkMode);
        localStorage.setItem('theme_mode', newDarkMode ? 'dark' : 'light');
      }
    };

    window.addEventListener('theme-changed', handleLocalThemeChange);

    return () => {
      window.removeEventListener('theme-changed', handleLocalThemeChange);
    };

  }, [user]);

  return null;
}