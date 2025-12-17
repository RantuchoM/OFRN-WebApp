import React from "react";
import { IconArrowLeft, IconPrinter } from "../../../components/ui/Icons";
import "./ViaticosSheet.css"; // Asegúrate de importar el CSS actualizado

export default function ViaticosForm({ onBack, initialData, configData }) {
  const data = initialData || {};
  const config = configData || {};

  // Formato de fecha
  const formatDate = (isoStr) => {
    if (!isoStr) return "";
    const [y, m, d] = isoStr.split("-");
    return `${d}/${m}/${y}`;
  };

  // Fecha actual
  const now = new Date();
  const months = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const fechaActualTexto = `${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
  
  // Datos por defecto
  const localidadMusico = data.ciudad_origen || "Viedma";
  
  // Símbolo para checkboxes
  const X = <span style={{fontWeight:'bold', display:'block', textAlign:'center'}}>X</span>;

  // Cálculo del subtotal para el campo "Anticipo"
  const subtotalViaticos = (parseFloat(data.dias_computables || 0) * parseFloat(data.valorDiarioCalc || 0)).toFixed(2);

  // Mapeo de booleanos a X
  const checkAereo = data.tipo_pasaje === 'aereo' ? X : null;
  const checkTerrestre = data.tipo_pasaje === 'terrestre' ? X : null;
  const checkPatenteOficial = data.tipo_vehiculo === 'oficial' ? X : null;
  const checkPatenteParticular = data.tipo_vehiculo === 'particular' ? X : null;
  // const checkOtros = ... (lógica para otros medios si existe)

  return (
    <div className="w-full h-full flex flex-col bg-slate-100 font-sans">
      
      {/* BARRA DE HERRAMIENTAS (NO SE IMPRIME) */}
      <div className="bg-white p-4 shadow-sm border-b border-slate-200 flex justify-between items-center print:hidden sticky top-0 z-50">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-medium transition-colors">
          <IconArrowLeft size={20} /> Volver
        </button>
        <button onClick={() => window.print()} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm">
          <IconPrinter size={20} /> Imprimir
        </button>
      </div>

      {/* ÁREA DE IMPRESIÓN (HOJA) */}
      <div className="viaticos-wrapper print:p-0 print:bg-white print:overflow-visible">
        <div className="viaticos-sheet print:shadow-none print:m-0 print:p-0">
          
          <div className="ritz grid-container" dir="ltr">
            <table className="waffle" cellSpacing="0" cellPadding="0">
              <colgroup>
                <col style={{width: '146px'}}/>
                <col style={{width: '46px'}}/>
                <col style={{width: '106px'}}/>
                <col style={{width: '151px'}}/>
                <col style={{width: '106px'}}/>
                <col style={{width: '106px'}}/>
                <col style={{width: '106px'}}/>
                <col style={{width: '106px'}}/>
              </colgroup>
              <tbody>
                <tr style={{height: '20px'}}>
                  <td className="s0" dir="ltr" colSpan="8">
                    FORMULARIO PARA LA AUTORIZACIÓN DE LAS COMISIONES OFICIALES DENTRO DEL PAIS <br/>
                    Título I – DECTO-2025-867-E-GDERNE-RNE
                  </td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s1 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'296px', left:'-1px'}}>
                      Nombre y Apellido del agente:
                    </div>
                  </td>
                  <td className="s2"></td>
                  <td className="s3"></td>
                  <td className="s4" dir="ltr" colSpan="5">
                    {data.nombre} {data.apellido}
                  </td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s5" dir="ltr">Cargo o Función:</td>
                  <td className="s6" dir="ltr" colSpan="7">
                    {data.cargo || "Músico"}
                  </td>
                </tr>
                <tr style={{height: '25px'}}>
                  <td className="s5" dir="ltr">Jornada laboral:</td>
                  <td className="s6" dir="ltr" colSpan="7">
                    {/* Placeholder jornada */}
                  </td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s5" dir="ltr">Ciudad de Origen:</td>
                  <td className="s7" dir="ltr"></td>
                  <td className="s8" dir="ltr" colSpan="6">
                    {localidadMusico}
                  </td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s1 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'447px', left:'-1px'}}>
                      Lugar o lugares de la comisión e intermedios:
                    </div>
                  </td>
                  <td className="s2"></td>
                  <td className="s9"></td>
                  <td className="s3"></td>
                  <td className="s4" dir="ltr" colSpan="4">
                    {config.lugar_comision}
                  </td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s5" dir="ltr">Motivo:</td>
                  <td className="s10" dir="ltr" colSpan="7">
                    {config.motivo}
                  </td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s5" dir="ltr">Asiento habitual:</td>
                  <td className="s7" dir="ltr"></td>
                  <td className="s8" dir="ltr" colSpan="6">
                    {localidadMusico}
                  </td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s11"></td>
                  <td className="s12"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s13 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'447px', left:'-1px'}}>
                      Días y horarios estimados de salida y llegada:
                    </div>
                  </td>
                  <td className="s2"></td>
                  <td className="s2"></td>
                  <td className="s14"></td>
                  <td className="s14"></td>
                  <td className="s11"></td>
                  <td className="s11" dir="ltr"></td>
                  <td className="s11"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s5" dir="ltr">Salida:</td>
                  <td className="s5" dir="ltr">Día</td>
                  <td className="s15" dir="ltr" colSpan="2">
                    {formatDate(data.fecha_salida)}
                  </td>
                  <td className="s5" dir="ltr">Hora:</td>
                  <td className="s15" dir="ltr" colSpan="2">
                    {data.hora_salida}
                  </td>
                  <td className="s11"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s5" dir="ltr">Llegada:</td>
                  <td className="s5" dir="ltr">Día</td>
                  <td className="s15" dir="ltr" colSpan="2">
                    {formatDate(data.fecha_llegada)}
                  </td>
                  <td className="s5" dir="ltr">Hora:</td>
                  <td className="s15" dir="ltr" colSpan="2">
                    {data.hora_llegada}
                  </td>
                  <td className="s11"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s1 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'190px', left:'-1px'}}>
                      Cantidad total de días:
                    </div>
                  </td>
                  <td className="s14"></td>
                  <td className="s16" dir="ltr" colSpan="2">
                    {data.dias_computables}
                  </td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s17" dir="ltr">Alojamiento</td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11" dir="ltr">Convenio</td>
                  <td className="s18" dir="ltr" colSpan="2">
                    {data.gasto_alojamiento}
                  </td>
                </tr>
                <tr style={{height: '8px'}}>
                  <td className="s11" dir="ltr"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s13 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'190px', left:'-1px'}}>
                      Anticipo de viáticos
                    </div>
                  </td>
                  <td className="s14"></td>
                  <td className="s14"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s18" dir="ltr" colSpan="2">
                    {subtotalViaticos}
                  </td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s19 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'788px', left:'-1px'}}>
                      ( {data.dias_computables} días de viáticos a razón de $ {data.valorDiarioCalc} diarios -equivalentes al 100% del viático diario)
                    </div>
                  </td>
                  <td className="s2"></td>
                  <td className="s2"></td>
                  <td className="s2"></td>
                  <td className="s2"></td>
                  <td className="s2"></td>
                  <td className="s2"></td>
                  <td className="s14"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s19 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'659px', left:'-1px'}}>
                      Corresponde abonar 30% de incremento en virtud de zona y período específico .......
                    </div>
                  </td>
                  <td className="s2"></td>
                  <td className="s2"></td>
                  <td className="s2"></td>
                  <td className="s2"></td>
                  <td className="s14"></td>
                  <td className="s20 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'161px', left:'-1px'}}>
                      {/* Checkbox temporada */}
                    </div>
                  </td>
                  <td className="s14" dir="ltr"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s13 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'447px', left:'-1px'}}>
                      Medio de movilidad (marcar con x de corresponder)
                    </div>
                  </td>
                  <td className="s2"></td>
                  <td className="s2"></td>
                  <td className="s14"></td>
                  <td className="s14"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s5" dir="ltr">-Pasajes</td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s21" dir="ltr" colSpan="2">
                    {data.gasto_pasajes}
                  </td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s5" dir="ltr">    -aéreos</td>
                  <td className="s18 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'43px', left:'-1px'}}>
                      {checkAereo}
                    </div>
                  </td>
                  <td className="s5" dir="ltr">    -terrestres</td>
                  <td className="s18" dir="ltr">
                    {checkTerrestre}
                  </td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11" dir="ltr"></td>
                  <td className="s11"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s1 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'296px', left:'-1px'}}>
                      Vehículo:  -oficial Patente Nro
                    </div>
                  </td>
                  <td className="s22" dir="ltr"></td>
                  <td className="s3"></td>
                  <td className="s23" dir="ltr">
                    {data.patente_oficial}
                  </td>
                  <td className="s24 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'210px', left:'-1px'}}>
                      {checkPatenteOficial}
                    </div>
                  </td>
                  <td className="s14"></td>
                  <td className="s14"></td>
                  <td className="s11"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s1 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'296px', left:'-1px'}}>
                                      -particular Patente Nro    
                    </div>
                  </td>
                  <td className="s22" dir="ltr"></td>
                  <td className="s14"></td>
                  <td className="s23" dir="ltr">
                    {data.patente_particular}
                  </td>
                  <td className="s24 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'210px', left:'-1px'}}>
                      {checkPatenteParticular}
                    </div>
                  </td>
                  <td className="s14"></td>
                  <td className="s14"></td>
                  <td className="s11"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s1 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'190px', left:'-1px'}}>
                      Otro (indicar medio)
                    </div>
                  </td>
                  <td className="s14"></td>
                  <td className="s23" dir="ltr">
                    {/* Check otros */}
                  </td>
                  <td className="s11" dir="ltr">
                    {/* transporte otros texto */}
                  </td>
                  <td className="s25" dir="ltr"></td>
                  <td className="s25" dir="ltr"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s13 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'190px', left:'-1px'}}>
                      Gastos de combustible
                    </div>
                  </td>
                  <td className="s14"></td>
                  <td className="s14"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s15" dir="ltr" colSpan="2">
                    {data.gasto_combustible}
                  </td>
                </tr>
                <tr style={{height: '13px'}}>
                  <td className="s25" dir="ltr"></td>
                  <td className="s25" dir="ltr"></td>
                  <td className="s25" dir="ltr"></td>
                  <td className="s25" dir="ltr"></td>
                  <td className="s25" dir="ltr"></td>
                  <td className="s25" dir="ltr"></td>
                  <td className="s26" dir="ltr"></td>
                  <td className="s26" dir="ltr"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s25" dir="ltr">
                    <span style={{fontWeight:'bold', textDecoration:'underline'}}>Otros gastos</span>
                  </td>
                  <td className="s25" dir="ltr" colSpan="5">
                    (lubricantes, peaje, repuestos, etc.) -
                  </td>
                  <td className="s15" dir="ltr" colSpan="2">
                    {data.gasto_otros}
                  </td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s27 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'447px', left:'-1px'}}>
                      Artículo 13º del Anexo del DECTO-2025-867-E-GDERNE-RNE
                    </div>
                  </td>
                  <td className="s2"></td>
                  <td className="s2"></td>
                  <td className="s14"></td>
                  <td className="s14"></td>
                  <td className="s11"></td>
                  <td className="s26"></td>
                  <td className="s26"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s13 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'553px', left:'-1px'}}>
                      Gastos Artículo 11º del Anexo del DECTO-2025-867-E-GDERNE-RNE:
                    </div>
                  </td>
                  <td className="s2"></td>
                  <td className="s2" dir="ltr"></td>
                  <td className="s2"></td>
                  <td className="s14"></td>
                  <td className="s14"></td>
                  <td className="s26" dir="ltr" colSpan="2"></td>
                </tr>
                <tr style={{height: '10px'}}>
                  <td className="s17" dir="ltr"></td>
                  <td className="s11"></td>
                  <td className="s11" dir="ltr"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s26" dir="ltr"></td>
                  <td className="s26" dir="ltr"></td>
                </tr>
                <tr style={{height: '26px'}}>
                  <td className="s13 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'190px', left:'-1px'}}>
                      <span style={{fontWeight:'normal'}}>•   </span>
                      <span style={{fontWeight:'normal'}}>Gastos de capacitación</span>
                    </div>
                  </td>
                  <td className="s14"></td>
                  <td className="s14" dir="ltr"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s15" dir="ltr" colSpan="2">
                    {/* gastos_capacit */}
                  </td>
                </tr>
                <tr style={{height: '8px'}}>
                  <td className="s17" dir="ltr"></td>
                  <td className="s11"></td>
                  <td className="s11" dir="ltr"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s26" dir="ltr"></td>
                  <td className="s26" dir="ltr"></td>
                </tr>
                <tr style={{height: '26px'}}>
                  <td className="s13 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'553px', left:'-1px'}}>
                      <span style={{fontWeight:'normal'}}>•   </span>
                      <span style={{fontWeight:'normal'}}>Gastos por servicio de Ceremonial</span>
                      <span style={{fontWeight:'normal'}}> (solo titular del organismo)</span>
                    </div>
                  </td>
                  <td className="s2"></td>
                  <td className="s2" dir="ltr"></td>
                  <td className="s2"></td>
                  <td className="s14"></td>
                  <td className="s14"></td>
                  <td className="s15" dir="ltr" colSpan="2"></td>
                </tr>
                <tr style={{height: '11px'}}>
                  <td className="s11" dir="ltr"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s26" dir="ltr"></td>
                  <td className="s26" dir="ltr"></td>
                </tr>
                <tr style={{height: '26px'}}>
                  <td className="s19 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'553px', left:'-1px'}}>
                      <span style={{fontWeight:'bold', textDecoration:'underline'}}>Otros gastos de movilidad</span> (Artículo 14° del Anexo del Decreto N° 1847/17
                    </div>
                  </td>
                  <td className="s2"></td>
                  <td className="s2"></td>
                  <td className="s2"></td>
                  <td className="s14"></td>
                  <td className="s14"></td>
                  <td className="s15" dir="ltr" colSpan="2">
                    {/* gastos_movil_otros */}
                  </td>
                </tr>
                <tr style={{height: '16px'}}>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s26" dir="ltr"></td>
                  <td className="s26"></td>
                </tr>
                <tr style={{height: '26px'}}>
                  <td className="s17" dir="ltr">Total del Anticipo:</td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s15" dir="ltr" colSpan="2">
                    {/* LOGICA TOTAL */}
                  </td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s19 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'765px', left:'-1px'}}>
                      Autorizo al descuento en mi recibo de haberes sobre las sumas pendientes de rendición y/o devolución
                    </div>
                  </td>
                  <td className="s2"></td>
                  <td className="s2"></td>
                  <td className="s2"></td>
                  <td className="s2"></td>
                  <td className="s2"></td>
                  <td className="s14"></td>
                  <td className="s14"></td>
                </tr>
                <tr style={{height: '45px'}}>
                  <td className="s26" colSpan="3" rowSpan="2"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                </tr>
                <tr style={{height: '45px'}}>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s11" colSpan="3"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s28" dir="ltr" colSpan="3">Firma del agente</td>
                  <td className="s28"></td>
                  <td className="s29"></td>
                  <td className="s28" dir="ltr" colSpan="3">
                    Firma del titular de la jurisdicción o funcionario autorizado
                  </td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s13 softmerge" dir="ltr">
                    <div className="softmerge-inner" style={{width:'296px', left:'-1px'}}>
                      Lugar y fecha de solicitud 
                    </div>
                  </td>
                  <td className="s2"></td>
                  <td className="s14"></td>
                  <td className="s14"></td>
                  <td className="s11" dir="ltr" colSpan="4">
                    {localidadMusico}, {fechaActualTexto}
                  </td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                  <td className="s11"></td>
                </tr>
                <tr style={{height: '20px'}}>
                  <td className="s30" dir="ltr" colSpan="8" rowSpan="2">
                    1  Indicar el Nº de Resolución que delegó la facultad para autorización de las comisiones oficiales, en un funcionario con rango no inferior a Subsecretario, de conformidad con lo dispuesto por el artículo 3º del Anexo del DECTO-2025-867-E-GDERNE-RNE.
                  </td>
                </tr>
                <tr style={{height: '20px'}}></tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}