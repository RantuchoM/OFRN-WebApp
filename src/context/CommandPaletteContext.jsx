import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext'; 
import { supabase } from '../services/supabase'; 
import { canAccessMusicTranslation } from '../constants/musicTranslationAccess';
import {
  MANAGEMENT_PALETTE_ENTRIES,
  managementPalettePath,
} from '../constants/managementPalette';
import CommandPalette from '../components/ui/CommandPalette';
import { 
    IconSettings, IconMusic, IconCalendar, 
    IconUsers, IconTruck, IconFileText, IconGrid, 
    IconUser, IconUtensils, IconBed, IconLayout, IconDollarSign,
    IconTag, IconDatabase, IconInfo, IconCheckSquare, IconMegaphone,
    IconMusicNote, IconList, IconBell, IconBookOpen, IconEdit,
    IconBulb, IconSpiralNotebook, IconManagement, IconSettingsWheel,
    IconHistory, IconMap,
} from '../components/ui/Icons';

const MANAGEMENT_SECTION_ICONS = {
  venues: IconSettingsWheel,
  seating: IconHistory,
  instrumentation: IconMusicNote,
  convocatorias: IconGrid,
  ensayos: IconMusic,
  asistencia_ensayos: IconUsers,
  conciertos: IconCalendar,
  audiencia: IconUsers,
};

function buildManagementPaletteCommands(navigate) {
  return MANAGEMENT_PALETTE_ENTRIES.map((entry) => {
    const IconComponent =
      entry.slug == null ? IconManagement : MANAGEMENT_SECTION_ICONS[entry.slug];
    return {
      id: entry.id,
      label: entry.label,
      icon: <IconComponent size={14} className="text-indigo-500" />,
      section: entry.section,
      run: () => navigate(managementPalettePath(entry.slug)),
    };
  });
}

const CommandPaletteContext = createContext();

export const CommandPaletteProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [registeredCommands, setRegisteredCommands] = useState({});
  const [girasCommands, setGirasCommands] = useState([]); 
  
  const navigate = useNavigate();
  // eslint-disable-next-line no-unused-vars
  const location = useLocation(); 
  const [searchParams] = useSearchParams();
  
  const {
    user,
    isManagement,
    isAdmin,
    isEditor,
    isGuest,
    isPersonal,
    isDifusion,
    isArreglador,
    isArchivista,
    isCurador,
    roles,
  } = useAuth();

  const [isEnsembleCoordinator, setIsEnsembleCoordinator] = useState(false);

  useEffect(() => {
    if (!user) return;

    const roleGrantsCoordinator = (roles || []).some((r) =>
      ["admin", "produccion_general", "coord_general", "curador"].includes(r),
    );
    if (roleGrantsCoordinator) {
      setIsEnsembleCoordinator(true);
      return;
    }

    supabase
      .from("ensambles_coordinadores")
      .select("id", { count: "exact", head: true })
      .eq("id_integrante", user.id)
      .then(({ count }) => setIsEnsembleCoordinator(count > 0));
  }, [user, roles]);

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
                .order('fecha_desde', { ascending: false });

            if (data) {
                const cmds = data.map(gira => {
                    const year = gira.fecha_desde ? gira.fecha_desde.substring(0, 4) : '';
                    
                    return {
                        id: `goto-gira-${gira.id}`,
                        label: `${gira.nomenclador || ''} ${gira.nombre_gira} (${gira.mes_letra || ''} ${year})`.trim(),
                        icon: <IconMusic size={14} className="text-indigo-500" />,
                        section: 'Historial de Giras',
                        // Al cambiar de gira, preservamos la misma "pantalla"
                        // (tab/view/subTab) y solo reemplazamos `giraId`.
                        run: () => {
                          const params = new URLSearchParams(window.location.search);
                          const tab = params.get('tab');
                          const view = params.get('view');
                          
                          // Solo preservamos pantalla si ya estamos dentro de una vista de Giras.
                          // Si estamos en LIST (view omitido o view=LIST), abrimos AGENDA como fallback.
                          if (tab === 'giras' && view && view !== 'LIST') {
                            params.set('giraId', String(gira.id));
                            return navigate(`/?${params.toString()}`);
                          }

                          // Fallback: si no estamos en el panel de giras, abrimos AGENDA.
                          return navigate(`/?tab=giras&view=AGENDA&giraId=${gira.id}`);
                        }
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
              // Disponible desde cualquier vista dentro de la misma gira.
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
                      run: () => navigate(`/?tab=giras&view=LOGISTICS&giraId=${gid}&subTab=transporte`)
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

      // --- D) CONTEXTO: USUARIOS (SOLO ADMIN) ---
      if (currentTab === 'usuarios' && isAdmin) {
          cmds.push(
              {
                  id: 'conf-users',
                  label: 'Usuarios: Gestión de cuentas',
                  icon: <IconUsers size={14}/>,
                  section: 'Administración',
                  run: () => navigate('/?tab=usuarios')
              }
          );
      }

      // --- E) CONTEXTO: GESTIÓN (/management/*) ---
      if (location.pathname.startsWith('/management') && (isAdmin || isEditor)) {
          cmds.push(...buildManagementPaletteCommands(navigate));
      }

      return cmds;
  }, [currentTab, currentGiraId, currentView, location.pathname, navigate, isManagement, isAdmin, isEditor]);

  // ===========================================================================
  // 4. COMANDOS GLOBALES (Filtrados por Rol)
  // ===========================================================================
  const globalCommands = useMemo(() => {
    const isDirector = roles?.includes('director');
    const canAccessArreglos =
      isAdmin || isArreglador || user?.mail === 'martin.rantucho@gmail.com';
    const canAccessDifusion =
      isAdmin || (Array.isArray(roles) && roles.includes('editor')) || isDifusion;
    const canAccessAgenda = !isGuest && (isPersonal || isEditor || isManagement);
    const canAccessRepertorio =
      !isGuest && (isArchivista || isEditor || isManagement);
    const canAccessManual = !isGuest && (isPersonal || isEditor || isManagement);

    const cmds = [
        { 
            id: 'global-giras', 
            label: 'Ir a Panel de Giras', 
            icon: <IconMap size={14} />, 
            section: 'General', 
            run: () => navigate('/?tab=giras') 
        },
    ];

    if (isManagement || isDirector) {
      cmds.push({
        id: 'global-dashboard',
        label: 'Ir a Dashboard',
        icon: <IconSpiralNotebook size={14} />,
        section: 'General',
        run: () => navigate('/?tab=dashboard'),
      });
    }

    if (canAccessAgenda) {
      cmds.push({
        id: 'global-agenda',
        label: 'Ir a Agenda General',
        icon: <IconCalendar size={14} />,
        section: 'General',
        run: () => navigate('/?tab=agenda'),
      });
    }

    if (canAccessDifusion) {
      cmds.push({
        id: 'global-difusion',
        label: 'Ir a Difusión',
        icon: <IconMegaphone size={14} className="text-fuchsia-500" />,
        section: 'General',
        run: () => navigate('/?tab=difusion'),
      });
    }

    if (canAccessRepertorio) {
      cmds.push({
        id: 'global-repertorio',
        label: 'Ir a Repertorio',
        icon: <IconFileText size={14} />,
        section: 'General',
        run: () => navigate('/?tab=repertorio'),
      });
    }

    if (canAccessArreglos) {
      cmds.push({
        id: 'global-arreglos',
        label: 'Ir a Arreglos',
        icon: <IconMusicNote size={14} className="text-amber-600" />,
        section: 'General',
        run: () => navigate('/?tab=arreglos'),
      });
    }

    if (canAccessManual) {
      cmds.push({
        id: 'global-manual',
        label: 'Ir a Manual de Usuario',
        icon: <IconBookOpen size={14} />,
        section: 'Ayuda',
        run: () => navigate('/?tab=manual'),
      });
    }

    if (!isGuest) {
      cmds.push({
        id: 'global-feedback',
        label: 'Ir a Feedback',
        icon: <IconBulb size={14} className="text-yellow-600" />,
        section: 'Ayuda',
        run: () => navigate('/?tab=feedback'),
      });
    }

    if (isManagement) {
        cmds.push(
            { 
                id: 'global-ensambles', 
                label: 'Ir a Ensambles', 
                icon: <IconMusic size={14} />, 
                section: 'Gestión', 
                run: () => navigate('/?tab=ensambles') 
            },
            { 
                id: 'global-musicians', 
                label: 'Ir a Personas', 
                icon: <IconUsers size={14} />, 
                section: 'Gestión', 
                run: () => navigate('/?tab=musicos') 
            },
        );

        if (!isDifusion) {
          cmds.push({
            id: 'global-data',
            label: 'Ir a Datos (Tablas)',
            icon: <IconDatabase size={14} />,
            section: 'Gestión',
            run: () => navigate('/?tab=datos'),
          });
        }

        cmds.push(
            {
              id: 'global-news',
              label: 'Ir a Comunicación',
              icon: <IconBell size={14} className="text-orange-500" />,
              section: 'Gestión',
              run: () => navigate('/?tab=news_manager'),
            },
            {
              id: 'global-manual-admin',
              label: 'Ir a Editor Manual',
              icon: <IconEdit size={14} />,
              section: 'Gestión',
              run: () => navigate('/?tab=manual_admin'),
            },
        );
    }

    if (isEnsembleCoordinator) {
      cmds.push({
        id: 'global-coordinacion',
        label: 'Ir a Coordinación',
        icon: <IconList size={14} className="text-teal-600" />,
        section: 'Gestión',
        run: () => navigate('/?tab=coordinacion'),
      });
    }

    if (isAdmin || isCurador) {
      cmds.push({
        id: 'global-curadoria',
        label: 'Ir a Curaduría',
        icon: <IconMusic size={14} className="text-purple-600" />,
        section: 'Gestión',
        run: () => navigate('/?tab=curadoria'),
      });
    }

    if (isAdmin || isEditor) {
      cmds.push(...buildManagementPaletteCommands(navigate));
    }

    if (isAdmin) {
        cmds.push({ 
            id: 'global-settings', 
            label: 'Ir a Usuarios', 
            icon: <IconSettings size={14} />, 
            section: 'Admin', 
            run: () => navigate('/?tab=usuarios') 
        });
    }

    if (canAccessMusicTranslation(user?.id)) {
        cmds.push({
            id: 'global-music-translation',
            label: 'Ir a Traducción musical (AcroForm)',
            icon: <IconMusic size={14} className="text-violet-500" />,
            section: 'Gestión',
            run: () => navigate('/?tab=music_translation'),
        });
    }

    return cmds;
  }, [
    navigate,
    isManagement,
    isAdmin,
    isEditor,
    isGuest,
    isPersonal,
    isDifusion,
    isArreglador,
    isArchivista,
    isCurador,
    isEnsembleCoordinator,
    roles,
    user?.id,
    user?.mail,
  ]);

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