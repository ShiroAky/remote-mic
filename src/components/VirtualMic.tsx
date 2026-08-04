import { DriverGuard } from './DriverGuard'
import { StatusBadge } from './StatusBadge'
import { MicOff, Power, XIcon, Minus, NetworkIcon } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { ConnectionStatus, AudioDevice } from '@/types'
import { getCurrentWindow } from '@tauri-apps/api/window'
import React, { useState, useEffect, useRef } from 'react'

// VirtualMicContent es el componente principal que maneja la lógica del micrófono virtual y la conexión WebRTC.
export const VirtualMicContent: React.FC = () => {
  const [serverAddr, setServerAddr] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [activeClients, setActiveClients] = useState<number>(0);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [volume, setVolume] = useState<number>(100);

  const audioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const appWindow = getCurrentWindow();

  const refreshAudioDevices = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const enumeratedDevices = await navigator.mediaDevices.enumerateDevices();
      
      const audioOutputs = enumeratedDevices
        .filter((d) => d.kind === 'audiooutput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Dispositivo de Salida (${d.deviceId.slice(0, 5)})`,
        }));

      setDevices(audioOutputs);

      const vbCableDevice = audioOutputs.find((d) =>
        d.label.toLowerCase().includes('cable') || d.label.toLowerCase().includes('vb-audio')
      );

      if (vbCableDevice) {
        setSelectedDeviceId(vbCableDevice.deviceId);
        applySinkId(vbCableDevice.deviceId);
      }
    } catch (err) {
      console.error('Error al enumerar dispositivos de audio:', err);
    }
  };

  const applySinkId = async (deviceId: string) => {
    if (audioRef.current && 'setSinkId' in audioRef.current) {
      try {
        await (audioRef.current as any).setSinkId(deviceId);
      } catch (e) {
        console.error('Error al cambiar dispositivo de salida:', e);
      }
    }
  };

  const startServer = async () => {
    try {
      setStatus('connecting');
      const addr = await invoke<string>('start_signaling_server');
      setServerAddr(addr);
      initWebRTC(addr);
      await refreshAudioDevices();
    } catch (err) {
      console.error('Error al iniciar el servidor:', err);
      setStatus('error');
    }
  };

  const initWebRTC = (address: string) => {
    const ws = new WebSocket(`ws://${address}`);
    wsRef.current = ws;

    ws.onopen = () => setStatus('connecting');

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pcRef.current = pc;

    // Recibir audio desde el teléfono móvil
    pc.ontrack = (evt) => {
      if (audioRef.current) {
        audioRef.current.srcObject = evt.streams[0];
        setStatus('connected');
        setActiveClients(1);
      }
    };

    pc.onicecandidate = (evt) => {
      if (evt.candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ iceCandidate: evt.candidate }));
      }
    };

    ws.onmessage = async (evt) => {
      const msg = JSON.parse(evt.data);

      // Si se envía información de clientes desde el backend de Rust (opcional)
      if (msg.activeClients !== undefined) {
        setActiveClients(msg.activeClients);
        return;
      }

      if (msg.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(msg));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify(pc.localDescription));
      } else if (msg.iceCandidate) {
        await pc.addIceCandidate(new RTCIceCandidate(msg.iceCandidate));
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      setActiveClients(0);
    };

    ws.onerror = () => {
      setStatus('error');
      setActiveClients(0);
    };
  };

  const stopServer = async () => {
    try {

      // 1. Cerrar WebRTC y WebSocket en el cliente JS local
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      // Cerrar WebSocket y limpiar la referencia
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // Limpiar el audio del elemento de audio
      if (audioRef.current) audioRef.current.srcObject = null;

      // 2. Invocar al backend de Rust para detener el servidor de señalización
      await invoke("stop_signaling_server");
      console.log('Servidor detenido');

      // 3. Actualizar el estado de la UI
      setStatus('disconnected');
      setActiveClients(0);
      setServerAddr(null);

    } catch (error) {
      console.error('Error al detener el servidor:', error);
    }
  };

  // Cerrar conexiones al desmontar el componente
  useEffect(() => {
    return () => {
      // Cerrar conexiones WebSocket y WebRTC al desmontar el componente
      wsRef.current?.close();
      pcRef.current?.close();

      // Limpiar el audio del elemento de audio
      if (audioRef.current) audioRef.current.srcObject = null;

      // Detener el servidor de señalización en el backend de Rust al desmontar
      stopServer();
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 select-none">

      <nav className='flex flex-row justify-between items-center absolute top-0 left-0 z-999 w-full py-2 px-4 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 select-none'>
        <h1>Remote Mic</h1>
        <div className='flex gap-2 z-50'>
            <button className='text-white text-base py-1 px-1 cursor-pointer' onClick={() => appWindow.minimize()}><Minus /></button>
            <button className='text-white text-base py-1 px-1 cursor-pointer' onClick={() => appWindow.close()}><XIcon /></button>
        </div>
      </nav>

      <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Micrófono Virtual</h1>
          <p className="text-xs text-zinc-400">Receptor de audio mediante señalización WebRTC</p>
        </div>
        <StatusBadge status={status} />
      </header>

      {!serverAddr || status === 'disconnected' ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto text-xl font-mono"><MicOff /></div>
          <div>
            <h3 className="text-base font-semibold text-zinc-100">Servidor Apagado</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Inicia el servidor local para generar la IP que ingresarás en la app móvil.
            </p>
          </div>
          <button
            onClick={startServer}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 mx-auto">
            <Power /> Iniciar Servidor
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Fila de Estadísticas e IP */}
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
                onClick={() => navigator.clipboard.writeText(serverAddr)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 rounded-lg border border-zinc-700/50 transition"
              >
                Copiar IP
              </button>
            </div>

            {/* Tarjeta de Clientes Activos en Tiempo Real */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-md">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono block">
                Dispositivos Móviles
              </span>
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-3xl font-extrabold text-indigo-400 font-mono">
                  {activeClients}
                </span>
                <span className="text-xs text-zinc-400">
                  {activeClients === 1 ? 'cliente activo' : 'clientes activos'}
                </span>
              </div>
            </div>

          </div>

          {/* Configuración de Audio */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-md">
            {/* <div>
              <label className="text-xs text-zinc-400 font-medium block mb-2">
                Dispositivo de Salida (Enrutador VB-Cable)
              </label>
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  applySinkId(e.target.value);
                }}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm rounded-xl p-3 focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="">Selecciona un dispositivo de audio...</option>
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div> */}

            <div className="pt-2 border-t border-zinc-800/60">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-zinc-400 font-medium">Ganancia de Entrada</span>
                <span className="text-xs font-mono text-indigo-400">{volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setVolume(val);
                  if (audioRef.current) audioRef.current.volume = val / 100;
                }}
                className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Boton de finalización de la conexión */}
          <button
            onClick={stopServer}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white text-sm font-semibold rounded-xl shadow-lg shadow-red-600/25 transition flex items-center justify-center gap-2 mx-auto"
          >
            <Power /> Detener Conexión
          </button>
        </div>
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