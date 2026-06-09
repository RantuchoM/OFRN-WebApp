import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { ViaticosManualAuthProvider, useViaticosManualAuth } from "../../../context/ViaticosManualAuthContext";
import ManualSavedPanel from "../../../components/public/ManualSavedPanel";
import LoginViaticosManual from "./LoginViaticosManual";

function LayoutShell() {
  const {
    session,
    profile,
    loading,
    bootError,
    loginOpen,
    closeLogin,
    loadProfile,
    isAuthenticated,
    canAccessApp,
    needsProfile,
    continueAsGuest,
  } = useViaticosManualAuth();

  useEffect(() => {
    if (isAuthenticated && loginOpen) closeLogin();
  }, [isAuthenticated, loginOpen, closeLogin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Cargando…
        </span>
      </div>
    );
  }

  const showAccessGate = !canAccessApp || needsProfile;

  if (showAccessGate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-100 flex items-center justify-center px-4 py-10 sm:py-14">
        <LoginViaticosManual
          mode="gate"
          user={session?.user || null}
          profile={profile}
          onProfileSaved={loadProfile}
          bootError={bootError}
          onContinueAsGuest={needsProfile ? null : continueAsGuest}
        />
      </div>
    );
  }

  return (
    <>
      <Outlet />
      {loginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <LoginViaticosManual
            mode="modal"
            user={session?.user || null}
            profile={profile}
            onProfileSaved={loadProfile}
            bootError={bootError}
            onClose={closeLogin}
          />
        </div>
      )}
      <ManualSavedPanel />
    </>
  );
}

export default function ViaticosManualLayout() {
  return (
    <ViaticosManualAuthProvider>
      <LayoutShell />
    </ViaticosManualAuthProvider>
  );
}
