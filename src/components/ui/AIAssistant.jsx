import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; 
import { supabase } from '../../services/supabase'; 
import { 
    IconMessageSquare, 
    IconX, 
    IconSend, 
    IconLoader
} from './Icons'; 

export default function AIAssistant() {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    // --- 1. LÓGICA DE CONTEXTO (RUTA VIRTUAL) ---
    // Convertimos la URL técnica (?tab=giras&giraId=4&view=LOGISTICS) 
    // en algo que la IA entienda (/giras/4/logistica)
    
    const tab = searchParams.get('tab') || 'dashboard';
    const giraId = searchParams.get('giraId');
    const view = searchParams.get('view'); // Ej: 'REPERTOIRE', 'LOGISTICS', 'ROSTER'

    let virtualPath = `/${tab}`;
    
    if (giraId) {
        virtualPath += `/${giraId}`;
    }

    if (view) {
        const viewMap = {
            'REPERTOIRE': 'repertorio',
            'LOGISTICS': 'logistica',
            'ROSTER': 'roster',
            'AGENDA': 'agenda',
            'VIATICOS': 'viaticos'
        };
        // Agregamos el sub-módulo a la ruta
        virtualPath += `/${viewMap[view] || view.toLowerCase()}`;
    }

    // --- 2. EFECTOS DE UI ---
    // Scroll automático al fondo
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, loading]);

    // --- 3. ENVÍO DE MENSAJES ---
    const handleSend = async () => {
        if (!input.trim()) return;

        const userText = input.trim();
        const userMsg = { role: 'user', content: userText };
        
        // UI Optimista: Mostrar mensaje inmediatamente
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            // Llamada a la Edge Function
            const { data, error } = await supabase.functions.invoke('ask-ai', {
                body: { 
                    messages: [...messages, userMsg], // Historial
                    userId: user?.id,                 // ID para buscar identidad
                    currentPath: virtualPath          // La ruta "traducida"
                }
            });

            if (error) throw error;

            // Respuesta de la IA
            setMessages(prev => [...prev, data]);

        } catch (err) {
            console.error("Error AI:", err);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: "⚠️ Error de conexión con el asistente. Intenta nuevamente." 
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        // POSICIÓN: bottom-6 left-6 (Izquierda) para evitar al FeedbackWidget
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-start font-sans pointer-events-none">
            
            {/* VENTANA DEL CHAT */}
            {isOpen && (
                <div className="mb-4 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden pointer-events-auto flex flex-col h-[500px] animate-in slide-in-from-bottom-5 fade-in duration-200">
                    
                    {/* CABECERA */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex justify-between items-center shadow-md shrink-0">
                        <div>
                            <h3 className="font-bold flex items-center gap-2 text-sm">
                                <IconMessageSquare size={16} className="text-indigo-200"/> 
                                Asistente OFRN
                            </h3>
                            {/* Indicador de Contexto (Debug visual para ti) */}
                            <p className="text-[10px] opacity-80 flex items-center gap-1 mt-0.5">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                                Contexto: <span className="font-mono bg-white/20 px-1 rounded truncate max-w-[150px]" title={virtualPath}>{virtualPath}</span>
                            </p>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)} 
                            className="hover:bg-white/20 p-1.5 rounded-lg transition-colors text-indigo-100 hover:text-white"
                        >
                            <IconX size={18}/>
                        </button>
                    </div>

                    {/* ÁREA DE MENSAJES */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4" ref={scrollRef}>
                        {messages.length === 0 && (
                            <div className="text-center text-slate-400 text-sm mt-10 px-4">
                                <div className="bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-400">
                                    <IconMessageSquare size={24}/>
                                </div>
                                <p className="font-medium text-slate-600">
                                    ¡Hola {user?.nombre || 'Músico'}!
                                </p>
                                <p className="mt-2 text-xs leading-relaxed">
                                    Puedo decirte en qué micro viajas, qué obras tocas o ayudarte con el uso de la app.
                                </p>
                                <div className="mt-4 grid gap-2">
                                    <button 
                                        onClick={() => setInput("¿Qué toco en esta gira?")} 
                                        className="text-xs bg-white border border-slate-200 p-2 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-left"
                                    >
                                        🎻 ¿Qué toco en esta gira?
                                    </button>
                                    <button 
                                        onClick={() => setInput("¿Cómo es mi logística?")} 
                                        className="text-xs bg-white border border-slate-200 p-2 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-left"
                                    >
                                        🚌 ¿Cómo es mi logística?
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                                    m.role === 'user' 
                                        ? 'bg-indigo-600 text-white rounded-br-none' 
                                        : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                                }`}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-slate-200 shadow-sm flex items-center gap-1">
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* INPUT AREA */}
                    <div className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0">
                        <input 
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                            placeholder="Escribe tu consulta..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !loading && handleSend()}
                            autoFocus
                        />
                        <button 
                            onClick={handleSend} 
                            disabled={loading || !input.trim()}
                            className="bg-indigo-600 text-white p-2.5 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center w-10 h-10"
                        >
                            {loading ? <IconLoader className="animate-spin" size={18}/> : <IconSend size={18} className="ml-0.5"/>}
                        </button>
                    </div>
                </div>
            )}

            {/* BOTÓN FLOTANTE (FAB) */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`pointer-events-auto h-14 w-14 rounded-full shadow-xl shadow-indigo-900/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95 group ${
                    isOpen 
                    ? 'bg-slate-700 text-slate-200 rotate-90' 
                    : 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white hover:rotate-12'
                }`}
            >
                {isOpen ? <IconX size={24}/> : <IconMessageSquare size={26} className="group-hover:animate-pulse"/>}
            </button>
        </div>
    );
}