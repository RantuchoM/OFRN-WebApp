import React, { useEffect, useState } from "react";
import { Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { IconAlertCircle, IconLoader } from "../../components/ui/Icons";
import {
  getFimbaAgendaConsultaByToken,
  getFimbaEdicionByTokenConsulta,
} from "../../services/fimbaService";
import { writeFimbaConsultaEdicionSession } from "../../utils/fimbaUserSession";
import {
  canonicalizeAgendaConsultaFilters,
  filtersFromAgendaConsultaRow,
  parseFimbaAgendaUrlSearchParams,
} from "../../utils/fimbaAgendaUrlParams";
import FimbaLayout from "./FimbaLayout";

function sessionFromShareFilters(token, edicionId, filters, kind) {
  const canon = canonicalizeAgendaConsultaFilters(filters);
  return {
    token,
    id_edicion: edicionId,
    agenda_only: true,
    agenda_query_locked: true,
    consulta_kind: kind,
    propuestaIds: canon.propuestaIds,
    grupoIds: canon.grupoIds,
    locacionIds: canon.locacionIds,
    includeTutti: canon.includeTutti,
    origen: canon.origen,
  };
}

/**
 * Entry point enlace consulta de edición: /fimba/c/:token[/agenda]
 * 1) Token de `fimba_agenda_consultas` → agenda RO con filtros congelados (sin query).
 * 2) Token de `fimba_ediciones.token_consulta` → consulta edición, o agenda-only
 *    si la URL termina en /agenda (legacy: query string se congela en sesión).
 */
export default function FimbaEdicionConsultaEntry() {
  const { token } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const openAgenda = /\/agenda\/?$/.test(location.pathname);
  const [state, setState] = useState({
    loading: true,
    edicionId: null,
    error: null,
    stripSearch: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = String(token || "").trim();
      if (!t) {
        if (!cancelled) {
          setState({
            loading: false,
            edicionId: null,
            error: "Enlace incompleto.",
            stripSearch: false,
          });
        }
        return;
      }

      const shareRes = await getFimbaAgendaConsultaByToken(t);
      if (cancelled) return;
      if (shareRes.consulta) {
        try {
          writeFimbaConsultaEdicionSession(
            sessionFromShareFilters(
              t,
              shareRes.consulta.id_edicion,
              filtersFromAgendaConsultaRow(shareRes.consulta),
              "agenda_share",
            ),
          );
        } catch (e) {
          setState({
            loading: false,
            edicionId: null,
            error: e?.message || "No se pudo abrir la sesión de consulta",
            stripSearch: false,
          });
          return;
        }
        setState({
          loading: false,
          edicionId: shareRes.consulta.id_edicion,
          error: null,
          stripSearch: true,
        });
        return;
      }

      const { edicion, error } = await getFimbaEdicionByTokenConsulta(t);
      if (cancelled) return;
      if (error || !edicion) {
        setState({
          loading: false,
          edicionId: null,
          error:
            shareRes.error?.message ||
            error?.message ||
            "Enlace inválido o regenerado.",
          stripSearch: false,
        });
        return;
      }
      try {
        if (openAgenda) {
          const parsed = parseFimbaAgendaUrlSearchParams(searchParams);
          writeFimbaConsultaEdicionSession(
            sessionFromShareFilters(t, edicion.id, parsed, "edicion"),
          );
        } else {
          writeFimbaConsultaEdicionSession({
            token: t,
            id_edicion: edicion.id,
            agenda_only: false,
            agenda_query_locked: false,
            consulta_kind: "edicion",
          });
        }
      } catch (e) {
        setState({
          loading: false,
          edicionId: null,
          error: e?.message || "No se pudo abrir la sesión de consulta",
          stripSearch: false,
        });
        return;
      }
      setState({
        loading: false,
        edicionId: edicion.id,
        error: null,
        stripSearch: false,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [token, openAgenda, searchParams.toString()]);

  if (state.loading) {
    return (
      <FimbaLayout mode="token" subtitle="Consulta">
        <div
          className="fimba-card fimba-muted"
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <IconLoader size={18} className="animate-spin" /> Validando enlace de
          consulta…
        </div>
      </FimbaLayout>
    );
  }

  if (state.error || !state.edicionId) {
    return (
      <FimbaLayout mode="token" subtitle="FIMBA">
        <div
          className="fimba-error"
          style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
        >
          <IconAlertCircle size={18} />
          <div>
            <strong style={{ display: "block", marginBottom: 4 }}>
              No se puede abrir el enlace
            </strong>
            {state.error || "Enlace inválido."}
          </div>
        </div>
      </FimbaLayout>
    );
  }

  const keepSearch = !state.stripSearch && searchParams.toString();
  return (
    <Navigate
      to={{
        pathname: `/fimba/edicion/${state.edicionId}${openAgenda || state.stripSearch ? "/agenda" : ""}`,
        search: keepSearch ? `?${searchParams.toString()}` : "",
      }}
      replace
    />
  );
}
