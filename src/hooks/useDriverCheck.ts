import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export type DriverStatus = 'checking' | 'installed' | 'not_installed' | 'installing' | 'reboot_required' | 'error';

export function useDriverCheck() {
  const [status, setStatus] = useState<DriverStatus>('checking');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const checkDriver = useCallback(async () => {
    setStatus('checking');
    setErrorMsg(null);
    try {
      const isInstalled = await invoke<boolean>('check_vbcable_powershell');
      setStatus(isInstalled ? 'installed' : 'not_installed');
    } catch (err) {
      setStatus('error');
      setErrorMsg(typeof err === 'string' ? err : 'Error al verificar el controlador en el sistema.');
    }
  }, []);

  const installDriver = async () => {
    setStatus('installing');
    setErrorMsg(null);
    try {
      await invoke<string>('install_virtual_cable');
      setStatus('reboot_required');
    } catch (err) {
      setStatus('error');
      setErrorMsg(typeof err === 'string' ? err : 'No se pudo completar la instalación.');
    }
  };

  useEffect(() => {
    checkDriver();
  }, [checkDriver]);

  return { status, errorMsg, checkDriver, installDriver };
}