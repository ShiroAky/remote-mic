import React from 'react';
import { ConnectionStatus } from '../types';

interface StatusBadgeProps {
  status: ConnectionStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles: Record<ConnectionStatus, string> = {
    disconnected: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    connecting: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    connected: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  const labels: Record<ConnectionStatus, string> = {
    disconnected: 'Desconectado',
    connecting: 'Conectando...',
    connected: 'En Vivo',
    error: 'Error',
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};