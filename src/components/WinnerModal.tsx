import React, { useState, useEffect, useRef } from 'react';
import { FlagBall } from '../types';
import confetti from 'canvas-confetti';
import { Trophy, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WinnerModalProps {
  winner: FlagBall | null;
  battleNumber: number;
  battleDuration: number;
  totalParticipants: number;
  onCountdownComplete: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  winner,
  battleNumber,
  battleDuration,
  totalParticipants,
  onCountdownComplete,
}) => {
  const [countdown, setCountdown] = useState(10);
  const onCountdownCompleteRef = useRef(onCountdownComplete);

  useEffect(() => {
    onCountdownCompleteRef.current = onCountdownComplete;
  }, [onCountdownComplete]);

  // Robust 10-Second Countdown Timer & Automatic Next Match Trigger
  useEffect(() => {
    if (!winner) {
      setCountdown(10);
      return;
    }

    const CELEBRATION_MS = 10000; // Exactly 10 seconds
    const startTime = Date.now();
    let triggered = false;

    setCountdown(10);

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingMs = CELEBRATION_MS - elapsed;
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      setCountdown(remainingSec);

      // Exactly when countdown reaches 0 at 10 seconds
      if ((remainingMs <= 0 || elapsed >= CELEBRATION_MS) && !triggered) {
        triggered = true;
        clearInterval(timer);
        onCountdownCompleteRef.current();
      }
    }, 100);

    return () => {
      triggered = true;
      clearInterval(timer);
    };
  }, [winner]);

  // Confetti fireworks show across the full 10-second celebration
  useEffect(() => {
    if (!winner) return;

    const count = 200;
    const defaults = { origin: { y: 0.6 } };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 35, startVelocity: 55 });
    fire(0.2, { spread: 70 });
    fire(0.35, { spread: 110, decay: 0.91, scalar: 0.9 });
    fire(0.1, { spread: 140, startVelocity: 30, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 140, startVelocity: 48 });

    const periodicCannon = setInterval(() => {
      confetti({
        particleCount: 26,
        angle: 60,
        spread: 65,
        origin: { x: 0.05, y: 0.65 },
        colors: ['#fbbf24', '#f59e0b', '#38bdf8', '#ffffff', '#10b981'],
      });
      confetti({
        particleCount: 26,
        angle: 120,
        spread: 65,
        origin: { x: 0.95, y: 0.65 },
        colors: ['#fbbf24', '#f59e0b', '#38bdf8', '#ffffff', '#10b981'],
      });
    }, 1100);

    return () => clearInterval(periodicCannon);
  }, [winner]);

  if (!winner) return null;

  const minutes = Math.floor(battleDuration / 60);
  const seconds = Math.floor(battleDuration % 60);
  const durationStr = `${minutes}m ${seconds}s`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          className="relative w-full max-w-lg bg-gradient-to-b from-[#0e1628] via-[#080e1a] to-[#04060d] border-2 border-amber-400 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_70px_rgba(251,191,36,0.45)] overflow-hidden font-['Outfit',sans-serif]"
        >
          {/* Ambient Glows */}
          <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-400/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* 1. 🏆 Beautiful CHAMPION Title */}
          <div className="inline-flex items-center justify-center gap-2.5 px-6 py-2 rounded-full bg-gradient-to-r from-amber-500/25 via-yellow-400/25 to-amber-500/25 border-2 border-amber-400 text-amber-300 font-black font-['Chakra_Petch',sans-serif] text-lg uppercase tracking-widest mb-3 shadow-[0_0_25px_rgba(251,191,36,0.5)]">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span>CHAMPION</span>
            <Trophy className="w-6 h-6 text-amber-400" />
          </div>

          {/* 2. Large Circular Winning Flag-Ball Prominently in Center */}
          <div className="relative my-3 flex flex-col items-center">
            <div className="relative group">
              {/* Outer Golden Halo Rings */}
              <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 opacity-70 blur-lg animate-pulse pointer-events-none" />

              {/* Circular Flag Ball Container */}
              <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-slate-950 border-4 border-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.7)] overflow-hidden flex items-center justify-center">
                {/* Clipped Country Flag Image */}
                <img
                  src={`https://flagcdn.com/w320/${winner.id.toLowerCase()}.png`}
                  alt={winner.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                {/* Emoji Fallback */}
                <span className="absolute text-7xl select-none">{winner.emoji}</span>

                {/* 3D Spherical Specular Gloss Overlay */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.1) 40%, rgba(0, 0, 0, 0) 65%, rgba(0, 0, 0, 0.5) 100%)',
                  }}
                />
                {/* Inner Rim Stroke */}
                <div className="absolute inset-0 rounded-full border border-white/40 pointer-events-none" />
              </div>

              {/* #1 SURVIVOR Badge */}
              <div className="absolute -bottom-2 right-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs sm:text-sm font-['Chakra_Petch',sans-serif] shadow-lg border-2 border-slate-950 tracking-wider">
                #1 SURVIVOR
              </div>
            </div>

            {/* Country Name Clearly Displayed */}
            <h2 className="text-3xl sm:text-4xl font-black uppercase text-white font-['Chakra_Petch',sans-serif] tracking-wider mt-4 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
              {winner.name}
            </h2>

            {/* Clear CONGRATULATIONS! Message */}
            <div className="inline-flex items-center gap-2 text-emerald-400 font-extrabold font-['Chakra_Petch',sans-serif] text-base sm:text-lg uppercase tracking-widest mt-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>CONGRATULATIONS {winner.name.toUpperCase()}!</span>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>

            <p className="text-xs font-mono text-slate-400 mt-1">
              Outlasted {totalParticipants - 1} Nations in {durationStr}
            </p>
          </div>

          {/* 3. Automatic 10-Second Countdown Section (10 -> 9 -> 8 -> ... -> 1) */}
          <div className="mt-5 pt-4 border-t border-slate-800/90 flex flex-col items-center">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-300 font-bold mb-2">
              NEXT MATCH IN
            </span>

            {/* Large Animated Countdown Number */}
            <div className="relative flex items-center justify-center">
              <motion.div
                key={countdown}
                initial={{ scale: 1.35, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-500/25 via-yellow-500/20 to-amber-600/25 border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.4)] flex items-center justify-center font-['Chakra_Petch',sans-serif] font-black text-4xl sm:text-5xl text-amber-300 font-mono"
              >
                {countdown}
              </motion.div>
            </div>

            <span className="text-[11px] font-mono text-slate-400 mt-2">
              Match {battleNumber + 1} begins automatically • Spawning 50 new flags
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
