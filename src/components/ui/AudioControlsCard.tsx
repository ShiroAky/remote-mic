import React from 'react';

interface AudioControlsCardProps {
  volume: number;
  onVolumeChange: (val: number) => void;
}

export const AudioControlsCard: React.FC<AudioControlsCardProps> = ({ volume, onVolumeChange }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-md">
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
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  );
};