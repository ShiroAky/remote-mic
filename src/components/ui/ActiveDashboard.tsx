import React from 'react';
import { Power } from 'lucide-react';
import { ServerStatsCard } from './ServerStatsCard';
import { AudioControlsCard } from './AudioControlsCard';

interface ActiveDashboardProps {
  serverAddr: string;
  activeClients: number;
  volume: number;
  onVolumeChange: (val: number) => void;
  onStopServer: () => void;
}

export const ActiveDashboard: React.FC<ActiveDashboardProps> = ({
  serverAddr,
  activeClients,
  volume,
  onVolumeChange,
  onStopServer,
}) => {
  return (
    <div className="space-y-4">
      <ServerStatsCard serverAddr={serverAddr} activeClients={activeClients} />
      <AudioControlsCard volume={volume} onVolumeChange={onVolumeChange} />

      <button
        onClick={onStopServer}
        className="px-6 py-3 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white text-sm font-semibold rounded-xl shadow-lg shadow-red-600/25 transition flex items-center justify-center gap-2 mx-auto cursor-pointer"
      >
        <Power className="w-4 h-4" /> Detener Conexión
      </button>
    </div>
  );
};