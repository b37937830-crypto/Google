import { FlagBall, ArenaConfig } from '../types';

export class SpatialGrid {
  private cellSize: number;
  private grid: Map<string, FlagBall[]>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  public clear() {
    this.grid.clear();
  }

  private getKey(cellX: number, cellY: number): string {
    return `${cellX},${cellY}`;
  }

  public insert(ball: FlagBall) {
    const cellX = Math.floor(ball.x / this.cellSize);
    const cellY = Math.floor(ball.y / this.cellSize);
    const key = this.getKey(cellX, cellY);
    const cell = this.grid.get(key);
    if (cell) {
      cell.push(ball);
    } else {
      this.grid.set(key, [ball]);
    }
  }

  public getPotentialColliders(ball: FlagBall): FlagBall[] {
    const minCellX = Math.floor((ball.x - ball.radius) / this.cellSize);
    const maxCellX = Math.floor((ball.x + ball.radius) / this.cellSize);
    const minCellY = Math.floor((ball.y - ball.radius) / this.cellSize);
    const maxCellY = Math.floor((ball.y + ball.radius) / this.cellSize);

    const candidates: FlagBall[] = [];
    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const list = this.grid.get(this.getKey(cx, cy));
        if (list) {
          for (let i = 0; i < list.length; i++) {
            const other = list[i];
            if (other.id !== ball.id) {
              candidates.push(other);
            }
          }
        }
      }
    }
    return candidates;
  }
}

/**
 * Normalizes angle to (-PI, PI]
 */
export function normalizeAngle(angle: number): number {
  let a = angle % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a <= -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Checks if angle is within an angular opening centered at centerAngle with halfWidth
 */
export function isAngleInOpening(angle: number, centerAngle: number, halfWidth: number): boolean {
  const diff = Math.abs(normalizeAngle(angle - centerAngle));
  return diff <= halfWidth;
}

export interface StepPhysicsResult {
  eliminated: { ball: FlagBall; exitSide: 'left' | 'right' }[];
}

/**
 * Core Physics Step for Arena Simulation
 */
export function stepPhysics(
  balls: FlagBall[],
  arena: ArenaConfig,
  speedMultiplier: number,
  onCollision?: () => void,
  onWallHit?: () => void,
  onElimination?: (ball: FlagBall, exitSide: 'left' | 'right') => void,
  onSpark?: (x: number, y: number, color: string) => void
): StepPhysicsResult {
  const eliminated: { ball: FlagBall; exitSide: 'left' | 'right' }[] = [];
  const maxRadius = 18;
  const spatialGrid = new SpatialGrid(maxRadius * 2.8);
  const dt = speedMultiplier;
  const restitution = 0.98;
  const minSpeed = 2.2;
  const maxSpeed = 9.35;

  // 1. Move and integrate spin
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.angle += ball.angularVelocity * dt;

    // Maintain lively speeds
    const currentSpeed = Math.hypot(ball.vx, ball.vy);
    if (currentSpeed < minSpeed && currentSpeed > 0.001) {
      const scale = minSpeed / currentSpeed;
      ball.vx *= scale;
      ball.vy *= scale;
    } else if (currentSpeed > maxSpeed) {
      const scale = maxSpeed / currentSpeed;
      ball.vx *= scale;
      ball.vy *= scale;
    }

    spatialGrid.insert(ball);
  }

  // 2. Ball-to-Ball Collisions
  const testedPairs = new Set<string>();
  let collisionOccurred = false;

  for (let i = 0; i < balls.length; i++) {
    const b1 = balls[i];
    const neighbors = spatialGrid.getPotentialColliders(b1);

    for (let j = 0; j < neighbors.length; j++) {
      const b2 = neighbors[j];
      const pairKey = b1.id < b2.id ? `${b1.id}:${b2.id}` : `${b2.id}:${b1.id}`;
      if (testedPairs.has(pairKey)) continue;
      testedPairs.add(pairKey);

      const dx = b2.x - b1.x;
      const dy = b2.y - b1.y;
      const dist = Math.hypot(dx, dy);
      const minDist = b1.radius + b2.radius;

      if (dist < minDist && dist > 0.0001) {
        collisionOccurred = true;

        // Collision normal
        const nx = dx / dist;
        const ny = dy / dist;

        // Separate balls to prevent overlap
        const overlap = minDist - dist;
        const totalMass = b1.mass + b2.mass;
        const b1Ratio = b2.mass / totalMass;
        const b2Ratio = b1.mass / totalMass;

        b1.x -= nx * overlap * b1Ratio;
        b1.y -= ny * overlap * b1Ratio;
        b2.x += nx * overlap * b2Ratio;
        b2.y += ny * overlap * b2Ratio;

        // Relative velocity along normal
        const rvx = b2.vx - b1.vx;
        const rvy = b2.vy - b1.vy;
        const velAlongNormal = rvx * nx + rvy * ny;

        if (velAlongNormal < 0) {
          const impulse = -((1 + restitution) * velAlongNormal) / (1 / b1.mass + 1 / b2.mass);
          b1.vx -= (impulse / b1.mass) * nx;
          b1.vy -= (impulse / b1.mass) * ny;
          b2.vx += (impulse / b2.mass) * nx;
          b2.vy += (impulse / b2.mass) * ny;

          // Tangential spin transfer
          const tx = -ny;
          const ty = nx;
          const velAlongTangent = rvx * tx + rvy * ty;
          b1.angularVelocity += velAlongTangent * 0.006;
          b2.angularVelocity -= velAlongTangent * 0.006;

          if (onSpark && Math.abs(impulse) > 4 && Math.random() < 0.2) {
            onSpark((b1.x + b2.x) / 2, (b1.y + b2.y) / 2, '#60a5fa');
          }
        }
      }
    }
  }

  if (collisionOccurred && onCollision) {
    onCollision();
  }

  // 3. Circular Arena Wall & Physical Gaps
  const { centerX, centerY, radius, leftOpeningAngle, rightOpeningAngle, openingHalfAngle } = arena;

  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    const dx = ball.x - centerX;
    const dy = ball.y - centerY;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    const inRightOpening = isAngleInOpening(angle, rightOpeningAngle, openingHalfAngle);
    const inLeftOpening = isAngleInOpening(angle, leftOpeningAngle, openingHalfAngle);

    if (inRightOpening || inLeftOpening) {
      // Flag is at an opening!
      // Check if it has passed through the gap to the outside
      if (dist >= radius + ball.radius * 0.35) {
        const exitSide: 'left' | 'right' = inLeftOpening ? 'left' : 'right';
        ball.eliminated = true;
        eliminated.push({ ball, exitSide });
        if (onElimination) {
          onElimination(ball, exitSide);
        }
        continue;
      }

      // Check collision with the boundary posts at the gap edges
      const openingCenter = inRightOpening ? rightOpeningAngle : leftOpeningAngle;
      const corner1Angle = normalizeAngle(openingCenter - openingHalfAngle);
      const corner2Angle = normalizeAngle(openingCenter + openingHalfAngle);

      const corner1X = centerX + Math.cos(corner1Angle) * radius;
      const corner1Y = centerY + Math.sin(corner1Angle) * radius;
      const corner2X = centerX + Math.cos(corner2Angle) * radius;
      const corner2Y = centerY + Math.sin(corner2Angle) * radius;

      // Post 1
      const c1dx = ball.x - corner1X;
      const c1dy = ball.y - corner1Y;
      const c1dist = Math.hypot(c1dx, c1dy);
      if (c1dist < ball.radius && c1dist > 0.0001) {
        const cnx = c1dx / c1dist;
        const cny = c1dy / c1dist;
        ball.x = corner1X + cnx * ball.radius;
        ball.y = corner1Y + cny * ball.radius;
        const vdot = ball.vx * cnx + ball.vy * cny;
        if (vdot < 0) {
          ball.vx -= (1 + restitution) * vdot * cnx;
          ball.vy -= (1 + restitution) * vdot * cny;
          if (onWallHit) onWallHit();
        }
      }

      // Post 2
      const c2dx = ball.x - corner2X;
      const c2dy = ball.y - corner2Y;
      const c2dist = Math.hypot(c2dx, c2dy);
      if (c2dist < ball.radius && c2dist > 0.0001) {
        const cnx = c2dx / c2dist;
        const cny = c2dy / c2dist;
        ball.x = corner2X + cnx * ball.radius;
        ball.y = corner2Y + cny * ball.radius;
        const vdot = ball.vx * cnx + ball.vy * cny;
        if (vdot < 0) {
          ball.vx -= (1 + restitution) * vdot * cnx;
          ball.vy -= (1 + restitution) * vdot * cny;
          if (onWallHit) onWallHit();
        }
      }
    } else {
      // If the ball has already passed beyond the perimeter (e.g. while passing through the moving opening)
      if (dist >= radius + ball.radius * 0.35) {
        const leftDiff = Math.abs(normalizeAngle(angle - leftOpeningAngle));
        const rightDiff = Math.abs(normalizeAngle(angle - rightOpeningAngle));
        const exitSide: 'left' | 'right' = leftDiff < rightDiff ? 'left' : 'right';
        ball.eliminated = true;
        eliminated.push({ ball, exitSide });
        if (onElimination) {
          onElimination(ball, exitSide);
        }
        continue;
      }

      // Solid circular boundary wall everywhere else
      if (dist + ball.radius >= radius) {
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        ball.x = centerX + nx * (radius - ball.radius);
        ball.y = centerY + ny * (radius - ball.radius);

        const velAlongNormal = ball.vx * nx + ball.vy * ny;
        if (velAlongNormal > 0) {
          ball.vx -= (1 + restitution) * velAlongNormal * nx;
          ball.vy -= (1 + restitution) * velAlongNormal * ny;

          // Tangential rotation
          const tx = -ny;
          const ty = nx;
          const velAlongTangent = ball.vx * tx + ball.vy * ty;
          ball.angularVelocity = velAlongTangent * 0.02;

          if (onWallHit) onWallHit();
          if (onSpark && Math.random() < 0.25) {
            onSpark(ball.x, ball.y, '#38bdf8');
          }
        }
      }
    }
  }

  return { eliminated };
}
