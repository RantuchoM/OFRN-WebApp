import React, { useState } from "react";
import { IconDownload, IconFileText, IconCheck, IconFolderMusic, IconUsers } from "../../../components/ui/Icons";

export default function LocationBulkPanel({ selectionSize, onClose, onExport, loading, isExporting, exportStatus }) {
    // Opciones de qué documentos generar
    const [options, setOptions] = useState({
        viatico: false,
        destaque: true,
        rendicion: false,
        docComun: false,
        docReducida: false
    });

    // MODO DE EXPORTACIÓN (3 ESTADOS EXCLUYENTES)
    // 'global' = Todo en 1 archivo
    // 'location' = 1 archivo por localidad
    // 'individual' = 1 archivo por persona
    const [exportMode, setExportMode] = useState('global');

    const toggleOption = (key) => setOptions(prev => ({ ...prev, [key]: !prev[key] }));

    const handleConfirmExport = () => {
        // Traducimos el "Modo" a las flags que espera el sistema
        const exportConfig = { ...options };
        let mergeLocations = false;

        switch (exportMode) {
            case 'global':
                mergeLocations = true;        // Une todas las localidades seleccionadas en la lógica del padre
                exportConfig.unifyFiles = true; // Une a las personas en un solo PDF
                break;
            case 'location':
                mergeLocations = false;       // El padre itera por grupo/localidad
                exportConfig.unifyFiles = true; // Dentro de cada grupo, une a las personas
                break;
            case 'individual':
                mergeLocations = false;       // El padre itera por grupo/localidad
                exportConfig.unifyFiles = false; // Genera un PDF por cada persona
                break;
        }

        onExport({ ...exportConfig, mergeLocations });
    };

    if (isExporting) {
        return (
            <div className="p-6 h-full flex flex-col items-center justify-center text-center animate-in fade-in">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Generando Documentos...</h3>
                <p className="text-sm text-slate-500">{exportStatus}</p>
            </div>
        );
    }

    // Componente de Tarjeta de Selección
    const ModeOption = ({ mode, icon: Icon, title, subtitle }) => (
        <div 
            onClick={() => setExportMode(mode)}
            className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between group ${
                exportMode === mode 
                ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' 
                : 'bg-white border-slate-200 hover:border-indigo-300'
            }`}
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${exportMode === mode ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                    <Icon size={18} />
                </div>
                <div className="flex flex-col">
                    <span className={`text-sm font-bold ${exportMode === mode ? 'text-indigo-900' : 'text-slate-700'}`}>{title}</span>
                    <span className="text-[10px] text-slate-500">{subtitle}</span>
                </div>
            </div>
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${exportMode === mode ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                {exportMode === mode && <IconCheck size={10} className="text-white" strokeWidth={4} />}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <div className="p-4 border-b border-slate-200 bg-white shadow-sm flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-800">Exportar Lote</h3>
                    <p className="text-xs text-slate-500">{selectionSize} localidades seleccionadas</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {/* SELECCIÓN DE MODO (3 OPCIONES) */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Formato de Salida</label>
                    <div className="flex flex-col gap-2">
                        <ModeOption 
                            mode="global" 
                            icon={IconFileText} 
                            title="Unificar Todo" 
                            subtitle="1 solo PDF con todas las localidades juntas." 
                        />
                        <ModeOption 
                            mode="location" 
                            icon={IconFolderMusic} 
                            title="Por Localidad" 
                            subtitle="1 PDF por cada localidad seleccionada." 
                        />
                        <ModeOption 
                            mode="individual" 
                            icon={IconUsers} 
                            title="Individual" 
                            subtitle="1 PDF por cada persona (archivos sueltos)." 
                        />
                    </div>
                </div>

                {/* TIPO DE DOCUMENTO */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Documentos a generar</label>
                    <div className="space-y-2 bg-white p-2 rounded-lg border border-slate-200">
                        <label className="flex items-center gap-3 p-2 cursor-pointer hover:bg-slate-50 rounded">
                            <input type="checkbox" checked={options.destaque} onChange={() => toggleOption('destaque')} className="w-4 h-4 text-indigo-600 rounded accent-indigo-600" />
                            <div className="flex-1">
                                <span className="block text-sm font-medium text-slate-700">Destaques</span>
                            </div>
                        </label>
                        
                        <label className="flex items-center gap-3 p-2 cursor-pointer hover:bg-slate-50 rounded border-t border-slate-50">
                            <input type="checkbox" checked={options.docComun} onChange={() => toggleOption('docComun')} className="w-4 h-4 text-indigo-600 rounded accent-indigo-600" />
                            <span className="text-sm font-medium text-slate-700">Adjuntar Documentación</span>
                        </label>

                        <label className="flex items-center gap-3 p-2 cursor-pointer hover:bg-slate-50 rounded border-t border-slate-50">
                            <input type="checkbox" checked={options.docReducida} onChange={() => toggleOption('docReducida')} className="w-4 h-4 text-indigo-600 rounded accent-indigo-600" />
                            <span className="text-sm font-medium text-slate-700">Adjuntar Doc. Reducida</span>
                        </label>
                    </div>
                </div>

            </div>

            <div className="p-4 border-t border-slate-200 bg-white">
                <button 
                    onClick={handleConfirmExport} 
                    disabled={loading || (!options.destaque && !options.docComun && !options.docReducida)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-bold text-sm shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                    <IconDownload size={18} />
                    {loading ? "Procesando..." : "Confirmar Exportación"}
                </button>
                <button onClick={onClose} className="w-full mt-2 text-slate-400 text-xs hover:text-slate-600 py-2">Cancelar</button>
            </div>
        </div>
    );
}