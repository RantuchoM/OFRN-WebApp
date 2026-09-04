import { createContext } from "react";

/** Contexto FIMBA access (sin JSX) — evita romper Fast Refresh del Provider. */
export const FimbaAccessContext = createContext({
  readOnly: false,
  agendaOnly: false,
  canManageUsers: false,
  canSeeUsuarios: false,
  canSeeContrataciones: false,
  canEditPropuestaMeta: false,
  canSeeRider: false,
  allowed: true,
  source: "none",
  edicionId: null,
  overrideLoading: false,
});
