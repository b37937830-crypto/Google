import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface StreamHUDProps {
  matchNumber: number;
  aliveCount: number;
  eliminatedCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const StreamHUD: React.FC<StreamHUDProps> = ({
  matchNumber,
  aliveCount,
  eliminatedCount,
  soundEnabled,
  onToggleSound,
}) => {
  const matchStr = `MATCH ${matchNumber.toString().padStart(2, '0')}`;

  return (
    <header className="w-full bg-[#050811]/95 border-b border-slate-800/90 px-3 py-2.5 sm:px-6 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-lg z-20">
      {/* 1. Title, Live Broadcast Badge, and Battle Status */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm sm:text-base font-black tracking-wider uppercase text-white font-['Chakra_Petch',sans-serif]">
          ALL COUNTRY FLAGS BATTLE
        </h1>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-400 font-mono font-bold text-xs shadow-[0_0_10px_rgba(244,63,94,0.35)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          <span>LIVE</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono ml-2">
          <span className="text-cyan-400 font-bold font-['Chakra_Petch',sans-serif] tracking-wider text-sm">{matchStr}</span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-semibold">{aliveCount} ALIVE</span>
          <span className="text-slate-600">•</span>
          <span className="text-rose-400 font-semibold">{eliminatedCount} ELIMINATED</span>
        </div>
      </div>

      {/* 2. Top Right Control: SOUND ON/OFF */}
      <div className="flex items-center">
        <button
          onClick={onToggleSound}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
            soundEnabled
              ? 'bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-400 border-slate-700'
          }`}
          title={soundEnabled ? 'Disable Sound' : 'Enable Sound'}
        >
          {soundEnabled ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>SOUND ON</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
              <span>SOUND OFF</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
