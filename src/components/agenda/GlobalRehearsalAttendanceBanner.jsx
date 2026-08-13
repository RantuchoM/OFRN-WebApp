import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useEnsayoBannerData } from "../../hooks/useEnsayoBannerData";
import RehearsalAttendanceBanner from "./RehearsalAttendanceBanner";

/**
 * Banner global de asistencia a ensayos.
 * Visible solo si el usuario real es admin (prueba) y el usuario activo
 * (incl. “Ver como”) está convocado al ensayo del día.
 */
export default function GlobalRehearsalAttendanceBanner() {
  const { user, isActuallyAdmin } = useAuth();
  const integranteId = user?.id;
  const canShow =
    isActuallyAdmin &&
    integranteId &&
    integranteId !== "guest-general" &&
    !Number.isNaN(Number(integranteId));

  const { events, getEstado, patchEstado, refresh } = useEnsayoBannerData(
    canShow ? integranteId : null,
  );

  if (!canShow) return null;

  return (
    <RehearsalAttendanceBanner
      events={events}
      integranteId={integranteId}
      getEstado={getEstado}
      onSuccess={refresh}
      onEstadoPatch={patchEstado}
    />
  );
}
