import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  STAGE_PLOT_LOCK_HEARTBEAT_MS,
  STAGE_PLOT_LOCK_SETTLE_MS,
  getStagePlotById,
  heartbeatStagePlotLock,
  isStagePlotLockStale,
  releaseStagePlotLock,
  stagePlotSameInstant,
  takeStagePlotLock,
} from "../services/stagePlotService";

function formatIntegranteName(row, id) {
  const nombre = `${row?.nombre || ""} ${row?.apellido || ""}`.trim();
  return nombre || (id != null ? `Integrante ${id}` : "Alguien");
}

function readPresence(channel) {
  const state = channel?.presenceState?.() || {};
  const seen = new Set();
  const list = [];
  for (const key of Object.keys(state)) {
    const metas = state[key] || [];
    for (const meta of metas) {
      const id = Number(meta?.integrante_id);
      if (!Number.isFinite(id) || seen.has(id)) continue;
      seen.add(id);
      list.push({
        id,
        nombre: meta?.nombre || `Integrante ${id}`,
      });
    }
  }
  list.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return list;
}

/**
 * Candado de un editor por lienzo.
 * Quien no lo tiene mira el plano: el padre debe dejar `canEdit` en false
 * y no persistir. Este hook no parte el JSON del payload.
 *
 * @param {object} opts
 * @param {import("@supabase/supabase-js").SupabaseClient|null} opts.supabase
 * @param {string|null} opts.plotId
 * @param {number|null} opts.integranteId
 * @param {string} opts.selfName
 * @param {boolean} opts.staffCanEdit
 * @param {React.MutableRefObject<(plotId: string, opts?: { requireLock?: boolean }) => Promise<void>>} opts.flushPendingRef
 * @param {React.MutableRefObject<(row: object) => void>} opts.applyRemotePayloadRef
 * @param {React.MutableRefObject<string|null>} opts.savedUpdatedAtRef
 */
export function useStagePlotEditLock({
  supabase,
  plotId,
  integranteId,
  selfName,
  staffCanEdit,
  flushPendingRef,
  applyRemotePayloadRef,
  savedUpdatedAtRef,
}) {
  const [holdsLock, setHoldsLock] = useState(false);
  const [settling, setSettling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [holderId, setHolderId] = useState(null);
  const [holderName, setHolderName] = useState("");
  const [heartbeatAt, setHeartbeatAt] = useState(null);
  const [viewers, setViewers] = useState([]);

  const holdsLockRef = useRef(false);
  const settlingRef = useRef(false);
  const holderIdRef = useRef(null);
  const heartbeatRef = useRef(null);
  const lockPlotIdRef = useRef(null);
  const losingRef = useRef(false);
  const selfNameRef = useRef(selfName || "");
  const staffRef = useRef(staffCanEdit);
  const integranteRef = useRef(integranteId);
  const plotIdRef = useRef(plotId);
  const heartbeatTimerRef = useRef(null);
  const busyRef = useRef(false);
  const settleTimerRef = useRef(null);
  const supabaseRef = useRef(supabase);

  useEffect(() => {
    selfNameRef.current = selfName || "";
  }, [selfName]);
  useEffect(() => {
    staffRef.current = staffCanEdit;
  }, [staffCanEdit]);
  useEffect(() => {
    integranteRef.current = integranteId;
  }, [integranteId]);
  useEffect(() => {
    plotIdRef.current = plotId;
  }, [plotId]);
  useEffect(() => {
    supabaseRef.current = supabase;
  }, [supabase]);
  useEffect(() => {
    settlingRef.current = settling;
  }, [settling]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const clearSettle = useCallback(() => {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    settlingRef.current = false;
    setSettling(false);
  }, []);

  const applyHolder = useCallback((id, heartbeat, nameHint) => {
    const nextId = id == null || !Number.isFinite(Number(id)) ? null : Number(id);
    holderIdRef.current = nextId;
    heartbeatRef.current = heartbeat || null;
    setHolderId(nextId);
    setHeartbeatAt(heartbeat || null);
    if (!nextId) {
      setHolderName("");
      return;
    }
    if (nextId === integranteRef.current) {
      setHolderName(selfNameRef.current || "Vos");
      return;
    }
    if (nameHint) setHolderName(nameHint);
  }, []);

  const reloadPayload = useCallback(async (plot, hintRow) => {
    const client = supabaseRef.current;
    let row = hintRow || null;
    if (client && plot) {
      const { data, error } = await getStagePlotById(client, plot);
      if (!error && data) row = data;
    }
    if (row) applyRemotePayloadRef.current?.(row);
    return row;
  }, [applyRemotePayloadRef]);

  const loseLock = useCallback(async (hintRow) => {
    if (!holdsLockRef.current || losingRef.current) return;
    losingRef.current = true;
    const id = lockPlotIdRef.current;
    holdsLockRef.current = false;
    setHoldsLock(false);
    lockPlotIdRef.current = null;
    stopHeartbeat();
    clearSettle();
    try {
      await flushPendingRef.current?.(id, { requireLock: false });
    } catch (err) {
      console.error("[stage-plot lock] flush al perder candado", err);
    }
    const row = await reloadPayload(id, hintRow);
    const whoId = row?.locked_by ?? holderIdRef.current;
    let who = whoId === integranteRef.current ? selfNameRef.current : "";
    if (!who && whoId && supabaseRef.current) {
      const { data } = await supabaseRef.current
        .from("integrantes")
        .select("id, nombre, apellido")
        .eq("id", whoId)
        .maybeSingle();
      who = formatIntegranteName(data, whoId);
    }
    applyHolder(row?.locked_by ?? null, row?.lock_heartbeat_at ?? null, who);
    toast.message(
      who
        ? `${who} tomó el control. El plano quedó en solo lectura.`
        : "Perdiste el control. El plano quedó en solo lectura.",
    );
    losingRef.current = false;
  }, [applyHolder, clearSettle, flushPendingRef, reloadPayload, stopHeartbeat]);

  const beat = useCallback(async () => {
    const client = supabaseRef.current;
    const id = lockPlotIdRef.current;
    const me = integranteRef.current;
    if (!client || !id || me == null || !holdsLockRef.current) return;
    const { data, error } = await heartbeatStagePlotLock(client, id, me);
    if (error) {
      console.warn("[stage-plot lock] latido", error.message || error);
      return;
    }
    if (!data?.held) {
      await loseLock(null);
      return;
    }
    applyHolder(data.locked_by, data.lock_heartbeat_at, selfNameRef.current);
  }, [applyHolder, loseLock]);

  const beatRef = useRef(beat);
  beatRef.current = beat;
  const loseLockRef = useRef(loseLock);
  loseLockRef.current = loseLock;

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatTimerRef.current = setInterval(() => {
      void beatRef.current();
    }, STAGE_PLOT_LOCK_HEARTBEAT_MS);
  }, [stopHeartbeat]);

  const markHeld = useCallback((id, res) => {
    holdsLockRef.current = true;
    lockPlotIdRef.current = id;
    setHoldsLock(true);
    applyHolder(integranteRef.current, res?.lock_heartbeat_at, selfNameRef.current);
    startHeartbeat();
  }, [applyHolder, startHeartbeat]);

  const releaseControl = useCallback(async () => {
    if (!holdsLockRef.current || losingRef.current || busyRef.current) return;
    const client = supabaseRef.current;
    const id = lockPlotIdRef.current;
    const me = integranteRef.current;
    busyRef.current = true;
    holdsLockRef.current = false;
    setHoldsLock(false);
    lockPlotIdRef.current = null;
    stopHeartbeat();
    clearSettle();
    setBusy(true);
    try {
      await flushPendingRef.current?.(id, { requireLock: true });
      if (client && id && me != null) {
        const { data, error } = await releaseStagePlotLock(client, id, me);
        if (error) {
          console.error(error);
          toast.error(error.message || "No se pudo ceder el control");
          return;
        }
        if (!data?.released) {
          applyHolder(data?.locked_by ?? null, data?.lock_heartbeat_at ?? null);
          toast.message("El control ya no era tuyo.");
          await reloadPayload(id, null);
          return;
        }
      }
      applyHolder(null, null);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [applyHolder, clearSettle, flushPendingRef, reloadPayload, stopHeartbeat]);

  const takeControl = useCallback(async () => {
    const client = supabaseRef.current;
    const id = plotIdRef.current;
    const me = integranteRef.current;
    if (!staffRef.current || busyRef.current) return;
    if (!client || !id || me == null) {
      toast.error("No hay un integrante identificado para tomar el control.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      const otherLive =
        holderIdRef.current != null &&
        holderIdRef.current !== me &&
        !isStagePlotLockStale(heartbeatRef.current);
      let res;
      let error;
      if (otherLive) {
        ({ data: res, error } = await takeStagePlotLock(client, id, me, {
          force: true,
          expectedLockedBy: holderIdRef.current,
        }));
        if (!error && res && !res.acquired) {
          ({ data: res, error } = await takeStagePlotLock(client, id, me, {
            force: false,
          }));
        }
      } else {
        ({ data: res, error } = await takeStagePlotLock(client, id, me, {
          force: false,
        }));
      }
      if (error) {
        toast.error(error.message || "No se pudo tomar el control");
        return;
      }
      if (!res?.acquired) {
        let name = "";
        if (res?.locked_by && res.locked_by !== me) {
          const { data: person } = await client
            .from("integrantes")
            .select("id, nombre, apellido")
            .eq("id", res.locked_by)
            .maybeSingle();
          name = formatIntegranteName(person, res.locked_by);
        }
        applyHolder(res?.locked_by ?? null, res?.lock_heartbeat_at ?? null, name);
        toast.message(
          name
            ? `${name} se quedó con el control.`
            : "No se pudo tomar el control.",
        );
        return;
      }
      markHeld(id, res);
      if (res.stolen_from_live) {
        settlingRef.current = true;
        setSettling(true);
        await reloadPayload(id, {
          id,
          payload: res.payload,
          nombre: res.nombre,
          updated_at: res.updated_at,
          locked_by: res.locked_by,
          lock_heartbeat_at: res.lock_heartbeat_at,
        });
        if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
        settleTimerRef.current = setTimeout(() => {
          settleTimerRef.current = null;
          if (settlingRef.current && holdsLockRef.current) {
            settlingRef.current = false;
            setSettling(false);
          }
        }, STAGE_PLOT_LOCK_SETTLE_MS);
      } else {
        clearSettle();
        await reloadPayload(id, {
          id,
          payload: res.payload,
          nombre: res.nombre,
          updated_at: res.updated_at,
          locked_by: res.locked_by,
          lock_heartbeat_at: res.lock_heartbeat_at,
        });
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [applyHolder, clearSettle, markHeld, reloadPayload]);

  useEffect(() => {
    const client = supabase;
    const id = plotId;
    if (!client || !id) {
      holdsLockRef.current = false;
      setHoldsLock(false);
      applyHolder(null, null);
      setViewers([]);
      return undefined;
    }

    let cancelled = false;
    const channel = client
      .channel(`stage-plot-lock:${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stage_plots",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const row = payload?.new;
          if (!row || cancelled) return;
          const lockedBy =
            row.locked_by == null || !Number.isFinite(Number(row.locked_by))
              ? null
              : Number(row.locked_by);
          const heartbeat = row.lock_heartbeat_at || null;
          if (holdsLockRef.current && lockedBy !== integranteRef.current) {
            void loseLockRef.current(row);
            return;
          }
          applyHolder(
            lockedBy,
            heartbeat,
            lockedBy === integranteRef.current ? selfNameRef.current : undefined,
          );
          const remoteUpdated = row.updated_at;
          const seen = savedUpdatedAtRef.current;
          const contentChanged =
            remoteUpdated && !stagePlotSameInstant(remoteUpdated, seen);
          const shouldFollow =
            contentChanged &&
            (!holdsLockRef.current || settlingRef.current);
          if (!shouldFollow) return;
          void (async () => {
            await reloadPayload(id, row);
            if (settlingRef.current && holdsLockRef.current) {
              clearSettle();
            }
          })();
        },
      )
      .on("presence", { event: "sync" }, () => {
        if (!cancelled) setViewers(readPresence(channel));
      })
      .on("presence", { event: "join" }, () => {
        if (!cancelled) setViewers(readPresence(channel));
      })
      .on("presence", { event: "leave" }, () => {
        if (!cancelled) setViewers(readPresence(channel));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED" && integranteRef.current != null) {
          void channel.track({
            integrante_id: integranteRef.current,
            nombre: selfNameRef.current || `Integrante ${integranteRef.current}`,
          });
        }
      });

    (async () => {
      const { data, error } = await getStagePlotById(client, id);
      if (cancelled || error || !data) return;
      applyHolder(data.locked_by, data.lock_heartbeat_at);
      const me = integranteRef.current;
      if (
        staffRef.current &&
        me != null &&
        data.locked_by != null &&
        data.locked_by === me
      ) {
        const { data: res, error: takeErr } = await takeStagePlotLock(
          client,
          id,
          me,
          { force: false },
        );
        if (cancelled || takeErr || !res?.acquired) return;
        markHeld(id, res);
        if (
          res.updated_at &&
          !stagePlotSameInstant(res.updated_at, savedUpdatedAtRef.current)
        ) {
          await reloadPayload(id, {
            id,
            payload: res.payload,
            nombre: res.nombre,
            updated_at: res.updated_at,
          });
        }
      }
    })();

    const onVisible = () => {
      if (document.visibilityState === "visible") void beatRef.current();
    };
    const onLeave = () => {
      if (!holdsLockRef.current || lockPlotIdRef.current !== id) return;
      const plot = id;
      const me = integranteRef.current;
      holdsLockRef.current = false;
      lockPlotIdRef.current = null;
      void (async () => {
        try {
          await flushPendingRef.current?.(plot, { requireLock: true });
        } catch (err) {
          console.error(err);
        }
        if (me != null) await releaseStagePlotLock(client, plot, me);
      })();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", onLeave);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", onLeave);
      stopHeartbeat();
      clearSettle();
      client.removeChannel(channel);
      if (holdsLockRef.current && lockPlotIdRef.current === id) {
        const plot = id;
        const me = integranteRef.current;
        holdsLockRef.current = false;
        lockPlotIdRef.current = null;
        setHoldsLock(false);
        void (async () => {
          try {
            await flushPendingRef.current?.(plot, { requireLock: true });
          } catch (err) {
            console.error("[stage-plot lock] flush al cerrar", err);
          }
          if (me != null) await releaseStagePlotLock(client, plot, me);
        })();
      }
    };
    // plotId / identidad: al cambiar se suelta el candado anterior.
    // Los callbacks se leen por ref para no re-suscribir (y ceder) en cada render.
  }, [supabase, plotId, integranteId, staffCanEdit, applyHolder, clearSettle, flushPendingRef, markHeld, reloadPayload, savedUpdatedAtRef, stopHeartbeat]);

  useEffect(() => {
    if (!supabase || holderId == null || holderId === integranteId) return undefined;
    let cancelled = false;
    supabase
      .from("integrantes")
      .select("id, nombre, apellido")
      .eq("id", holderId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setHolderName(formatIntegranteName(data, holderId));
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, holderId, integranteId]);

  return {
    holdsLock,
    holdsLockRef,
    settling,
    busy,
    holderId,
    holderName,
    heartbeatAt,
    viewers,
    takeControl,
    releaseControl,
  };
}
