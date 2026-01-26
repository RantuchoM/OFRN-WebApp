import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { IconRefresh, IconX, IconAlertCircle } from './Icons';

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered');
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[10000] animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white border-2 border-indigo-500 rounded-2xl shadow-2xl p-4 flex items-center gap-4 max-w-xs sm:max-w-md">
        <div className="bg-indigo-100 p-2 rounded-full text-indigo-600 shrink-0">
          <IconAlertCircle size={24} />
        </div>
        
        <div className="flex-1">
          <p className="text-sm font-black text-slate-800 uppercase tracking-tight">
            {needRefresh ? '¡Nueva versión disponible!' : 'App lista para usar offline'}
          </p>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
            {needRefresh 
              ? 'Hay mejoras importantes. Actualiza ahora.' 
              : 'Ya puedes acceder sin conexión.'}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          {needRefresh && (
            <button
              onClick={() => updateServiceWorker(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 transition-colors shadow-lg shadow-indigo-100"
            >
              <IconRefresh size={12} /> Actualizar
            </button>
          )}
          <button
            onClick={close}
            className="text-slate-400 hover:text-slate-600 px-3 py-1 text-[10px] font-bold uppercase"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReloadPrompt;