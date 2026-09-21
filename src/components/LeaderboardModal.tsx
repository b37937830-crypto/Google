import React from 'react';
import { ChampionRecord } from '../types';
import { Trophy, X, Clock, Users } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  champions: ChampionRecord[];
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  champions,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white font-['Chakra_Petch']">
              CHAMPIONS HALL OF FAME
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 divide-y divide-slate-800/60 scrollbar-thin">
          {champions.length === 0 ? (
            <div className="text-center py-10 text-slate-500 font-mono text-xs">
              <span className="text-3xl block mb-2">🏆</span>
              No champions crowned yet in this session!
              <p className="mt-1 text-slate-600">The current battle will produce the first champion.</p>
            </div>
          ) : (
            champions.map((champ, index) => {
              const minutes = Math.floor(champ.durationSeconds / 60);
              const seconds = Math.floor(champ.durationSeconds % 60);
              const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

              return (
                <div
                  key={`${champ.battleNumber}_${champ.countryId}`}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-amber-400 text-sm w-6">
                      #{index + 1}
                    </span>
                    <span className="text-2xl">{champ.emoji}</span>
                    <div>
                      <div className="font-bold text-white text-sm">{champ.countryName}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        Battle #{champ.battleNumber}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-slate-400 text-[11px]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{timeStr}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-500" />
                      <span>{champ.totalParticipants} flags</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-mono font-bold cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
