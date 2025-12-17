import React, { useState, useEffect, useRef } from "react";
import { 
  IconLoader, IconSave, IconDownload, IconCloudUpload, IconTrash, 
  IconPlus, IconSearch, IconPrinter 
} from "../../components/ui/Icons";

// --- UTILIDADES DE GOOGLE SHEETS PARSER ---
const parseGoogleSheetData = (sheetData) => {
  // Convierte la respuesta cruda de la API de Google Sheets a nuestro formato interno
  const rows = [];
  const gridData = sheetData.sheets?.[0]?.data?.[0]?.rowData || [];

  gridData.forEach((row, rIndex) => {
    const rowObj = { id: rIndex, cells: {} };
    if (row.values) {
      row.values.forEach((cell, cIndex) => {
        // Extraer Valor
        let value = "";
        if (cell.userEnteredValue) {
          if (cell.userEnteredValue.stringValue) value = cell.userEnteredValue.stringValue;
          else if (cell.userEnteredValue.numberValue) value = String(cell.userEnteredValue.numberValue);
          else if (cell.userEnteredValue.boolValue) value = String(cell.userEnteredValue.boolValue);
        }

        // Extraer Estilo (Fondo y Negrita)
        let style = {};
        const format = cell.userEnteredFormat;
        if (format) {
          // Color de Fondo
          if (format.backgroundColor) {
            const { red, green, blue } = format.backgroundColor;
            // Google devuelve valores 0-1, convertimos a RGB
            const r = Math.floor((red || 0) * 255);
            const g = Math.floor((green || 0) * 255);
            const b = Math.floor((blue || 0) * 255);
            // Si es blanco puro o transparente, no lo guardamos para ahorrar espacio
            if (!(r === 255 && g === 255 && b === 255)) {
              style.backgroundColor = `rgb(${r},${g},${b})`;
            }
          }
          // Negrita
          if (format.textFormat?.bold) {
            style.fontWeight = 'bold';
          }
          // Alineación
          if (format.horizontalAlignment) {
             if(format.horizontalAlignment === 'CENTER') style.textAlign = 'center';
             if(format.horizontalAlignment === 'RIGHT') style.textAlign = 'right';
          }
        }

        rowObj.cells[cIndex] = { value, style };
      });
    }
    rows.push(rowObj);
  });
  return rows;
};

// --- COMPONENTE CELDA ---
const Cell = ({ rowIndex, colIndex, cellData, isSelected, onSelect, onChange, onStyleChange }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isSelected && inputRef.current) inputRef.current.focus();
  }, [isSelected]);

  const style = {
    backgroundColor: cellData?.style?.backgroundColor || 'transparent',
    fontWeight: cellData?.style?.fontWeight || 'normal',
    textAlign: cellData?.style?.textAlign || 'left',
  };

  return (
    <div 
      className={`relative border-r border-b border-slate-200 min-w-[100px] h-8 ${isSelected ? 'ring-2 ring-indigo-500 z-10' : ''}`}
      style={style}
      onClick={() => onSelect(rowIndex, colIndex)}
    >
      <input
        ref={inputRef}
        className="w-full h-full bg-transparent outline-none px-1 text-sm font-inherit text-inherit"
        value={cellData?.value || ""}
        onChange={(e) => onChange(rowIndex, colIndex, e.target.value)}
        style={{ textAlign: style.textAlign }} // Heredar alineación al input
      />
    </div>
  );
};

export default function SheetEditor({ supabase }) {
  // Estado de la Hoja
  // Estructura: [ { id: 0, cells: { 0: { value: "A1", style: {...} }, 1: ... } } ]
  const [rows, setRows] = useState([]);
  const [colsCount, setColsCount] = useState(10); // Columnas iniciales A-J
  
  const [selectedCell, setSelectedCell] = useState(null); // { r, c }
  const [loading, setLoading] = useState(false);
  const [sheetIdInput, setSheetIdInput] = useState("");

  // Inicializar grilla vacía
  useEffect(() => {
    const initialRows = Array.from({ length: 20 }).map((_, i) => ({ id: i, cells: {} }));
    setRows(initialRows);
  }, []);

  // --- LOGICA DE IMPORTACIÓN ---
  const handleImport = async () => {
    if (!sheetIdInput) return alert("Ingresa un ID de Google Sheet");
    setLoading(true);

    try {
      // 1. Llamamos a nuestra Edge Function (que actúa de proxy para ocultar el API Key)
      // O si tienes configurado el cliente JS de Google en el front, úsalo directo.
      // Aquí asumo que usaremos una función de Supabase para seguridad.
      const { data, error } = await supabase.functions.invoke('google-sheets-proxy', {
        body: { 
            action: 'get_grid_data', 
            spreadsheetId: sheetIdInput 
        }
      });

      if (error) throw new Error(error.message || "Error al conectar con Google");
      if (!data) throw new Error("No se recibieron datos");

      // 2. Parseamos la data "fielmente"
      const importedRows = parseGoogleSheetData(data);
      
      // 3. Ajustamos el tamaño de la grilla
      const maxCols = importedRows.reduce((max, row) => {
          const cells = Object.keys(row.cells).map(Number);
          return Math.max(max, ...cells);
      }, 0);
      
      setColsCount(maxCols + 5); // +5 de margen
      setRows(importedRows);
      alert("¡Importación exitosa! Se han traído valores y estilos.");

    } catch (err) {
      console.error(err);
      // MODO FALLBACK (Para pruebas si no tienes la Edge Function configurada aún):
      // Simula una importación local para que veas que funciona la UI
      if (confirm("Error de conexión API. ¿Cargar datos de prueba?")) {
         const mockRows = Array.from({ length: 10 }).map((_, i) => ({ id: i, cells: { 
             0: { value: `Fila ${i}`, style: { fontWeight: i===0?'bold':'normal', backgroundColor: i%2===0 ? '#f0f9ff' : 'white' } },
             1: { value: Math.floor(Math.random()*100), style: {} }
         }}));
         setRows(mockRows);
      }
    } finally {
      setLoading(false);
    }
  };

  // --- MANEJADORES ---
  const handleCellChange = (r, c, val) => {
    setRows(prev => prev.map(row => {
      if (row.id === r) {
        return { 
            ...row, 
            cells: { 
                ...row.cells, 
                [c]: { ...row.cells[c], value: val } 
            } 
        };
      }
      return row;
    }));
  };

  const handleStyleChange = (key, val) => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    
    setRows(prev => prev.map(row => {
      if (row.id === r) {
        const currentCell = row.cells[c] || {};
        const currentStyle = currentCell.style || {};
        return {
          ...row,
          cells: {
            ...row.cells,
            [c]: { 
                ...currentCell, 
                style: { ...currentStyle, [key]: val } 
            }
          }
        };
      }
      return row;
    }));
  };

  // Generar letras de columnas (A, B, C...)
  const getColLabel = (index) => {
    let label = "";
    let i = index;
    while (i >= 0) {
      label = String.fromCharCode((i % 26) + 65) + label;
      i = Math.floor(i / 26) - 1;
    }
    return label;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* TOOLBAR */}
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center gap-2">
        {/* Sección Importar */}
        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-200 mr-4 shadow-sm">
            <div className="text-green-600"><IconCloudUpload size={18}/></div>
            <input 
                className="text-xs outline-none w-32 md:w-48 placeholder:text-slate-400" 
                placeholder="ID de Google Sheet..." 
                value={sheetIdInput}
                onChange={(e) => setSheetIdInput(e.target.value)}
            />
            <button 
                onClick={handleImport}
                disabled={loading}
                className="text-xs font-bold bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100 transition-colors"
            >
                {loading ? "Cargando..." : "Importar"}
            </button>
        </div>

        {/* Sección Estilos (Activa si hay selección) */}
        <div className="flex items-center gap-1 border-l border-slate-300 pl-4">
            <button 
                onClick={() => handleStyleChange('fontWeight', 'bold')}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200 font-bold text-slate-700"
                title="Negrita"
            >B</button>
            
            <div className="relative w-7 h-7 rounded overflow-hidden hover:bg-slate-200 flex items-center justify-center cursor-pointer" title="Color de Fondo">
                <input 
                    type="color" 
                    className="absolute opacity-0 w-full h-full cursor-pointer"
                    onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                />
                <div className="w-4 h-4 border border-slate-300 bg-white" style={{ backgroundColor: selectedCell ? rows[selectedCell.r]?.cells[selectedCell.c]?.style?.backgroundColor : 'transparent' }}></div>
            </div>

            <button 
                onClick={() => handleStyleChange('textAlign', 'left')}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200 text-slate-600 text-xs"
            >Izq</button>
             <button 
                onClick={() => handleStyleChange('textAlign', 'center')}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200 text-slate-600 text-xs"
            >Cen</button>
        </div>

        {/* Sección Acciones */}
        <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded text-xs font-bold hover:text-indigo-600 hover:border-indigo-200 shadow-sm">
                <IconPrinter size={14}/> 
                <span>PDF / Recortar</span>
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 shadow-sm">
                <IconSave size={14}/> 
                <span>Guardar</span>
            </button>
        </div>
      </div>

      {/* SPREADSHEET CANVAS */}
      <div className="flex-1 overflow-auto bg-slate-100 relative">
        <div className="inline-block bg-white shadow-sm m-4">
            {/* Headers Columnas */}
            <div className="flex sticky top-0 z-20 bg-slate-50 border-b border-slate-300">
                <div className="w-10 flex-shrink-0 bg-slate-100 border-r border-slate-300"></div> {/* Corner */}
                {Array.from({ length: colsCount }).map((_, i) => (
                    <div key={i} className="min-w-[100px] h-6 flex items-center justify-center text-[10px] font-bold text-slate-500 border-r border-slate-300 bg-slate-50 select-none">
                        {getColLabel(i)}
                    </div>
                ))}
            </div>

            {/* Rows */}
            <div>
                {rows.map((row) => (
                    <div key={row.id} className="flex">
                        {/* Header Fila */}
                        <div className="w-10 flex-shrink-0 h-8 flex items-center justify-center text-[10px] font-bold text-slate-500 bg-slate-50 border-r border-b border-slate-300 select-none sticky left-0 z-10">
                            {row.id + 1}
                        </div>
                        {/* Celdas */}
                        {Array.from({ length: colsCount }).map((_, cIndex) => (
                            <Cell 
                                key={`${row.id}-${cIndex}`}
                                rowIndex={row.id}
                                colIndex={cIndex}
                                cellData={row.cells[cIndex]}
                                isSelected={selectedCell?.r === row.id && selectedCell?.c === cIndex}
                                onSelect={(r, c) => setSelectedCell({ r, c })}
                                onChange={handleCellChange}
                            />
                        ))}
                    </div>
                ))}
            </div>
            
            {/* Botón añadir filas */}
            <button 
                onClick={() => setRows(prev => [...prev, { id: prev.length, cells: {} }])}
                className="m-2 flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 font-bold"
            >
                <IconPlus size={14}/> Añadir Fila
            </button>
        </div>
      </div>
    </div>
  );
}