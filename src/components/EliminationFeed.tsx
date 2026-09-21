import React from 'react';
import { EliminationRecord } from '../types';
import { Skull } from 'lucide-react';

interface EliminationFeedProps {
  eliminations: EliminationRecord[];
}

export const EliminationFeed: React.FC<EliminationFeedProps> = ({ eliminations }) => {
  // Show up to the last 20 eliminations, newest first
  const recent = eliminations.slice(-20).reverse();

  return (
    <aside className="w-56 sm:w-64 h-full bg-[#050811]/85 border-l border-slate-800/80 backdrop-blur-md flex flex-col z-10 shrink-0">
      {/* Feed Header */}
      <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skull className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-xs font-bold uppercase tracking-wider font-mono text-slate-200">
            RECENT ELIMINATIONS
          </span>
        </div>
        <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
          {eliminations.length}
        </span>
      </div>

      {/* Feed Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
        {recent.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
            <span className="text-2xl mb-1">⚔️</span>
            <p className="text-xs font-mono text-slate-400">Battle in progress</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Flags escaping through the left or right openings will appear here.
            </p>
          </div>
        ) : (
          recent.map((item, idx) => (
            <div
              key={`${item.countryId}_${item.rank}`}
              className={`flex items-center justify-between px-2 py-1.5 rounded text-xs transition-all ${
                idx === 0
                  ? 'bg-rose-950/50 border border-rose-500/40 text-rose-200 font-semibold shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                  : 'text-slate-300 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm shrink-0">☠️</span>
                <span className="text-base shrink-0">{item.emoji}</span>
                <span className="truncate text-xs font-medium">{item.countryName}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 shrink-0">
                {item.exitSide === 'left' ? 'LEFT' : 'RIGHT'}
              </span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
