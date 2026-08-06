import React, { useEffect } from 'react'
import { DriverGuard } from './DriverGuard'
import { StatusBadge } from './StatusBadge'
import TitleBarComponent from './ui/titlebar'
import StartServerComponent from './ui/startServer'
import { ActiveDashboard } from './ui/ActiveDashboard'
import { useWebRTCServer } from '../hooks/useWebRTCServer'

export const VirtualMicContent: React.FC = () => {
  const { serverAddr, status, activeClients, volume, audioRef, handleVolumeChange, startServer, stopServer } = useWebRTCServer();

  // Verificación
  const isServerActive = serverAddr && status !== 'disconnected';

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 select-none">

      {/* Titlebar */}
      <TitleBarComponent />

      {/* Cabecera */}
      <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Micrófono Virtual</h1>
          <p className="text-xs text-zinc-400">Receptor de audio mediante señalización WebRTC</p>
        </div>
        <StatusBadge status={status} />
      </header>

      {!isServerActive ? (
        <StartServerComponent startServerHandler={startServer} />
      ) : (
        <ActiveDashboard
          serverAddr={serverAddr}
          activeClients={activeClients}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          onStopServer={stopServer}
        />
      )}

      <audio ref={audioRef} autoPlay className="hidden" />
    </div>
  );
};

export const VirtualMic: React.FC = () => {
  return (
    <DriverGuard>
      <VirtualMicContent />
    </DriverGuard>
  );
};