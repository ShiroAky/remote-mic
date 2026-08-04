import { useEffect, useState } from 'react';
import { VirtualMic } from './components/VirtualMic';
import { MobileView } from './components/MobileView';
import { invoke } from '@tauri-apps/api/core';
import { AppRole } from './types';
import './App.css';

import { Toaster } from './components/ui/Toaster'

export default function App() {
  const [role, setRole] = useState<AppRole>('desktop');

  // Identificador de sistema
  useEffect(() => {
    const fetchDeviceType = async () => {
      const deviceType = await invoke<AppRole>('get_device_type');
      setRole(deviceType);
    };
    fetchDeviceType();
  }, []);

  // Deshabilitador de menu contextuales:
  function ContextMenuHandler(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-indigo-500 selection:text-white" onContextMenu={ContextMenuHandler}>
      <main className="pt-12">
        { role === 'desktop' ? ( <VirtualMic /> ) : ( <MobileView /> ) }
      </main>
      <Toaster position='bottom-right' allowManualClose={ true } />
    </div>
  );
}