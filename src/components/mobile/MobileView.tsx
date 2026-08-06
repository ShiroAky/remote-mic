import { useWebRtcStream } from './useWebRtcStream';
import { StatusBadge } from './StatusBadge';
import { MicIcon } from './MicIcon';
import { GitCompareArrowsIcon } from 'lucide-react'
import { getVersion } from '@tauri-apps/api/app'

// Numero de versión de la aplicación:
const version = await getVersion()

export function MobileView({ pcIp }: { pcIp?: string }) {
  const {
    status,
    errorMessage,
    targetIp,
    setTargetIp,
    startStreaming,
    stopStreaming,
  } = useWebRtcStream({ initialPcIp: pcIp });

  const isConnectingOrConnected = status === 'connected' || status === 'connecting';

  return (
    <div 
      className="flex flex-col min-h-screen w-full bg-slate-900 text-white overflow-y-auto select-none box-border px-5"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
      }}
    >
      {/* Header */}
      <header className="flex-none flex items-center justify-between py-3 border-b border-slate-800">
        <span className="font-semibold text-sm tracking-wide text-slate-300">
          Remote Mic
        </span>
        <StatusBadge status={status} />
      </header>

      {/* Main Content (Se expande verticalmente) */}
      <main className="flex-1 flex flex-col items-center justify-center py-6 text-center">
        <div className="mb-6">
          <MicIcon status={status} />
        </div>

        <h2 className="text-lg font-bold tracking-tight mb-1">
          {status === 'connected' && 'Transmitiendo Audio'}
          {status === 'connecting' && 'Conectando con la PC...'}
          {status === 'error' && 'Error de Conexión'}
          {status === 'idle' && 'Listo para Transmitir'}
        </h2>

        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          {status === 'connected' && `Transmitiendo en vivo a ${targetIp}`}
          {status === 'connecting' && 'Estableciendo enlace WebRTC...'}
          {status === 'error' && (errorMessage || 'Verifica la IP de destino.')}
          {status === 'idle' && 'Ingresa la IP de tu PC y presiona el botón para conectar.'}
        </p>

        <div className="w-full max-w-xs mb-5 pt-4">
          <input
            type="text"
            value={targetIp}
            onChange={(e) => setTargetIp(e.target.value)}
            disabled={isConnectingOrConnected}
            placeholder="Ej: 192.168.1.15:8080"
            className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-center font-mono text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
          />
        </div>
      </main>

      {/* Footer (Botón y versión separados verticalmente en flujo normal) */}
      <footer className="flex-none flex flex-col items-center gap-3 pt-2">
        {!isConnectingOrConnected ? (
          <button
            onClick={startStreaming}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] font-semibold text-white transition-all text-sm shadow-lg"
          >
            Iniciar Transmisión
          </button>
        ) : (
          <button
            onClick={stopStreaming}
            className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] font-semibold text-white transition-all text-sm shadow-lg"
          >
            Detener Transmisión
          </button>
        )}

        <span className="flex flex-row items-center justify-center gap-1.5 text-xs text-slate-500 font-mono"><GitCompareArrowsIcon /> Versión {version}</span>
      </footer>
    </div>
  );
}