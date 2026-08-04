import { StreamStatus } from './useWebRtcStream';

const styleConfig: Record<StreamStatus, { container: string; icon: string }> = {
  connected: {
    container: 'bg-emerald-500/10 border-2 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]',
    icon: 'text-emerald-400',
  },
  connecting: {
    container: 'bg-amber-500/10 border-2 border-amber-500',
    icon: 'text-amber-400',
  },
  error: {
    container: 'bg-rose-500/10 border-2 border-rose-500',
    icon: 'text-rose-400',
  },
  idle: {
    container: 'bg-slate-800 border-2 border-slate-700',
    icon: 'text-slate-500',
  },
};

export function MicIcon({ status }: { status: StreamStatus }) {
  const current = styleConfig[status];

  return (
    <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 mb-6 ${current.container}`}>
      <svg className={`w-12 h-12 ${current.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
        />
      </svg>
    </div>
  );
}