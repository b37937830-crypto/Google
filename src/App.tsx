/**
 * ALL COUNTRY FLAGS BATTLE
 * Autonomous Real-Time Physics Flag Survival Tournament
 * Groups of EXACTLY 50 flags per match without repetition across matches
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FlagBall, EliminationRecord } from './types';
import { getMatchFlags, FLAGS_PER_MATCH } from './data/countries';
import { soundFX } from './utils/audio';
import { ArenaCanvas } from './components/ArenaCanvas';
import { StreamHUD } from './components/StreamHUD';
import { EliminationFeed } from './components/EliminationFeed';
import { WinnerModal } from './components/WinnerModal';

export default function App() {
  const [matchNumber, setMatchNumber] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Match State
  const [initialBalls, setInitialBalls] = useState<FlagBall[]>([]);
  const [aliveCount, setAliveCount] = useState(FLAGS_PER_MATCH);
  const [eliminations, setEliminations] = useState<EliminationRecord[]>([]);
  const [winner, setWinner] = useState<FlagBall | null>(null);

  const matchNumRef = useRef(matchNumber);
  matchNumRef.current = matchNumber;

  const previousChampionRef = useRef<FlagBall | null>(null);

  // Initialize or Advance to the next match with a brand new group of 50 flags
  // strictly excluding the previous champion
  const loadMatch = useCallback((targetMatchNum: number, prevChampId?: string | null) => {
    const { flags } = getMatchFlags(targetMatchNum, prevChampId);

    const generatedBalls: FlagBall[] = flags.map((c) => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      x: 400,
      y: 300,
      vx: (Math.random() - 0.5) * 4.4,
      vy: (Math.random() - 0.5) * 4.4,
      radius: 16.0, // Circular physics and visual ball radius for 50 balls
      mass: 1.0,
      restitution: 0.98,
      angle: Math.random() * Math.PI * 2,
      angularVelocity: (Math.random() - 0.5) * 0.08,
      eliminated: false,
    }));

    // Reset all match state
    setWinner(null);
    setInitialBalls(generatedBalls);
    setAliveCount(generatedBalls.length);
    setEliminations([]);
    setElapsedSeconds(0);
    setMatchNumber(targetMatchNum);
  }, []);

  // Initialize Match 1 on load
  useEffect(() => {
    loadMatch(1, null);
  }, [loadMatch]);

  // Automatic transition to the next match when countdown reaches 0
  const startNextMatch = useCallback(() => {
    const nextMatchNum = matchNumRef.current + 1;
    const prevChampId = previousChampionRef.current?.id || null;
    loadMatch(nextMatchNum, prevChampId);
  }, [loadMatch]);

  // Match timer loop (runs continuously until winner is crowned)
  useEffect(() => {
    if (winner) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 0.5);
    }, 500);
    return () => clearInterval(interval);
  }, [winner]);

  // Elimination handler
  const handleElimination = useCallback(
    (eliminatedBall: FlagBall, exitSide: 'left' | 'right') => {
      setEliminations((prev) => {
        const rank = FLAGS_PER_MATCH - prev.length;
        const newRecord: EliminationRecord = {
          countryId: eliminatedBall.id,
          countryName: eliminatedBall.name,
          emoji: eliminatedBall.emoji,
          rank,
          eliminatedAt: elapsedSeconds,
          exitSide,
        };
        return [...prev, newRecord];
      });
    },
    [elapsedSeconds]
  );

  // Winner Declared (Simulation automatically stopped, victory fanfare played)
  const handleWinnerDeclared = useCallback((championBall: FlagBall) => {
    setWinner(championBall);
    previousChampionRef.current = championBall;
    soundFX.playVictoryFanfare();
  }, []);

  // Sound Toggle
  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    soundFX.setEnabled(nextVal);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#060913] text-slate-100 flex flex-col font-['Outfit',sans-serif]">
      {/* Stream & Battle Top HUD: MATCH 01, FLAGS ALIVE, ELIMINATED, SOUND ON/OFF */}
      <StreamHUD
        matchNumber={matchNumber}
        aliveCount={aliveCount}
        eliminatedCount={eliminations.length}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
      />

      {/* Main Simulation Viewport */}
      <main className="relative flex-1 w-full min-h-0 flex flex-row overflow-hidden">
        {/* Large Circular Arena in Center */}
        <div className="relative flex-1 w-full h-full min-h-0 flex items-center justify-center p-1 sm:p-3">
          <ArenaCanvas
            battleNumber={matchNumber}
            initialBalls={initialBalls}
            isGameOver={!!winner}
            winner={winner}
            onElimination={handleElimination}
            onWinnerDeclared={handleWinnerDeclared}
            onAliveCountChange={setAliveCount}
            soundEnabled={soundEnabled}
          />
        </div>

        {/* Real-time Broadcast Elimination Feed on Right Side */}
        <EliminationFeed eliminations={eliminations} />
      </main>

      {/* Champion Celebration Overlay with Automatic 10-Second Countdown */}
      {winner && (
        <WinnerModal
          winner={winner}
          battleNumber={matchNumber}
          battleDuration={elapsedSeconds}
          totalParticipants={FLAGS_PER_MATCH}
          onCountdownComplete={startNextMatch}
        />
      )}
    </div>
  );
}
