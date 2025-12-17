import React from "react";
import "./Rendicion.css";

export default function RendicionForm({ data, configData }) {
  // Formateador de moneda: $0.000.000,00
  const fM = (v) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(parseFloat(v || 0));
  };

  const calc = (ant, rend) => {
    const a = parseFloat(ant || 0),
      r = parseFloat(rend || 0),
      d = r - a;
    return { dev: d < 0 ? fM(Math.abs(d)) : "", rei: d > 0 ? fM(d) : "" };
  };

  const totalAnt = parseFloat(data.totalFinal || 0);
  const totalRend = [
    data.rendicion_viaticos,
    data.rendicion_gasto_alojamiento,
    data.rendicion_gasto_otros,
    data.rendicion_gasto_combustible,
    data.rendicion_gastos_movil_otros,
    data.rendicion_gastos_capacit,
    data.rendicion_transporte_otros,
  ].reduce((acc, v) => acc + parseFloat(v || 0), 0);

  const diffTotal = totalRend - totalAnt;

  return (
    <div className="rendicion-wrapper">
      <div className="ritz grid-container" dir="ltr">
        <table className="waffle" cellSpacing="0" cellPadding="0">
          <thead>
            <tr>
              <th style={{ width: "357px" }}></th>
              <th style={{ width: "143px" }}></th>
              <th style={{ width: "139px" }}></th>
              <th style={{ width: "145px" }}></th>
              <th style={{ width: "145px" }}></th>
            </tr>
          </thead>
          <tbody>
            {/* FILAS 1-2: TÍTULO */}
            <tr style={{ height: "20px" }}>
              <td className="s0" colSpan="5" rowSpan="2">
                FORMULARIO PARA LA RENDICIÓN DE LA COMISIÓN DE SERVICIOS
              </td>
            </tr>
            <tr style={{ height: "20px" }}></tr>

            {/* FILA 3: ESPACIO */}
            <tr style={{ height: "19px" }}>
              <td className="s1"></td>
              <td className="s2" colSpan="4"></td>
            </tr>

            {/* FILAS 4-10: DATOS AGENTE */}
            <tr style={{ height: "40px" }}>
              <td className="s3">Nombre y Apellido del agente:</td>
              <td className="s4" colSpan="4">
                {data.apellido?.toUpperCase()}, {data.nombre?.toUpperCase()}
              </td>
            </tr>
            <tr style={{ height: "40px" }}>
              <td className="s3">Cargo o Función: </td>
              <td className="s4" colSpan="4">
                {data.cargo}
              </td>
            </tr>
            <tr style={{ height: "40px" }}>
              <td className="s3">Jornada laboral:</td>
              <td className="s4" colSpan="4">
                {data.jornada_laboral || "8 A 14"}
              </td>
            </tr>
            <tr style={{ height: "40px" }}>
              <td className="s3">Ciudad de Origen:</td>
              <td className="s4" colSpan="4">
                Viedma
              </td>
            </tr>
            <tr style={{ height: "40px" }}>
              <td className="s3">
                Lugar o lugares de la comisión e intermedios:
              </td>
              <td className="s2" colSpan="4">
                {configData.lugar_comision}
              </td>
            </tr>
            <tr style={{ height: "44px" }}>
              <td className="s3">Motivo:</td>
              <td className="s5" colSpan="4">
                {configData.motivo}
              </td>
            </tr>
            <tr style={{ height: "40px" }}>
              <td className="s3">Asiento habitual:</td>
              <td className="s4" colSpan="4">
                Viedma
              </td>
            </tr>

            {/* FILAS 11-15: SALIDA/LLEGADA */}
            <tr style={{ height: "19px" }}>
              <td colSpan="5"></td>
            </tr>
            <tr style={{ height: "35px" }}>
              <td
                className="s29"
                style={{
                  textDecoration: "underline",
                  border: "none",
                  fontWeight: "bold",
                }}
              >
                Días y horarios de salida y llegada:
              </td>
              <td colSpan="4"></td>
            </tr>
            <tr style={{ height: "43px" }}>
              <td className="s3">Salida:</td>
              <td
                className="s35"
                style={{ textAlign: "right", fontWeight: "bold" }}
              >
                {data.fecha_salida}
              </td>
              <td></td>
              <td className="s3">Hora:</td>
              <td className="s4">{data.hora_salida}</td>
            </tr>
            <tr style={{ height: "40px" }}>
              <td className="s3">Regreso:</td>
              <td
                className="s35"
                style={{ textAlign: "right", fontWeight: "bold" }}
              >
                {data.fecha_llegada}
              </td>
              <td></td>
              <td className="s3">Hora:</td>
              <td className="s4">{data.hora_llegada}</td>
            </tr>
            <tr style={{ height: "19px" }}>
              <td colSpan="5"></td>
            </tr>

            {/* FILAS 16-19: CÁLCULOS VIÁTICO */}
            <tr style={{ height: "35px" }}>
              <td className="s3">Cantidad total de días:</td>
              <td className="s19">{data.dias_computables}</td>
              <td className="s3" colSpan="2">
                Valor Diario Viático:
              </td>
              <td className="s19">{fM(data.valorDiarioCalc)}</td>
            </tr>
            <tr style={{ height: "19px" }}>
              <td colSpan="5"></td>
            </tr>
            <tr style={{ height: "19px" }}>
              <td className="s3">% de Viatico</td>
              <td className="s4">{data.porcentaje}%</td>
              <td className="s1" colSpan="2" style={{ fontSize: "11pt" }}>
                Corresponde 30% por zona y periodo
              </td>
              <td className="s2">{data.es_temporada_alta ? "ALTA" : "BAJA"}</td>
            </tr>
            <tr style={{ height: "19px" }}>
              <td colSpan="5"></td>
            </tr>

            {/* FILA 20: ESPACIO */}
            <tr style={{ height: "19px" }}>
              <td colSpan="5"></td>
            </tr>

            {/* FILAS 21-30: TABLA DE RENDICIÓN */}
            <tr style={{ height: "34px" }}>
              <td className="s25"></td>
              <td className="s26">ANTICIPO</td>
              <td className="s26">RENDICIÓN</td>
              <td className="s26">DEVOLUCIÓN</td>
              <td className="s26">REINTEGRO</td>
            </tr>
            <tr style={{ height: "51px" }}>
              <td className="s27">
                <span style={{ textDecoration: "underline" }}>Viáticos</span>:
              </td>
              <td className="s19">{fM(data.subtotal)}</td>
              <td className="s19">{fM(data.rendicion_viaticos)}</td>
              <td className="s28">
                {calc(data.subtotal, data.rendicion_viaticos).dev}
              </td>
              <td className="s28">
                {calc(data.subtotal, data.rendicion_viaticos).rei}
              </td>
            </tr>
            <tr style={{ height: "51px" }}>
              <td className="s29">Alojamiento</td>
              <td className="s28">{fM(data.gasto_alojamiento)}</td>
              <td className="s28">{fM(data.rendicion_gasto_alojamiento)}</td>
              <td className="s28">
                {
                  calc(data.gasto_alojamiento, data.rendicion_gasto_alojamiento)
                    .dev
                }
              </td>
              <td className="s28">
                {
                  calc(data.gasto_alojamiento, data.rendicion_gasto_alojamiento)
                    .rei
                }
              </td>
            </tr>
            <tr style={{ height: "51px" }}>
              <td className="s27">
                <span style={{ textDecoration: "underline" }}>Pasajes</span>{" "}
                (omnibus )
              </td>
              <td className="s28">{fM(data.gasto_otros)}</td>
              <td className="s28">{fM(data.rendicion_gasto_otros)}</td>
              <td className="s28">
                {calc(data.gasto_otros, data.rendicion_gasto_otros).dev}
              </td>
              <td className="s28">
                {calc(data.gasto_otros, data.rendicion_gasto_otros).rei}
              </td>
            </tr>
            <tr style={{ height: "51px" }}>
              <td className="s27">Combustible</td>
              <td className="s28">{fM(data.gasto_combustible)}</td>
              <td className="s28">{fM(data.rendicion_gasto_combustible)}</td>
              <td className="s28">
                {
                  calc(data.gasto_combustible, data.rendicion_gasto_combustible)
                    .dev
                }
              </td>
              <td className="s28">
                {
                  calc(data.gasto_combustible, data.rendicion_gasto_combustible)
                    .rei
                }
              </td>
            </tr>
            <tr style={{ height: "51px" }}>
              <td className="s27">
                <span style={{ textDecoration: "underline" }}>
                  Otros gastos de movilidad
                </span>{" "}
                (Artículo14º del Anexo del Decreto Nº867/25)
              </td>
              <td className="s28">{fM(data.gastos_movil_otros)}</td>
              <td className="s28">{fM(data.rendicion_gastos_movil_otros)}</td>
              <td className="s28">
                {
                  calc(
                    data.gastos_movil_otros,
                    data.rendicion_gastos_movil_otros
                  ).dev
                }
              </td>
              <td className="s28">
                {
                  calc(
                    data.gastos_movil_otros,
                    data.rendicion_gastos_movil_otros
                  ).rei
                }
              </td>
            </tr>
            <tr style={{ height: "51px" }}>
              <td className="s30">
                Artículo 11º del Anexo del Decreto Nº867/25:{" "}
                <span style={{ textDecoration: "underline" }}>
                  Capacitación
                </span>
              </td>
              <td className="s28">{fM(data.gastos_capacit)}</td>
              <td className="s28">{fM(data.rendicion_gastos_capacit)}</td>
              <td className="s28">
                {calc(data.gastos_capacit, data.rendicion_gastos_capacit).dev}
              </td>
              <td className="s28">
                {calc(data.gastos_capacit, data.rendicion_gastos_capacit).rei}
              </td>
            </tr>
            <tr style={{ height: "51px" }}>
              <td className="s30">
                <span style={{ textDecoration: "underline" }}>
                  Gastos por servicio de Ceremonial
                </span>{" "}
                (solo titular del organismo)
              </td>
              <td className="s28"></td>
              <td className="s28"></td>
              <td className="s28"></td>
              <td className="s28"></td>
            </tr>
            <tr style={{ height: "58px" }}>
              <td className="s27">
                <span style={{ textDecoration: "underline" }}>
                  Otros gastos
                </span>{" "}
                (lubricantes, peaje, repuestos, etc.) (Artículo13ºdel Anexo del
                Decreto Nº867/25)
              </td>
              <td className="s28">{fM(data.transporte_otros)}</td>
              <td className="s28">{fM(data.rendicion_transporte_otros)}</td>
              <td className="s28">
                {
                  calc(data.transporte_otros, data.rendicion_transporte_otros)
                    .dev
                }
              </td>
              <td className="s28">
                {
                  calc(data.transporte_otros, data.rendicion_transporte_otros)
                    .rei
                }
              </td>
            </tr>
            <tr style={{ height: "51px" }}>
              <td className="s26">TOTAL</td>
              <td className="s31">{fM(totalAnt)}</td>
              <td className="s31">{fM(totalRend)}</td>
              <td className="s32">
                {diffTotal < 0 ? fM(Math.abs(diffTotal)) : ""}
              </td>
              <td className="s32">{diffTotal > 0 ? fM(diffTotal) : ""}</td>
            </tr>

            {/* FILA 31: ESPACIO */}
            <tr style={{ height: "20px" }}>
              <td colSpan="5"></td>
            </tr>

            {/* FILAS 32-35: FIRMA DEL AGENTE (CORREGIDO) */}
            <tr style={{ height: "100px" }} rowSpan="4">
              <td
                className="s34"
                rowSpan="4"
                style={{
                  verticalAlign: "middle",
                  textAlign: "center", // Alineación horizontal clásica
                  display: "flex", // Activa Flexbox
                  alignItems: "center", // Centrado vertical en Flex
                  justifyContent: "center", // Centrado horizontal en Flex
                  height: "80px", // Asegura que ocupe el alto de las 4 filas (20px * 4)
                }}
              >
                {data.firma ==="NULL" ? <span></span> : data.firma? (
                  <img
                    src={data.firma}
                    alt="Firma Agente"
                    style={{
                      maxHeight: "100px", // Ajustado para no desbordar las 4 filas de 20px
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <span style={{ color: "#ccc", fontSize: "10pt" }}>
                    {data.apellido?.toUpperCase()}, {data.nombre?.toUpperCase()}
                  </span>
                )}
              </td>
              <td colSpan="4"></td>
            </tr>
       

            {/* FILA 36: ETIQUETAS FIRMAS */}
            <tr style={{ height: "20px" }}>
              <td className="s34">Firma del agente</td>
              <td className="s34" colSpan="4">
                Firma del titular de la jurisdicción o funcionario autorizado
              </td>
            </tr>

            {/* FILAS 37-39: ESPACIOS FINALES */}
            <tr style={{ height: "20px" }}>
              <td colSpan="5"></td>
            </tr>
            <tr style={{ height: "20px" }}>
              <td colSpan="5"></td>
            </tr>
            <tr style={{ height: "20px" }}>
              <td colSpan="5"></td>
            </tr>

            {/* FILA 40: LUGAR Y FECHA */}
            <tr style={{ height: "19px" }}>
              <td className="s35">LUGAR Y FECHA</td>
              <td className="s36" colSpan="4">
                Viedma,{" "}
                {new Date().toLocaleDateString("es-AR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
