import React, { useState, useEffect } from 'react';
import { IconFileText, IconLoader, IconBus, IconMap, IconFiles, IconCopy } from '../../../components/ui/Icons';

export default function LocationBulkPanel({ 
    selectionStats = { totalPeople: 0, pendingPeople: 0, groupCount: 0 }, 
    onClose, 
    onExport, 
    loading, 
    isExporting, 
    exportStatus 
}) {
    // ... resto del código igual a mi respuesta anterior (con los botones de modo) ...
    // Se mantiene la lógica de scope y unificationMode
    
    const [scope, setScope] = useState('pending'); // 'pending' | 'all'
    const [unificationMode, setUnificationMode] = useState('individual'); // 'individual' | 'location' | 'master'
    
    const [options, setOptions] = useState({
        viatico: false,
        rendicion: false,
        destaque: true,
        docComun: false,
        docReducida: false,
    });

    useEffect(() => {
        if (selectionStats.pendingPeople === 0 && selectionStats.totalPeople > 0) {
            setScope('all');
        } else {
            setScope('pending');
        }
    }, [selectionStats]);

    const handleToggle = (field) => {
        setOptions(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleExportClick = () => {
        onExport({
            ...options,
            exportScope: scope,
            unificationMode: unificationMode
        });
    };

    const countToExport = scope === 'pending' ? selectionStats.pendingPeople : selectionStats.totalPeople;

    return (
        <div className="p-6 h-full flex flex-col font-sans">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <IconBus className="text-indigo-600" /> Exportar Lote
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                    Selección: <b>{selectionStats.groupCount}</b> localidades.
                </p>
            </div>

            <div className="space-y-5 flex-1 overflow-y-auto pr-1">
                
                {/* 1. ALCANCE (SCOPE) */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Alcance</h4>
                    <div className="space-y-2">
                        <label className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-all ${scope === 'pending' ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-slate-50 border-slate-200 opacity-80 hover:opacity-100'}`}>
                            <div className="flex items-center gap-2">
                                <input type="radio" name="scope" checked={scope === 'pending'} onChange={() => setScope('pending')} disabled={selectionStats.pendingPeople === 0} className="text-indigo-600" />
                                <span className={`text-xs font-bold ${scope === 'pending' ? 'text-indigo-700' : 'text-slate-600'}`}>Solo Pendientes</span>
                            </div>
                            <span className="text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-100 text-slate-600">{selectionStats.pendingPeople}</span>
                        </label>

                        <label className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-all ${scope === 'all' ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-slate-50 border-slate-200 opacity-80 hover:opacity-100'}`}>
                            <div className="flex items-center gap-2">
                                <input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} className="text-indigo-600" />
                                <span className={`text-xs font-bold ${scope === 'all' ? 'text-indigo-700' : 'text-slate-600'}`}>
                                    {selectionStats.pendingPeople === 0 ? "Re-exportar Todo" : "Incluir ya exportados"}
                                </span>
                            </div>
                            <span className="text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-100 text-slate-600">{selectionStats.totalPeople}</span>
                        </label>
                    </div>
                </div>

                {/* 2. MODO DE UNIFICACIÓN */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Formato de Salida</h4>
                    <div className="grid grid-cols-3 gap-2">
                        <button 
                            onClick={() => setUnificationMode('individual')}
                            className={`flex flex-col items-center justify-center gap-1 p-2 rounded border transition-all ${unificationMode === 'individual' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-white'}`}
                        >
                            <IconCopy size={16} />
                            <span className="text-[9px] font-bold text-center leading-tight">Individual<br/>(1 PDF x Pers)</span>
                        </button>
                        <button 
                            onClick={() => setUnificationMode('location')}
                            className={`flex flex-col items-center justify-center gap-1 p-2 rounded border transition-all ${unificationMode === 'location' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-white'}`}
                        >
                            <IconMap size={16} />
                            <span className="text-[9px] font-bold text-center leading-tight">x Localidad<br/>(Agrupado)</span>
                        </button>
                        <button 
                            onClick={() => setUnificationMode('master')}
                            className={`flex flex-col items-center justify-center gap-1 p-2 rounded border transition-all ${unificationMode === 'master' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-white'}`}
                        >
                            <IconFiles size={16} />
                            <span className="text-[9px] font-bold text-center leading-tight">Master<br/>(1 PDF Total)</span>
                        </button>
                    </div>
                </div>

                {/* 3. DOCUMENTOS */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Qué generar:</h4>
                    
                    <div className="space-y-2">
                        <label className="flex items-center gap-3 p-2 bg-white rounded border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
                            <input type="checkbox" checked={options.destaque} onChange={() => handleToggle('destaque')} className="w-4 h-4 text-indigo-600 rounded" />
                            <span className="text-sm font-medium text-slate-700">Destaques (Original)</span>
                        </label>

                        <label className="flex items-center gap-3 p-2 bg-white rounded border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
                            <input type="checkbox" checked={options.viatico} onChange={() => handleToggle('viatico')} className="w-4 h-4 text-indigo-600 rounded" />
                            <span className="text-sm font-medium text-slate-700">Viáticos (Calculado)</span>
                        </label>

                        <label className="flex items-center gap-3 p-2 bg-white rounded border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
                            <input type="checkbox" checked={options.rendicion} onChange={() => handleToggle('rendicion')} className="w-4 h-4 text-indigo-600 rounded" />
                            <span className="text-sm font-medium text-slate-700">Rendiciones</span>
                        </label>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={options.docComun} onChange={() => handleToggle('docComun')} className="w-3 h-3 text-indigo-600 rounded" />
                            <span className="text-xs text-slate-600">Adjuntar Documentación</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={options.docReducida} onChange={() => handleToggle('docReducida')} className="w-3 h-3 text-indigo-600 rounded" />
                            <span className="text-xs text-slate-600">Adjuntar Doc. Reducida</span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-4">
                {isExporting && (
                    <div className="mb-4 bg-indigo-50 border border-indigo-100 p-3 rounded text-xs text-indigo-700 animate-pulse">
                        <p className="font-bold flex items-center gap-2"><IconLoader className="animate-spin" size={12}/> Procesando {countToExport} personas...</p>
                        <p className="mt-1 opacity-80">{exportStatus}</p>
                    </div>
                )}

                <div className="flex gap-2">
                    <button 
                        onClick={onClose} 
                        disabled={isExporting}
                        className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleExportClick} 
                        disabled={loading || isExporting || countToExport === 0 || (!options.viatico && !options.destaque && !options.rendicion && !options.docComun)}
                        className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        {isExporting ? 'Exportando...' : `Exportar (${countToExport})`} <IconFileText size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}