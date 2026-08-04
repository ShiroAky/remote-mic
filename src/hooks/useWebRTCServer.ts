import { useState, useEffect, useRef } from 'react';
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

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pcRef.current = pc;

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
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.srcObject = null;
      }

      await invoke('stop_signaling_server');

      setStatus('disconnected');
      setActiveClients(0);
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