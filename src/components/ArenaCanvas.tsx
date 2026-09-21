import React, { useRef, useEffect, useCallback } from 'react';
import { FlagBall, ArenaConfig, Particle } from '../types';
import { stepPhysics, normalizeAngle } from '../utils/physics';
import { getFlagBallTexture } from '../utils/flagRenderer';
import { soundFX } from '../utils/audio';

interface ArenaCanvasProps {
  battleNumber: number;
  initialBalls: FlagBall[];
  speed?: number;
  isGameOver: boolean;
  winner: FlagBall | null;
  onElimination: (ball: FlagBall, exitSide: 'left' | 'right') => void;
  onWinnerDeclared: (ball: FlagBall) => void;
  onAliveCountChange: (aliveCount: number) => void;
  soundEnabled: boolean;
}

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  alpha: number;
  vy: number;
  color: string;
}

export const ArenaCanvas: React.FC<ArenaCanvasProps> = ({
  battleNumber,
  initialBalls,
  speed = 1.0,
  isGameOver,
  winner,
  onElimination,
  onWinnerDeclared,
  onAliveCountChange,
  soundEnabled,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Authoritative Physics Simulation State held in Refs to guarantee 60 FPS locked loop
  const ballsRef = useRef<FlagBall[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const textIdCounter = useRef(0);
  const lastBattleNumRef = useRef(-1);
  const winnerDeclaredRef = useRef(false);

  // Dynamic Arena Geometry
  const arenaRef = useRef<ArenaConfig>({
    centerX: 400,
    centerY: 300,
    radius: 250,
    leftOpeningAngle: Math.PI,
    rightOpeningAngle: 0,
    openingHalfAngle: 0.22, // ~25 degree physical opening
    wallThickness: 6,
  });

  // Camera Zoom for Champion
  const zoomProgressRef = useRef(0);
  const lastEliminatedBallRef = useRef<FlagBall | null>(null);

  // Sync props to refs to avoid tearing down the canvas loop
  const speedRef = useRef<number>(speed);
  speedRef.current = speed;
  const isGameOverRef = useRef<boolean>(isGameOver);
  isGameOverRef.current = isGameOver;
  const winnerRef = useRef<FlagBall | null>(winner);
  winnerRef.current = winner;

  // Sound state ref
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Flash highlight on exits when a flag passes through
  const leftExitGlowRef = useRef(0);
  const rightExitGlowRef = useRef(0);

  // Sound trigger helpers
  const handleBallCollision = useCallback(() => {
    if (soundEnabledRef.current) soundFX.playBounce(0.7);
  }, []);

  const handleWallHit = useCallback(() => {
    if (soundEnabledRef.current) soundFX.playWallHit();
  }, []);

  // Particle Generators
  const addSparks = useCallback((x: number, y: number, color = '#38bdf8', count = 4) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 1.2 + Math.random() * 3.0;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color,
        size: 1.5 + Math.random() * 2,
        alpha: 1,
        life: 0,
        maxLife: 14 + Math.random() * 12,
        shape: 'circle',
      });
    }
  }, []);

  const addEliminationBurst = useCallback((ball: FlagBall, exitSide: 'left' | 'right') => {
    if (soundEnabledRef.current) soundFX.playElimination();
    if (exitSide === 'left') {
      leftExitGlowRef.current = 1.0;
    } else {
      rightExitGlowRef.current = 1.0;
    }

    const count = 28;
    const colors = ['#f43f5e', '#fb7185', '#fda4af', '#fbbf24', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle =
        exitSide === 'left'
          ? Math.PI + (Math.random() - 0.5) * 1.5
          : 0 + (Math.random() - 0.5) * 1.5;
      const spd = 2.5 + Math.random() * 6.5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      particlesRef.current.push({
        x: ball.x,
        y: ball.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color,
        size: 2 + Math.random() * 3,
        alpha: 1,
        life: 0,
        maxLife: 24 + Math.random() * 18,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      });
    }

    floatingTextsRef.current.push({
      id: ++textIdCounter.current,
      text: `${ball.emoji} OUT!`,
      x: ball.x,
      y: ball.y,
      alpha: 1,
      vy: -1.0,
      color: '#f43f5e',
    });
  }, []);

  // Main Canvas Setup and Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    const render = (time: number) => {
      animId = requestAnimationFrame(render);

      const rect = container.getBoundingClientRect();
      const cssWidth = rect.width;
      const cssHeight = rect.height;
      if (cssWidth <= 0 || cssHeight <= 0) return;

      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.round(cssWidth * dpr);
      const targetH = Math.round(cssHeight * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      // Update Arena Center & Radius to fill ~88% of viewport
      const centerX = cssWidth / 2;
      const centerY = cssHeight / 2;
      const arenaRadius = Math.max(120, Math.min(cssWidth * 0.44, cssHeight * 0.44));

      arenaRef.current.centerX = centerX;
      arenaRef.current.centerY = centerY;
      arenaRef.current.radius = arenaRadius;

      // The circular arena ring and its two gate sections rotate continuously as one coherent whole
      const rotationAngle = (time * 0.0004) % (Math.PI * 2);
      arenaRef.current.rightOpeningAngle = normalizeAngle(0 + rotationAngle);
      arenaRef.current.leftOpeningAngle = normalizeAngle(Math.PI + rotationAngle);

      // Spawn / Re-center balls if new battle triggered
      if (lastBattleNumRef.current !== battleNumber) {
        lastBattleNumRef.current = battleNumber;
        winnerDeclaredRef.current = false;
        lastEliminatedBallRef.current = null;
        zoomProgressRef.current = 0;
        particlesRef.current = [];
        floatingTextsRef.current = [];

        // Distribute exactly 50 balls naturally across concentric rings without overcrowding
        const total = initialBalls.length;
        const placedPoints: { x: number; y: number }[] = [];
        const ringCounts = [5, 11, 16, 18]; // 5 + 11 + 16 + 18 = 50
        let countAssigned = 0;

        for (let rIdx = 0; rIdx < ringCounts.length; rIdx++) {
          const count = ringCounts[rIdx];
          const ringRadius = arenaRadius * (0.22 + rIdx * 0.16);
          const phaseOffset = Math.random() * Math.PI * 2;
          for (let c = 0; c < count && countAssigned < total; c++) {
            const angle = phaseOffset + (c * 2 * Math.PI) / count;
            placedPoints.push({
              x: centerX + Math.cos(angle) * ringRadius,
              y: centerY + Math.sin(angle) * ringRadius,
            });
            countAssigned++;
          }
        }

        // Fill any fallback points if needed
        while (placedPoints.length < total) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * arenaRadius * 0.65;
          placedPoints.push({
            x: centerX + Math.cos(a) * r,
            y: centerY + Math.sin(a) * r,
          });
        }

        // Relaxation passes to guarantee zero overlap and uniform spacing
        const sampleRadius = initialBalls[0]?.radius || 16;
        const minSeparation = sampleRadius * 2 + 4;

        for (let step = 0; step < 15; step++) {
          for (let i = 0; i < placedPoints.length; i++) {
            for (let j = i + 1; j < placedPoints.length; j++) {
              const p1 = placedPoints[i];
              const p2 = placedPoints[j];
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const dist = Math.hypot(dx, dy);
              if (dist < minSeparation && dist > 0.001) {
                const diff = (minSeparation - dist) * 0.5;
                const nx = dx / dist;
                const ny = dy / dist;
                p1.x -= nx * diff;
                p1.y -= ny * diff;
                p2.x += nx * diff;
                p2.y += ny * diff;
              }
            }

            // Keep well within circular arena boundary
            const dx = placedPoints[i].x - centerX;
            const dy = placedPoints[i].y - centerY;
            const d = Math.hypot(dx, dy);
            const maxAllowed = arenaRadius * 0.74;
            if (d > maxAllowed && d > 0.001) {
              placedPoints[i].x = centerX + (dx / d) * maxAllowed;
              placedPoints[i].y = centerY + (dy / d) * maxAllowed;
            }
          }
        }

        ballsRef.current = initialBalls.map((ib, i) => {
          const pos = placedPoints[i] || { x: centerX, y: centerY };
          const velAngle = Math.random() * Math.PI * 2;
          const velSpeed = 2.2 + Math.random() * 2.64;
          return {
            ...ib,
            x: pos.x,
            y: pos.y,
            vx: Math.cos(velAngle) * velSpeed,
            vy: Math.sin(velAngle) * velSpeed,
            angle: Math.random() * Math.PI * 2,
            angularVelocity: (Math.random() - 0.5) * 0.08,
            eliminated: false,
          };
        });

        onAliveCountChange(ballsRef.current.length);
      }

      // Decay exit glow pulses
      if (leftExitGlowRef.current > 0) {
        leftExitGlowRef.current = Math.max(0, leftExitGlowRef.current - 0.04);
      }
      if (rightExitGlowRef.current > 0) {
        rightExitGlowRef.current = Math.max(0, rightExitGlowRef.current - 0.04);
      }

      // Physics Simulation Step (Sub-step 2x for rock-solid stability)
      const activeBalls = ballsRef.current.filter((b) => !b.eliminated);

      // Runs automatically without manual pausing; stops strictly when 1 winner remains
      if (!isGameOverRef.current && activeBalls.length > 1) {
        const subSteps = 2;
        const subDt = speedRef.current / subSteps;
        for (let s = 0; s < subSteps; s++) {
          const res = stepPhysics(
            activeBalls,
            arenaRef.current,
            subDt,
            handleBallCollision,
            handleWallHit,
            (ball, exitSide) => {
              lastEliminatedBallRef.current = ball;
              addEliminationBurst(ball, exitSide);
              onElimination(ball, exitSide);
            },
            (x, y, color) => addSparks(x, y, color, 3)
          );

          if (res.eliminated.length > 0) {
            const currentAlive = ballsRef.current.filter((b) => !b.eliminated).length;
            onAliveCountChange(currentAlive);

            // Check if only 1 or fewer flags remain -> CHAMPION!
            if (currentAlive <= 1 && !winnerDeclaredRef.current) {
              winnerDeclaredRef.current = true;
              const champ =
                currentAlive === 1
                  ? ballsRef.current.find((b) => !b.eliminated)
                  : lastEliminatedBallRef.current || ballsRef.current[0];
              if (champ) {
                champ.vx = 0;
                champ.vy = 0;
                champ.angularVelocity = 0;
                onWinnerDeclared(champ);
              }
              break;
            }
          }
        }
      } else if (!isGameOverRef.current && activeBalls.length <= 1 && !winnerDeclaredRef.current) {
        // Fallback champion declaration
        winnerDeclaredRef.current = true;
        const champ = activeBalls[0] || lastEliminatedBallRef.current || ballsRef.current[0];
        if (champ) {
          champ.vx = 0;
          champ.vy = 0;
          champ.angularVelocity = 0;
          onWinnerDeclared(champ);
        }
      }

      // ==========================================
      // CANVAS RENDERING
      // ==========================================
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      // Camera transformation and physics stop if champion won
      const champ = winnerRef.current || (activeBalls.length === 1 ? activeBalls[0] : null);
      if (isGameOverRef.current && champ) {
        // Stop battle physics completely
        champ.vx = 0;
        champ.vy = 0;
        champ.angularVelocity = 0;

        // Smoothly glide winning flag to center of the arena
        champ.x += (centerX - champ.x) * 0.05;
        champ.y += (centerY - champ.y) * 0.05;

        // Celebratory victory sparkle effect around the champion in the arena
        if (Math.random() < 0.25) {
          addSparks(
            champ.x + (Math.random() - 0.5) * 50,
            champ.y + (Math.random() - 0.5) * 50,
            '#fbbf24',
            2
          );
        }

        if (zoomProgressRef.current < 1) {
          zoomProgressRef.current = Math.min(1, zoomProgressRef.current + 0.02);
        }
        const ease = Math.sin((zoomProgressRef.current * Math.PI) / 2);
        const zoomScale = 1 + ease * 0.45;
        const targetX = champ.x;
        const targetY = champ.y;

        ctx.translate(centerX, centerY);
        ctx.scale(zoomScale, zoomScale);
        ctx.translate(
          -centerX - (targetX - centerX) * ease * 0.7,
          -centerY - (targetY - centerY) * ease * 0.7
        );
      }

      // 1. Draw the Complete Visual Cyan/Blue Circular Arena System with its Rotating Gates
      // (Rotates smoothly and continuously as ONE coherent whole around center)
      drawCompleteRotatingVisualArena(
        ctx,
        arenaRef.current,
        rotationAngle,
        leftExitGlowRef.current,
        rightExitGlowRef.current,
        time
      );

      // 2. Draw All Active Moving Flag-Balls (Round balls with spherical gloss)
      for (let i = 0; i < activeBalls.length; i++) {
        const ball = activeBalls[i];
        const isChamp = isGameOverRef.current && champ?.id === ball.id;
        drawFlag(ctx, ball, isChamp, time);
      }

      // 3. Draw Particles (Sparks & Confetti)
      drawParticles(ctx, particlesRef.current);

      // 4. Draw Floating Texts ("🏁 OUT")
      drawFloatingTexts(ctx, floatingTextsRef.current);

      ctx.restore();
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [
    battleNumber,
    initialBalls,
    handleBallCollision,
    handleWallHit,
    addEliminationBurst,
    addSparks,
    onElimination,
    onWinnerDeclared,
    onAliveCountChange,
  ]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden select-none"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

// ==========================================
// RENDERING HELPERS
// ==========================================

function drawCompleteRotatingVisualArena(
  ctx: CanvasRenderingContext2D,
  arena: ArenaConfig,
  rotationAngle: number,
  leftFlash: number,
  rightFlash: number,
  time: number
) {
  const { centerX, centerY, radius, openingHalfAngle } = arena;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotationAngle);

  // 1. Dark Futuristic Cyber Floor with Rotating Radial Gradient
  const floorGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  floorGrad.addColorStop(0, 'rgba(15, 23, 42, 0.55)');
  floorGrad.addColorStop(0.65, 'rgba(8, 12, 24, 0.82)');
  floorGrad.addColorStop(0.92, 'rgba(4, 7, 18, 0.96)');
  floorGrad.addColorStop(1, 'rgba(2, 4, 10, 1.0)');
  ctx.fillStyle = floorGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // 2. Rotating Concentric Radar & Energy Rings
  const ringSteps = [0.22, 0.44, 0.66, 0.85];
  for (let i = 0; i < ringSteps.length; i++) {
    const r = radius * ringSteps[i];
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = i === ringSteps.length - 1 ? 'rgba(56, 189, 248, 0.14)' : 'rgba(56, 189, 248, 0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 3. Rotating 8-Axis Cyber Crosshairs & Coordinate Markers
  const numAxes = 8;
  for (let i = 0; i < numAxes; i++) {
    const angle = (i * Math.PI * 2) / numAxes;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(cosA * radius * 0.15, sinA * radius * 0.15);
    ctx.lineTo(cosA * (radius - 8), sinA * (radius - 8));
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(56, 189, 248, 0.09)' : 'rgba(56, 189, 248, 0.04)';
    ctx.lineWidth = i % 2 === 0 ? 1.5 : 1;
    ctx.stroke();

    // Coordinate reticle ticks on major axes
    if (i % 2 === 0) {
      const tickDist = radius * 0.55;
      const tx = cosA * tickDist;
      const ty = sinA * tickDist;
      ctx.beginPath();
      ctx.arc(tx, ty, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.fill();
    }
  }

  // 4. Center Orbital Target Reticle
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;

  // 5. THE PRIMARY ROTATING ARENA NEON WALL ARCS
  // Two solid glowing arcs: Top Arc and Bottom Arc
  // Leaving the two gate sections at 0 and PI completely OPEN and CLEAR for physical exits!
  ctx.save();
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = 26;
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 5.5;

  ctx.beginPath();
  ctx.arc(0, 0, radius, openingHalfAngle, Math.PI - openingHalfAngle);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, radius, Math.PI + openingHalfAngle, Math.PI * 2 - openingHalfAngle);
  ctx.stroke();

  // Crisp High-Intensity White Core Line
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.2;

  ctx.beginPath();
  ctx.arc(0, 0, radius, openingHalfAngle, Math.PI - openingHalfAngle);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, radius, Math.PI + openingHalfAngle, Math.PI * 2 - openingHalfAngle);
  ctx.stroke();
  ctx.restore();

  // 6. Secondary Inner Laser Ring (radius - 7)
  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([12, 8]);

  ctx.beginPath();
  ctx.arc(0, 0, radius - 7, openingHalfAngle, Math.PI - openingHalfAngle);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, radius - 7, Math.PI + openingHalfAngle, Math.PI * 2 - openingHalfAngle);
  ctx.stroke();
  ctx.restore();

  // 7. Outer Tech Ring with Segmented Arcs (radius + 9)
  ctx.save();
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
  ctx.lineWidth = 3;
  ctx.setLineDash([36, 18, 72, 18]);

  ctx.beginPath();
  ctx.arc(0, 0, radius + 9, openingHalfAngle + 0.05, Math.PI - openingHalfAngle - 0.05);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, radius + 9, Math.PI + openingHalfAngle + 0.05, Math.PI * 2 - openingHalfAngle - 0.05);
  ctx.stroke();
  ctx.restore();

  // 8. Rotating Radial Tech Teeth & Notches (Outer circumference, avoiding the two gate openings)
  const numTeeth = 32;
  for (let i = 0; i < numTeeth; i++) {
    const a = (i * Math.PI * 2) / numTeeth;
    const distFromZero = Math.abs(normalizeAngle(a));
    const distFromPi = Math.abs(normalizeAngle(a - Math.PI));
    if (distFromZero < openingHalfAngle + 0.08 || distFromPi < openingHalfAngle + 0.08) {
      continue;
    }

    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    const isMajor = i % 4 === 0;
    const innerR = radius + 4;
    const outerR = radius + (isMajor ? 16 : 10);

    ctx.beginPath();
    ctx.moveTo(cosA * innerR, sinA * innerR);
    ctx.lineTo(cosA * outerR, sinA * outerR);
    ctx.strokeStyle = isMajor ? 'rgba(56, 189, 248, 0.9)' : 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = isMajor ? 2.5 : 1.5;
    ctx.stroke();
  }

  // 9. Orbital Energy Power Capacitors along the solid wall arcs
  const numNodes = 8;
  for (let i = 0; i < numNodes; i++) {
    const a = (i * Math.PI * 2) / numNodes;
    const distFromZero = Math.abs(normalizeAngle(a));
    const distFromPi = Math.abs(normalizeAngle(a - Math.PI));
    if (distFromZero < openingHalfAngle + 0.12 || distFromPi < openingHalfAngle + 0.12) {
      continue;
    }

    const nx = Math.cos(a) * radius;
    const ny = Math.sin(a) * radius;

    ctx.save();
    ctx.beginPath();
    ctx.arc(nx, ny, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 14;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(nx, ny, 6.5, 0, Math.PI * 2);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // 10. Traveling High-Energy Plasma Arcs along the perimeter
  const numTravelers = 3;
  for (let i = 0; i < numTravelers; i++) {
    const baseAngle = ((time * 0.0014) + (i * Math.PI * 2) / numTravelers) % (Math.PI * 2);
    const endAngle = baseAngle + 0.28;

    ctx.save();
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 18;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, baseAngle, endAngle);
    ctx.stroke();
    ctx.restore();
  }

  // 11. THE TWO ROTATING GATE SECTIONS (Attached to the ring at 0 and Math.PI)
  drawRotatingGateSection(ctx, radius, openingHalfAngle, 0, rightFlash, time);
  drawRotatingGateSection(ctx, radius, openingHalfAngle, Math.PI, leftFlash, time);

  ctx.restore();
}

function drawRotatingGateSection(
  ctx: CanvasRenderingContext2D,
  radius: number,
  openingHalfAngle: number,
  sideAngle: number,
  flashAlpha: number,
  time: number
) {
  ctx.save();
  ctx.rotate(sideAngle);

  // 1. Boundary Gate Posts at the arc terminations
  const topX = Math.cos(openingHalfAngle) * radius;
  const topY = Math.sin(openingHalfAngle) * radius;
  const botX = Math.cos(-openingHalfAngle) * radius;
  const botY = Math.sin(-openingHalfAngle) * radius;

  for (const [px, py] of [[topX, topY], [botX, botY]]) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = flashAlpha > 0 ? '#f43f5e' : '#00f2fe';
    ctx.shadowBlur = 14;
    ctx.fill();

    ctx.strokeStyle = flashAlpha > 0 ? '#fb7185' : '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();
  }

  // 2. Aerodynamic Cyber Wing Brackets flanking the gate opening
  drawGateWingBracket(ctx, radius, openingHalfAngle, 1, flashAlpha);
  drawGateWingBracket(ctx, radius, openingHalfAngle, -1, flashAlpha);

  // 3. Outward Animated Directional Pulses (Chevrons flowing through the gate)
  const p = (time * 0.002) % 1;
  const pulseX = radius + 2 + p * 24;

  ctx.save();
  ctx.strokeStyle = flashAlpha > 0
    ? `rgba(251, 113, 133, ${(1 - p) * 0.95})`
    : `rgba(56, 189, 248, ${(1 - p) * 0.8})`;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(pulseX - 6, -8);
  ctx.lineTo(pulseX + 2, 0);
  ctx.lineTo(pulseX - 6, 8);
  ctx.stroke();
  ctx.restore();

  // 4. Subtle Radial Elimination Flare when a flag escapes through this gate
  if (flashAlpha > 0) {
    ctx.save();
    const flare = ctx.createRadialGradient(radius, 0, 2, radius, 0, 48);
    flare.addColorStop(0, `rgba(244, 63, 94, ${flashAlpha * 0.85})`);
    flare.addColorStop(0.5, `rgba(251, 113, 133, ${flashAlpha * 0.35})`);
    flare.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.fillStyle = flare;
    ctx.beginPath();
    ctx.arc(radius, 0, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawGateWingBracket(
  ctx: CanvasRenderingContext2D,
  radius: number,
  openingHalfAngle: number,
  sign: number,
  flashAlpha: number
) {
  ctx.save();
  const startAngle = openingHalfAngle * sign;
  const span = 0.28 * sign;
  const endAngle = startAngle + span;
  const tipR = radius + 24;
  const podAngle = startAngle + span * 0.55;
  const podR = radius + 13;
  const podX = Math.cos(podAngle) * podR;
  const podY = Math.sin(podAngle) * podR;

  const x0 = Math.cos(startAngle) * radius;
  const y0 = Math.sin(startAngle) * radius;
  const tipX = Math.cos(podAngle) * tipR;
  const tipY = Math.sin(podAngle) * tipR;
  const x1 = Math.cos(endAngle) * radius;
  const y1 = Math.sin(endAngle) * radius;

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.bezierCurveTo(
    Math.cos(startAngle + span * 0.3) * (radius + 18),
    Math.sin(startAngle + span * 0.3) * (radius + 18),
    tipX, tipY,
    tipX, tipY
  );
  ctx.bezierCurveTo(
    Math.cos(startAngle + span * 0.7) * (radius + 18),
    Math.sin(startAngle + span * 0.7) * (radius + 18),
    x1, y1,
    x1, y1
  );
  ctx.arc(0, 0, radius, endAngle, startAngle, sign > 0);
  ctx.closePath();

  const wingGrad = ctx.createRadialGradient(podX, podY, 2, podX, podY, 26);
  wingGrad.addColorStop(0, flashAlpha > 0 ? 'rgba(244, 63, 94, 0.4)' : 'rgba(6, 182, 212, 0.38)');
  wingGrad.addColorStop(0.7, flashAlpha > 0 ? 'rgba(251, 113, 133, 0.15)' : 'rgba(56, 189, 248, 0.15)');
  wingGrad.addColorStop(1, 'rgba(0, 242, 254, 0.01)');
  ctx.fillStyle = wingGrad;
  ctx.fill();

  ctx.shadowColor = flashAlpha > 0 ? '#f43f5e' : '#00f2fe';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = flashAlpha > 0 ? '#fb7185' : '#38bdf8';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Circular Core Pod Node on bracket
  ctx.beginPath();
  ctx.arc(podX, podY, 7.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.fill();
  ctx.strokeStyle = flashAlpha > 0 ? '#f43f5e' : '#06b6d4';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(podX, podY, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 8;
  ctx.shadowColor = flashAlpha > 0 ? '#fb7185' : '#38bdf8';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, radius + 7, startAngle, endAngle, sign < 0);
  ctx.strokeStyle = flashAlpha > 0 ? 'rgba(251, 113, 133, 0.5)' : 'rgba(56, 189, 248, 0.5)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.restore();
}

function drawFlag(
  ctx: CanvasRenderingContext2D,
  ball: FlagBall,
  isChampion: boolean,
  time: number
) {
  const r = isChampion ? ball.radius * 2.8 : ball.radius;
  const diameter = r * 2;
  const texture = getFlagBallTexture(ball.id, ball.emoji, r);

  ctx.save();
  ctx.translate(ball.x, ball.y);

  // Champion dramatic halo & celebratory pulse
  if (isChampion) {
    const pulse = Math.sin(time * 0.008) * 6;
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r + 10 + pulse, 0, Math.PI * 2);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 28;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Drop shadow for natural depth
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;

  // Natural physics spin rotation
  ctx.rotate(ball.angle);

  // Draw circular flag ball texture centered
  ctx.drawImage(texture, -r, -r, diameter, diameter);
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  ctx.save();
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life++;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.alpha = 1 - p.life / p.maxLife;

    if (p.life >= p.maxLife || p.alpha <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    if (p.shape === 'rect') {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]) {
  ctx.save();
  ctx.font = 'bold 12px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.y += t.vy;
    t.alpha -= 0.025;
    if (t.alpha <= 0) {
      texts.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = Math.max(0, t.alpha);
    ctx.fillStyle = t.color;
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 8;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.restore();
}
