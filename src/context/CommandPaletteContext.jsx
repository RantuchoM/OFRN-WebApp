import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext'; 
import { supabase } from '../services/supabase'; 
import CommandPalette from '../components/ui/CommandPalette';
import { 
    IconHome, IconSettings, IconMusic, IconCalendar, 
    IconUsers, IconTruck, IconFileText, IconBriefcase, IconGrid, 
    IconUser, IconUtensils, IconBed, IconLayout, IconDollarSign,
    IconTag, IconDatabase, IconInfo, IconCheckSquare
} from '../components/ui/Icons';

const CommandPaletteContext = createContext();

export const CommandPaletteProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [registeredCommands, setRegisteredCommands] = useState({});
  const [girasCommands, setGirasCommands] = useState([]); 
  
  const navigate = useNavigate();
  // eslint-disable-next-line no-unused-vars
  const location = useLocation(); 
  const [searchParams] = useSearchParams();
  
  // 1. OBTENER ROL DE GESTIÓN
  const { user, isManagement } = useAuth(); 

  // LEER PARÁMETROS DE URL
  const currentTab = searchParams.get('tab');
  const currentGiraId = searchParams.get('giraId');
  const currentView = searchParams.get('view');
  // eslint-disable-next-line no-unused-vars
  const currentSubTab = searchParams.get('subTab');

  // ===========================================================================
  // 2. CARGA GLOBAL DE GIRAS (Desde DB 'programas')
  // ===========================================================================
  useEffect(() => {
    if (!user) return;

    const fetchGiras = async () => {
        try {
            const { data } = await supabase
                .from('programas')
                .select('id, nombre_gira, nomenclador, mes_letra, fecha_desde')
                .order('fecha_desde', { ascending: false })
                .limit(50); 

            if (data) {
                const cmds = data.map(gira => {
                    const year = gira.fecha_desde ? gira.fecha_desde.substring(0, 4) : '';
                    
                    return {
                        id: `goto-gira-${gira.id}`,
                        label: `${gira.nomenclador || ''} ${gira.nombre_gira} (${gira.mes_letra || ''} ${year})`.trim(),
                        icon: <IconMusic size={14} className="text-indigo-500" />,
                        section: 'Historial de Giras',
                        run: () => navigate(`/?tab=giras&view=AGENDA&giraId=${gira.id}`) 
                    };
                });
                setGirasCommands(cmds);
            }
        } catch (err) {
            console.error("Error cargando comandos de giras:", err);
        }
    };

    fetchGiras();
  }, [user, navigate]);

  // ===========================================================================
  // 3. COMANDOS CONTEXTUALES (Dinámicos según Tab/View y ROL)
  // ===========================================================================
  const contextCommands = useMemo(() => {
      const cmds = [];

      // --- A) CONTEXTO: GIRAS ---
      if (currentTab === 'giras' && currentGiraId) {
          const gid = currentGiraId;
          
          // 3.1 Comandos COMUNES (Todos los ven)
          cmds.push(
              { 
                  id: 'gira-resumen', 
                  label: 'Gira: Dashboard / Resumen', 
                  icon: <IconGrid size={14}/>, 
                  section: 'Gira Actual', 
                  run: () => navigate(`/?tab=giras&view=RESUMEN&giraId=${gid}`) 
              },
              { 
                  id: 'gira-roster', 
                  label: 'Gira: Roster (Personas)', 
                  icon: <IconUsers size={14}/>, 
                  section: 'Gira Actual', 
                  run: () => navigate(`/?tab=giras&view=ROSTER&giraId=${gid}`) 
              }
          );

          // 3.2 Lógica bifurcada por ROL (Management vs Personal)
          if (isManagement) {
              // *** VISTA DE GESTIÓN ***
              cmds.push(
                  { 
                      id: 'gira-agenda-mgr', 
                      label: 'Gira: Agenda Detallada (Gestión)', 
                      icon: <IconCalendar size={14} className="text-red-500"/>, 
                      section: 'Gira (Gestión)', 
                      run: () => navigate(`/?tab=giras&view=AGENDA&giraId=${gid}`) 
                  },
                  { 
                      id: 'gira-repertorio-mgr', 
                      label: 'Gira: Programación y Repertorio', 
                      icon: <IconMusic size={14} className="text-red-500"/>, 
                      section: 'Gira (Gestión)', 
                      run: () => navigate(`/?tab=giras&view=REPERTOIRE&giraId=${gid}`) 
                  },
                  { 
                      id: 'gira-seating-mgr', 
                      label: 'Gira: Seating', 
                      icon: <IconLayout size={14} className="text-red-500"/>, 
                      section: 'Gira (Gestión)', 
                      run: () => navigate(`/?tab=giras&view=REPERTOIRE&giraId=${gid}&subTab=seating`) 
                  },
                  { 
                      id: 'gira-difusion-mgr', 
                      label: 'Gira: Difusión y Prensa', 
                      icon: <IconInfo size={14} className="text-red-500"/>, 
                      section: 'Gira (Gestión)', 
                      run: () => navigate(`/?tab=giras&view=DIFUSION&giraId=${gid}`) 
                  },
                  { 
                      id: 'gira-logistics-mgr', 
                      label: 'Gira: Panel Logístico', 
                      icon: <IconTruck size={14} className="text-red-500"/>, 
                      section: 'Gira (Gestión)', 
                      run: () => navigate(`/?tab=giras&view=LOGISTICS&giraId=${gid}`) 
                  },
                  { 
                      id: 'gira-viaticos-mgr', 
                      label: 'Gira: Gestión de Viáticos', 
                      icon: <IconDollarSign size={14} className="text-red-500"/>, 
                      section: 'Gira (Gestión)', 
                      run: () => navigate(`/?tab=giras&view=LOGISTICS&giraId=${gid}&subTab=viaticos`) 
                  }
              );

              // Sub-navegación LOGÍSTICA (Solo Management)
              if (currentView === 'LOGISTICS') {
                  cmds.push(
                      {
                          id: 'log-summary',
                          label: 'Logística > Resumen General',
                          icon: <IconGrid size={14} className="text-amber-600"/>,
                          section: 'Navegación Logística',
                          run: () => navigate(`/?tab=giras&view=LOGISTICS&giraId=${gid}&subTab=summary`)
                      },
                      {
                          id: 'log-transport',
                          label: 'Logística > Transportes',
                          icon: <IconTruck size={14} className="text-amber-600"/>,
                          section: 'Navegación Logística',
                          run: () => navigate(`/?tab=giras&view=LOGISTICS&giraId=${gid}&subTab=transport`)
                      },
                      {
                          id: 'log-meals',
                          label: 'Logística > Comidas (Gestión)',
                          icon: <IconUtensils size={14} className="text-amber-600"/>,
                          section: 'Navegación Logística',
                          run: () => navigate(`/?tab=giras&view=LOGISTICS&giraId=${gid}&subTab=meals`)
                      },
                      {
                        id: 'log-attendance',
                        label: 'Logística > Asistencia Comidas (QR/Lista)',
                        icon: <IconCheckSquare size={14} className="text-amber-600"/>,
                        section: 'Navegación Logística',
                        run: () => navigate(`/?tab=giras&view=LOGISTICS&giraId=${gid}&subTab=attendance`)
                    },
                      {
                          id: 'log-rooming',
                          label: 'Logística > Hotelería (Rooming)',
                          icon: <IconBed size={14} className="text-amber-600"/>,
                          section: 'Navegación Logística',
                          run: () => navigate(`/?tab=giras&view=LOGISTICS&giraId=${gid}&subTab=rooming`)
                      }
                  );
              }

          } else {
              // *** VISTA PERSONAL (Músicos / Staff no admin) ***
              cmds.push(
                  { 
                      id: 'gira-agenda-personal', 
                      label: 'Mi Agenda', 
                      icon: <IconCalendar size={14} className="text-emerald-500"/>, 
                      section: 'Mi Gira', 
                      run: () => navigate(`/?tab=giras&view=AGENDA&giraId=${gid}`) 
                  },
                  { 
                      id: 'gira-parts-personal', 
                      label: 'Mis Particellas (PDFs)', 
                      icon: <IconFileText size={14} className="text-emerald-500"/>, 
                      section: 'Mi Gira', 
                      // Redirigimos a la vista de repertorio que renderiza MyPartsViewer si no es admin
                      run: () => navigate(`/?tab=giras&view=REPERTOIRE&giraId=${gid}&subTab=my_parts`) 
                  },
                  {
                      id: 'gira-meals-personal',
                      label: 'Mis Comidas (Confirmación)',
                      icon: <IconUtensils size={14} className="text-emerald-500"/>,
                      section: 'Mi Gira',
                      // Redirigimos a logística que renderiza MealsAttendancePersonal
                      run: () => navigate(`/?tab=giras&view=MEALS_PERSONAL&giraId=${gid}`)
                  }
              );
          }
      }

      // --- B) CONTEXTO: REPERTORIO ---
      if (currentTab === 'repertorio') {
          // Todos ven Obras
          cmds.push(
              {
                  id: 'rep-works',
                  label: 'Repertorio: Obras',
                  icon: <IconFileText size={14}/>,
                  section: 'Repertorio',
                  run: () => navigate('/?tab=repertorio&view=WORKS')
              }
          );
          
          // Solo Management ve configuración de Compositores/Etiquetas
          if (isManagement) {
              cmds.push(
                  {
                      id: 'rep-composers',
                      label: 'Repertorio: Gestión Compositores',
                      icon: <IconUser size={14}/>,
                      section: 'Repertorio (Admin)',
                      run: () => navigate('/?tab=repertorio&view=COMPOSERS')
                  },
                  {
                      id: 'rep-tags',
                      label: 'Repertorio: Gestión Etiquetas',
                      icon: <IconTag size={14}/>,
                      section: 'Repertorio (Admin)',
                      run: () => navigate('/?tab=repertorio&view=TAGS')
                  }
              );
          }
      }

      // --- C) CONTEXTO: ENSAMBLES ---
      if (currentTab === 'ensambles' && isManagement) {
          cmds.push(
              {
                  id: 'ens-calendar',
                  label: 'Ensambles: Calendario',
                  icon: <IconCalendar size={14}/>,
                  section: 'Ensambles',
                  run: () => navigate('/?tab=ensambles&view=CALENDAR')
              },
              {
                  id: 'ens-coord',
                  label: 'Ensambles: Coordinación',
                  icon: <IconUsers size={14}/>,
                  section: 'Ensambles',
                  run: () => navigate('/?tab=ensambles&view=COORDINATOR')
              }
          );
      }

      // --- D) CONTEXTO: CONFIGURACIÓN (SOLO ADMIN) ---
      if (currentTab === 'configuracion' && isManagement) {
          cmds.push(
              {
                  id: 'conf-users',
                  label: 'Configuración: Usuarios',
                  icon: <IconUsers size={14}/>,
                  section: 'Configuración',
                  run: () => navigate('/?tab=configuracion&view=USERS')
              }
          );
      }

      return cmds;
  }, [currentTab, currentGiraId, currentView, navigate, isManagement]);

  // ===========================================================================
  // 4. COMANDOS GLOBALES (Filtrados por Rol)
  // ===========================================================================
  const globalCommands = useMemo(() => {
    // Comandos base (para todos)
    const cmds = [
        { 
            id: 'global-home', 
            label: 'Ir a Inicio / Dashboard', 
            icon: <IconHome size={14} />, 
            section: 'General', 
            run: () => navigate('/?tab=dashboard') 
        },
        { 
            id: 'global-giras', 
            label: 'Ir a Panel de Giras', 
            icon: <IconBriefcase size={14} />, 
            section: 'General', 
            run: () => navigate('/?tab=giras') 
        },
        { 
            id: 'global-manual', 
            label: 'Ir a Manual de Usuario', 
            icon: <IconInfo size={14} />, 
            section: 'Ayuda', 
            run: () => navigate('/?tab=manual') 
        }
    ];

    // Comandos Adicionales SOLO para MANAGEMENT
    if (isManagement) {
        cmds.push(
            { 
                id: 'global-agenda', 
                label: 'Ir a Agenda General', 
                icon: <IconCalendar size={14} />, 
                section: 'Gestión', 
                run: () => navigate('/?tab=agenda') 
            },
            { 
                id: 'global-ensambles', 
                label: 'Ir a Coordinación de Ensambles', 
                icon: <IconMusic size={14} />, 
                section: 'Gestión', 
                run: () => navigate('/?tab=ensambles') 
            },
            { 
                id: 'global-musicians', 
                label: 'Ir a Base de Músicos', 
                icon: <IconUsers size={14} />, 
                section: 'Gestión', 
                run: () => navigate('/?tab=musicos') 
            },
            { 
                id: 'global-repertorio', 
                label: 'Ir a Librería de Obras', 
                icon: <IconFileText size={14} />, 
                section: 'Gestión', 
                run: () => navigate('/?tab=repertorio') 
            },
            { 
                id: 'global-data', 
                label: 'Ir a Base de Datos (Tablas)', 
                icon: <IconDatabase size={14} />, 
                section: 'Gestión', 
                run: () => navigate('/?tab=datos') 
            },
            { 
                id: 'global-settings', 
                label: 'Configuración de Sistema', 
                icon: <IconSettings size={14} />, 
                section: 'Admin', 
                run: () => navigate('/?tab=configuracion') 
            }
        );
    }

    return cmds;
  }, [navigate, isManagement]);

  // ===========================================================================
  // 5. COMBINACIÓN
  // ===========================================================================
  const allActions = useMemo(() => {
    const localActions = Object.values(registeredCommands).flat();
    
    return [
        ...contextCommands, // 1. Prioridad: Contexto actual
        ...localActions,    // 2. Acciones locales del componente
        ...globalCommands,  // 3. Navegación global
        ...girasCommands    // 4. Histórico de giras
    ];
  }, [registeredCommands, globalCommands, girasCommands, contextCommands]);

  // Teclado (Ctrl+K / Cmd+K)
  useEffect(() => {
    // 1. Manejo de Teclado (Ctrl+K)
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    // 2. Manejo de Evento Personalizado (Desde el Trigger)
    const handleCustomOpen = () => {
      setIsOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleCustomOpen); // <--- NUEVO LISTENER

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleCustomOpen); // <--- LIMPIEZA
    };
  }, []);

  const registerCommands = (id, commands) => {
    setRegisteredCommands(prev => ({ ...prev, [id]: commands }));
  };

  const unregisterCommands = (id) => {
    setRegisteredCommands(prev => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
  };

  return (
    <CommandPaletteContext.Provider value={{ registerCommands, unregisterCommands, setIsOpen }}>
      {children}
      <CommandPalette 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        actions={allActions} 
      />
    </CommandPaletteContext.Provider>
  );
};

export const useCommandPalette = (commands = []) => {
  const { registerCommands, unregisterCommands, setIsOpen } = useContext(CommandPaletteContext);
  // Identificador único para este hook
  const id = useMemo(() => Math.random().toString(36).substr(2, 9), []);

  useEffect(() => {
    if (commands.length > 0) registerCommands(id, commands);
    return () => unregisterCommands(id);
  }, [id, commands]);

  return { openPalette: () => setIsOpen(true) };
};