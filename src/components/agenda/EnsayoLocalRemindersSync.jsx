import { useAuth } from "../../context/AuthContext";
import { useEnsayoLocalRemindersSync } from "../../hooks/useEnsayoLocalRemindersSync";

/**
 * Sync silencioso de alarmas locales de ensayo (inicio del próximo + salida si hay alta).
 * Gate de prueba: usuario real admin (mismo criterio que GlobalRehearsalAttendanceBanner).
 */
export default function EnsayoLocalRemindersSync() {
  const { user, isActuallyAdmin } = useAuth();
  const integranteId = user?.id;
  const enabled =
    !!isActuallyAdmin &&
    !!integranteId &&
    integranteId !== "guest-general" &&
    !Number.isNaN(Number(integranteId));

  useEnsayoLocalRemindersSync(enabled ? integranteId : null, enabled);

  return null;
}
