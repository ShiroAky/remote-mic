import { useState, useEffect, useRef } from 'react';

export function MobileView({ pcIp: initialPcIp }: { pcIp?: string }) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [targetIp, setTargetIp] = useState<string>(() => {
    return localStorage.getItem('remote_mic_pc_ip') || initialPcIp || '';
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (targetIp) {
      localStorage.setItem('remote_mic_pc_ip', targetIp);
    }
  }, [targetIp]);

  const handleStartStreaming = async () => {
    if (!targetIp.trim()) {
      setStatus('error');
      setErrorMessage('Debes ingresar la IP de la PC.');
      return;
    }

    try {
      setStatus('connecting');
      setErrorMessage(null);

      // 1. Obtener audio del micrófono móvil
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      mediaStreamRef.current = stream;

      // 2. Conectar al servidor WebSocket de señalización en la PC (Puerto por defecto o con IP)
      const cleanIp = targetIp.trim().replace(/^ws:\/\//, '').replace(/\/$/, '');
      const wsUrl = cleanIp.includes(':') ? `ws://${cleanIp}` : `ws://${cleanIp}:8080`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // 3. Crear conexión PeerConnection WebRTC
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      // Agregar los tracks de audio al PeerConnection
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Enviar candidatos ICE al servidor en la PC
      pc.onicecandidate = (event) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ iceCandidate: event.candidate }));
        }
      };

      // Manejar mensajes recibidos desde la PC (Respuesta SDP)
      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(msg));
            setStatus('connected');
          } else if (msg.iceCandidate) {
            await pc.addIceCandidate(new RTCIceCandidate(msg.iceCandidate));
          }
        } catch (err) {
          console.error('Error procesando señal WebRTC:', err);
        }
      };

      ws.onopen = async () => {
        // Crear oferta WebRTC y enviarla a la PC
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify(pc.localDescription));
      };

      ws.onerror = () => {
        setStatus('error');
        setErrorMessage('No se pudo conectar con la PC en ' + cleanIp);
        handleStopStreaming();
      };

      ws.onclose = () => {
        setStatus('idle');
      };

    } catch (err: any) {
      console.error('Error de conexión:', err);
      setStatus('error');
      setErrorMessage(err?.message || 'Error al acceder al micrófono');
      handleStopStreaming();
    }
  };

  const handleStopStreaming = () => {
    // Limpiar streams y sockets
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('idle');
  };

  useEffect(() => {
    return () => {
      handleStopStreaming();
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 text-white select-none overflow-hidden">
      <header className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <span className="font-semibold text-sm tracking-wide text-slate-300 mt-10">Remote Mic</span>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${
            status === 'connected' ? 'bg-emerald-500 animate-pulse' :
            status === 'connecting' ? 'bg-amber-500 animate-ping' :
            status === 'error' ? 'bg-rose-500' : 'bg-slate-500'
          }`} />
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {status === 'connected' ? 'En Vivo' : status === 'connecting' ? 'Conectando...' : status}
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 mb-6 ${
          status === 'connected' 
            ? 'bg-emerald-500/10 border-2 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]' 
            : status === 'connecting'
            ? 'bg-amber-500/10 border-2 border-amber-500'
            : status === 'error'
            ? 'bg-rose-500/10 border-2 border-rose-500'
            : 'bg-slate-800 border-2 border-slate-700'
        }`}>
          <svg className={`w-12 h-12 ${
            status === 'connected' ? 'text-emerald-400' :
            status === 'connecting' ? 'text-amber-400' :
            status === 'error' ? 'text-rose-400' : 'text-slate-500'
          }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>

        <div className="w-full max-w-xs mb-4">
          <label className="block text-xs font-medium text-slate-400 mb-1.5 text-left">
            Dirección IP de la PC:
          </label>
          <input
            type="text"
            value={targetIp}
            onChange={(e) => setTargetIp(e.target.value)}
            disabled={status === 'connected' || status === 'connecting'}
            placeholder="Ej: 192.168.1.15:8080"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-center font-mono text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50 transition-all"
          />
        </div>

        <h2 className="text-xl font-bold tracking-tight mb-1">
          {status === 'connected' && 'Transmitiendo Audio'}
          {status === 'connecting' && 'Conectando con la PC...'}
          {status === 'error' && 'Error de Conexión'}
          {status === 'idle' && 'Listo para Transmitir'}
        </h2>

        <p className="text-sm text-slate-400 max-w-xs">
          {status === 'connected' && `Transmitiendo en vivo a ${targetIp}`}
          {status === 'connecting' && 'Estableciendo enlace WebRTC...'}
          {status === 'error' && (errorMessage || 'Verifica la IP de destino.')}
          {status === 'idle' && 'Ingresa la IP de tu PC y presiona el botón para conectar.'}
        </p>
      </main>

      <footer className="pb-6 bg-slate-900">
        {status !== 'connected' && status !== 'connecting' ? (
          <button
            onClick={handleStartStreaming}
            className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] font-semibold text-white transition-all shadow-lg shadow-emerald-900/20"
          >
            Iniciar Transmisión
          </button>
        ) : (
          <button
            onClick={handleStopStreaming}
            className="w-full py-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] font-semibold text-white transition-all shadow-lg shadow-rose-900/20"
          >
            Detener Transmisión
          </button>
        )}
      </footer>
    </div>
  );
}