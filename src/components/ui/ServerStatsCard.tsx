import React from 'react';
import { NetworkIcon } from 'lucide-react';
import { toast } from './Toaster'

interface ServerStatsCardProps {
  serverAddr: string;
  activeClients: number;
}

export const ServerStatsCard: React.FC<ServerStatsCardProps> = ({ serverAddr, activeClients }) => {

  function CopyToClipboard() {
    navigator.clipboard.writeText(serverAddr)
    toast('Dirección copiada', 'success', 1000)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Tarjeta de IP */}
      <div className="md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between shadow-md">
        <div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono block mb-1">
            Dirección Servidor
          </span>
          <p className="text-lg font-mono text-amber-400 font-bold tracking-wide">{serverAddr}</p>
        </div>
        <button
          onClick={CopyToClipboard}
          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 rounded-lg border border-zinc-700/50 transition cursor-pointer no-drag-region"
        >
          Copiar IP
        </button>
      </div>

      {/* Tarjeta de Clientes */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-md">
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono block">
          Dispositivos Móviles
        </span>
        <div className="flex items-center justify-center space-x-2 mt-2">
          <span className="text-base font-extrabold text-indigo-400 font-mono flex items-center gap-2">
            <NetworkIcon className="w-4 h-4" />
            {activeClients}
          </span>
          <span className="text-base text-zinc-400">
            {activeClients === 1 ? 'cliente activo' : 'clientes activos'}
          </span>
        </div>
      </div>
    </div>
  );
};