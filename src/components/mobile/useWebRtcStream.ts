import { useState, useEffect, useRef, useCallback } from "react";

export type StreamStatus = "idle" | "connecting" | "connected" | "error";

interface UseWebRtcStreamOptions {
  initialPcIp?: string;
}

export function useWebRtcStream({ initialPcIp }: UseWebRtcStreamOptions = {}) {
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [targetIp, setTargetIp] = useState<string>(() => {
    return localStorage.getItem("remote_mic_pc_ip") || initialPcIp || "";
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (targetIp) {
      localStorage.setItem("remote_mic_pc_ip", targetIp);
    }
  }, [targetIp]);

  const stopStreaming = useCallback(() => {
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
    setStatus("idle");
  }, []);

  const startStreaming = useCallback(async () => {
    if (!targetIp.trim()) {
      setStatus("error");
      setErrorMessage("Debes ingresar la IP de la PC.");
      return;
    }

    try {
      setStatus("connecting");
      setErrorMessage(null);

      // 1. Obtener audio del micrófono móvil
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      mediaStreamRef.current = stream;

      // 2. Conectar al servidor WebSocket de señalización en la PC
      const cleanIp = targetIp
        .trim()
        .replace(/^ws:\/\//, "")
        .replace(/\/$/, "");
      const wsUrl = cleanIp.includes(":")
        ? `ws://${cleanIp}`
        : `ws://${cleanIp}:8080`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // 3. Crear conexión PeerConnection WebRTC
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ iceCandidate: event.candidate }));
        }
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "answer") {
            await pc.setRemoteDescription(new RTCSessionDescription(msg));
            setStatus("connected");
          } else if (msg.iceCandidate) {
            await pc.addIceCandidate(new RTCIceCandidate(msg.iceCandidate));
          }
        } catch (err) {
          console.error("Error procesando señal WebRTC:", err);
        }
      };

      ws.onopen = async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify(pc.localDescription));
      };

      ws.onerror = () => {
        setStatus("error");
        setErrorMessage(`No se pudo conectar con la PC en ${cleanIp}`);
        stopStreaming();
      };

      ws.onclose = () => {
        setStatus("idle");
      };
    } catch (err: any) {
      console.error("Error de conexión:", err);
      setStatus("error");
      setErrorMessage(err?.message || "Error al acceder al micrófono");
      stopStreaming();
    }
  }, [targetIp, stopStreaming]);

  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  return {
    status,
    errorMessage,
    targetIp,
    setTargetIp,
    startStreaming,
    stopStreaming,
  };
}
