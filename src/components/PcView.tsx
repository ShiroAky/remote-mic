import { StatusBadge } from './StatusBadge'
import { invoke } from '@tauri-apps/api/core'
import React, { useState, useRef } from 'react'
import { ConnectionStatus, AudioDevice } from '../types'
import { getCurrentWindow } from '@tauri-apps/api/window'

export const PcView: React.FC = () => {
  const [serverAddr, setServerAddr] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const appWindow = getCurrentWindow();

  // Obtener dispositivos de salida de audio
  const refreshDevices = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const outputs = allDevices
        .filter((d) => d.kind === 'audiooutput')
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Dispositivo (${d.deviceId.slice(0, 5)})` }));

      setDevices(outputs);
      
      // Auto-seleccionar VB-Cable si existe
      const vbCable = outputs.find((d) => d.label.toLowerCase().includes('cable'));
      if (vbCable) {
        setSelectedDevice(vbCable.deviceId);
        applySinkId(vbCable.deviceId);
      }
    } catch (err) {
      console.error('Error enumerando dispositivos:', err);
    }
  };

  const applySinkId = async (deviceId: string) => {
    if (audioRef.current && 'setSinkId' in audioRef.current) {
      try {
        await (audioRef.current as any).setSinkId(deviceId);
      } catch (e) {
        console.error('Error aplicando setSinkId:', e);
      }
    }
  };

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDevice(deviceId);
    applySinkId(deviceId);
  };

  const startServer = async () => {
    try {
      setStatus('connecting');
      const addr = await invoke<string>('start_signaling_server');
      setServerAddr(addr);
      initWebRTC(addr);
      await refreshDevices();
    } catch (err) {
      setStatus('error');
    }
  };

  const initWebRTC = (address: string) => {
    const ws = new WebSocket(`ws://${address}`);
    wsRef.current = ws;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pcRef.current = pc;

    pc.ontrack = (evt) => {
      if (audioRef.current) {
        audioRef.current.srcObject = evt.streams[0];
        setStatus('connected');
      }
    };

    pc.onicecandidate = (evt) => {
      if (evt.candidate) {
        ws.send(JSON.stringify({ iceCandidate: evt.candidate }));
      }
    };

    ws.onmessage = async (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(msg));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify(pc.localDescription));
      } else if (msg.iceCandidate) {
        await pc.addIceCandidate(new RTCIceCandidate(msg.iceCandidate));
      }
    };

    ws.onclose = () => setStatus('disconnected');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">

      <nav className='flex flex-row justify-between items-center fixed top-0 left-0 z-50 w-full'>
        <h1>Remote Mic</h1>
        <div>
          <button className='text-white' onClick={() => appWindow.minimize()}>_</button>
          <button className='text-white' onClick={() => appWindow.close()}>X</button>
        </div>
      </nav>

      <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Receptor de Escritorio</h1>
          <p className="text-xs text-zinc-400">Escucha el flujo WebRTC y lo canaliza hacia VB-Cable</p>
        </div>
        <StatusBadge status={status} />
      </header>

      {!serverAddr ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-4">
          <p className="text-sm text-zinc-400">Inicia el servidor para generar la dirección IP del teléfono.</p>
          <button
            onClick={startServer}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition"
          >
            Iniciar Servidor de Señalización
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tarjeta de IP */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-mono">Dirección de Conexión</span>
              <p className="text-lg font-mono text-amber-400 font-semibold">{serverAddr}</p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(serverAddr)}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 rounded-lg transition"
            >
              Copiar
            </button>
          </div>

          {/* Selector de Dispositivo de Salida */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <label className="text-xs text-zinc-400 font-medium block">
              Salida de Audio (Selecciona VB-Audio Virtual Cable)
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => handleDeviceChange(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm rounded-xl p-3 focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="">Selecciona un dispositivo...</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Elemento de Audio Oculto / Controles */}
          <audio ref={audioRef} autoPlay className="hidden" />
        </div>
      )}
    </div>
  );
};