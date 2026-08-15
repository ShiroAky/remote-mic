import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ConnectionStatus, AudioDevice } from '@/types';

export function useWebRTCServer() {
  const [serverAddr, setServerAddr] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [activeClients, setActiveClients] = useState<number>(0);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [volume, setVolume] = useState<number>(100);

  const audioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  // Limpia únicamente la sesión WebRTC y el audio sin tumbar el WebSocket ni el servidor Tauri
  const resetConnectionState = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
    iceCandidatesQueue.current = [];
    setActiveClients(0);
    // Si el servidor local sigue vivo, se mantiene en estado "ready"/conectando para una nueva oferta
    setStatus(wsRef.current && wsRef.current.readyState === WebSocket.OPEN ? 'connecting' : 'disconnected');
  }, []);

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

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  const initWebRTC = (address: string) => {
    const ws = new WebSocket(`ws://${address}`);
    wsRef.current = ws;

    ws.onopen = () => setStatus('connecting');

    ws.onmessage = async (evt) => {
      try {
        const msg = JSON.parse(evt.data);

        // Actualización de clientes desde el servidor en Rust
        if (msg.activeClients !== undefined) {
          setActiveClients(msg.activeClients);
          if (msg.activeClients === 0) {
            resetConnectionState();
          }
          return;
        }

        // Mensaje explícito de desconexión enviado desde la app móvil
        if (msg.type === 'disconnect') {
          resetConnectionState();
          return;
        }

        // Oferta WebRTC proveniente del móvil
        if (msg.type === 'offer') {
          // Si ya existía una PeerConnection activa, la reiniciamos
          if (pcRef.current) {
            pcRef.current.close();
          }

          const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
          });
          pcRef.current = pc;

          // Monitorear el estado de red de la conexión WebRTC
          pc.oniceconnectionstatechange = () => {
            if (
              pc.iceConnectionState === 'disconnected' ||
              pc.iceConnectionState === 'failed' ||
              pc.iceConnectionState === 'closed'
            ) {
              resetConnectionState();
            }
          };

          pc.ontrack = (evtTrack) => {
            if (audioRef.current) {
              audioRef.current.srcObject = evtTrack.streams[0];
              setStatus('connected');
              setActiveClients(1);
            }
          };

          pc.onicecandidate = (evtCandidate) => {
            if (evtCandidate.candidate && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ iceCandidate: evtCandidate.candidate }));
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription(msg));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify(pc.localDescription));

          // Procesar candidatos ICE que llegaron antes de setRemoteDescription
          while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            if (candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
          }
        } else if (msg.iceCandidate) {
          if (pcRef.current && pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.iceCandidate));
          } else {
            iceCandidatesQueue.current.push(msg.iceCandidate);
          }
        }
      } catch (err) {
        console.error('Error procesando mensaje en PC:', err);
      }
    };

    ws.onclose = () => {
      resetConnectionState();
      setStatus('disconnected');
    };

    ws.onerror = () => {
      resetConnectionState();
      setStatus('error');
    };
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

  const stopServer = async () => {
    try {
      resetConnectionState();

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      await invoke('stop_signaling_server');

      setStatus('disconnected');
      setServerAddr(null);
    } catch (error) {
      console.error('Error al detener el servidor:', error);
    }
  };

  useEffect(() => {
    return () => {
      stopServer();
    };
  }, []);

  return {
    serverAddr,
    status,
    activeClients,
    devices,
    selectedDeviceId,
    volume,
    audioRef,
    setSelectedDeviceId,
    applySinkId,
    handleVolumeChange,
    startServer,
    stopServer,
  };
}