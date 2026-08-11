import React from "react";
import { Routes, Route, Outlet, Link } from "react-router-dom";
import FimbaLayout from "./FimbaLayout";
import FimbaStaffGuard from "./FimbaStaffGuard";
import FimbaHome from "./FimbaHome";
import FimbaEdicionPage from "./FimbaEdicionPage";
import FimbaArtistaPage from "./FimbaArtistaPage";
import FimbaTransportPage from "./FimbaTransportPage";
import FimbaAgendaPage from "./FimbaAgendaPage";
import FimbaHoteleriaPage from "./FimbaHoteleriaPage";
import FimbaUsuariosPage from "./FimbaUsuariosPage";

/**
 * Shell pathless: hijos de `edicion/:id` y `artista/:id` usan Outlet implícito
 * vía ruta sin `element` (no re-render de layout de página intermedia).
 */
function FimbaPathShell() {
  return <Outlet />;
}

/** Rutas staff /fimba/* (isManagement OFRN o sesión fimba_user editor_general). */
export default function FimbaStaffApp() {
  return (
    <FimbaStaffGuard>
      <Routes>
        <Route element={<FimbaLayout mode="staff" />}>
          <Route index element={<FimbaHome />} />
          {/* Segmentos: Artistas (index) | agenda | transportes | hoteleria | usuarios */}
          <Route path="edicion/:edicionId" element={<FimbaPathShell />}>
            <Route index element={<FimbaEdicionPage />} />
            <Route path="agenda" element={<FimbaAgendaPage />} />
            <Route path="transportes" element={<FimbaTransportPage />} />
            <Route path="hoteleria" element={<FimbaHoteleriaPage />} />
            <Route path="usuarios" element={<FimbaUsuariosPage />} />
            <Route path="artista/:artistaId" element={<FimbaPathShell />}>
              <Route index element={<FimbaArtistaPage />} />
              <Route path="agenda" element={<FimbaAgendaPage />} />
              <Route path="transportes" element={<FimbaTransportPage />} />
              <Route path="hoteleria" element={<FimbaHoteleriaPage />} />
            </Route>
          </Route>
          {/* Sin redirect a /fimba: un 404 no debe parecer «home ediciones». */}
          <Route
            path="*"
            element={
              <div className="fimba-card">
                <p className="fimba-muted" style={{ margin: 0 }}>
                  Ruta FIMBA no encontrada.
                </p>
                <Link
                  to="/fimba"
                  className="fimba-btn fimba-btn-ghost"
                  style={{ marginTop: 12, textDecoration: "none", display: "inline-flex" }}
                >
                  Ir a ediciones
                </Link>
              </div>
            }
          />
        </Route>
      </Routes>
    </FimbaStaffGuard>
  );
}
