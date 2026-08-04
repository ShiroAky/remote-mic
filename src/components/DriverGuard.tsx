import React from 'react';
import { useDriverCheck } from '../hooks/useDriverCheck';

export const DriverGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, errorMsg, checkDriver, installDriver } = useDriverCheck();

  if (status === 'installed') return <>{children}</>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
        
        <div className="flex items-center space-x-3 border-b border-zinc-800 pb-4">
          <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
          <h2 className="text-lg font-semibold tracking-wide">Audio Virtual Windows</h2>
        </div>

        {status === 'checking' && (
          <div className="flex flex-col items-center py-8 space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-400">Verificando controlador VB-Cable...</p>
          </div>
        )}

        {status === 'not_installed' && (
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-300 text-xs leading-relaxed">
              <p className="font-semibold mb-1 text-sm">Controlador No Detectado</p>
              Para reenviar el audio como un micrófono de hardware en la PC, es necesario instalar el controlador oficial de VB-Cable.
            </div>

            <button
              onClick={installDriver}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-sm font-medium rounded-xl transition shadow-lg shadow-indigo-600/25"
            >
              Instalar VB-Cable Automáticamente
            </button>
          </div>
        )}

        {status === 'installing' && (
          <div className="flex flex-col items-center py-6 space-y-4 text-center">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <div>
              <p className="text-sm font-medium">Instalando controlador...</p>
              <p className="text-xs text-amber-400 mt-1 font-mono">Acepta la ventana de Administrador (UAC) si aparece.</p>
            </div>
          </div>
        )}

        {status === 'reboot_required' && (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-300 text-xs leading-relaxed">
              <p className="font-semibold mb-1 text-sm">¡Instalación Exitosa!</p>
              Se recomienda reiniciar tu PC para que Windows reconozca el nuevo dispositivo de entrada de audio.
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition"
            >
              Continuar a la Aplicación
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-300 text-xs">
              <p className="font-semibold mb-1">Error</p>
              {errorMsg}
            </div>
            <button
              onClick={checkDriver}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-xl transition"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};