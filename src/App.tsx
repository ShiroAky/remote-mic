import { useEffect, useState } from 'react';
import { VirtualMic } from './components/VirtualMic';
import { MobileView } from './components/mobile/MobileView';
import VersionViewer from './components/ui/VersionViewer';
import { invoke } from '@tauri-apps/api/core';
import { AppRole } from './types';
import './App.css';

import { Toaster } from './components/ui/Toaster';

export default function App() {
  const [role, setRole] = useState<AppRole>('desktop');

  // Identificador de sistema
  useEffect(() => {
    const fetchDeviceType = async () => {
      try {
        const deviceType = await invoke<AppRole>('get_device_type');
        setRole(deviceType);
      } catch (err) {
        console.error('Error fetching device type:', err);
      }
    };
    fetchDeviceType();
  }, []);

  // Deshabilitador de menú contextual:
  function ContextMenuHandler(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  return (
    <div 
      className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-indigo-500 selection:text-white" 
      onContextMenu={ContextMenuHandler}
    >
      {/* Vista principal de la aplicación */}
      {role === 'desktop' ? (
        <main className="pt-12">
          <VirtualMic />
          {/* VersionViewer solo se muestra en la versión de escritorio */}
          <VersionViewer />
        </main>
      ) : (
        <main className="h-screen w-full overflow-hidden">
          <MobileView />
        </main>
      )}

      {/* Toaster (Para notificaciones) */}
      <Toaster position="bottom-right" allowManualClose={true} />
    </div>
  );
}