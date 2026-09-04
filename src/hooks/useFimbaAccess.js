import { useContext } from "react";
import { FimbaAccessContext } from "../context/fimbaAccessContextBase";

/** Acceso efectivo FIMBA (RO, roles, edición). Archivo propio → Fast Refresh. */
export function useFimbaAccess() {
  return useContext(FimbaAccessContext);
}
