import { StreamStatus } from './useWebRtcStream';

const statusConfig: Record<StreamStatus, { label: string; dotClass: string }> = {
  connected: { label: 'En Vivo', dotClass: 'bg-emerald-500 animate-pulse' },
  connecting: { label: 'Conectando...', dotClass: 'bg-amber-500 animate-ping' },
  error: { label: 'Error', dotClass: 'bg-rose-500' },
  idle: { label: 'Inactivo', dotClass: 'bg-slate-500' },
};

export function StatusBadge({ status }: { status: StreamStatus }) {
  const current = statusConfig[status] || statusConfig.idle;

  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${current.dotClass}`} />
      <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {current.label}
      </span>
    </div>
  );
}