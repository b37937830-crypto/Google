// High-Performance Round Flag-Ball Texture Generator & Cache
// Renders circular flag-balls with spherical 3D depth, specular highlights, and crisp borders

interface CachedTexture {
  canvas: HTMLCanvasElement;
  loadedImage?: HTMLImageElement;
}

const textureCache = new Map<string, CachedTexture>();
const imageLoading = new Set<string>();

/**
 * Creates or gets an offscreen canvas texture for a circular flag-ball
 * @param id ISO 3166-1 alpha-2 code
 * @param emoji Flag emoji fallback
 * @param radius Visual radius in CSS pixels
 */
export function getFlagBallTexture(
  id: string,
  emoji: string,
  radius: number
): HTMLCanvasElement {
  const roundedRadius = Math.round(radius);
  const cacheKey = `${id}_r${roundedRadius}`;
  const existing = textureCache.get(cacheKey);
  if (existing) {
    return existing.canvas;
  }

  const dpr = 2; // 2x supersampling for ultra-crisp Retina / high-DPI rendering
  const diameter = roundedRadius * 2;
  const offscreen = document.createElement('canvas');
  offscreen.width = Math.ceil(diameter * dpr);
  offscreen.height = Math.ceil(diameter * dpr);
  const ctx = offscreen.getContext('2d');

  if (ctx) {
    ctx.scale(dpr, dpr);
    renderRoundFlagBall(ctx, roundedRadius, emoji, null);
  }

  textureCache.set(cacheKey, { canvas: offscreen });

  // Asynchronously load real flag image from FlagCDN
  if (!imageLoading.has(id)) {
    imageLoading.add(id);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `https://flagcdn.com/w160/${id.toLowerCase()}.png`;
    img.onload = () => {
      const cached = textureCache.get(cacheKey);
      if (cached && ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, offscreen.width, offscreen.height);
        ctx.scale(dpr, dpr);
        renderRoundFlagBall(ctx, roundedRadius, emoji, img);
        ctx.restore();
        cached.loadedImage = img;
      }
    };
    img.onerror = () => {
      // Instant emoji fallback remains
    };
  }

  return offscreen;
}

/**
 * Alias for backward compatibility
 */
export function getFlagTexture(
  id: string,
  emoji: string,
  width: number,
  _height?: number
): HTMLCanvasElement {
  const radius = Math.round(width / 2);
  return getFlagBallTexture(id, emoji, radius);
}

/**
 * Renders a circular flag-ball with spherical 3D lighting, crisp borders, and depth
 */
function renderRoundFlagBall(
  ctx: CanvasRenderingContext2D,
  radius: number,
  emoji: string,
  img: HTMLImageElement | null
) {
  const diameter = radius * 2;

  ctx.save();
  // 1. Circular clip path
  ctx.beginPath();
  ctx.arc(radius, radius, radius - 0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.clip();

  if (img && img.complete && img.naturalWidth > 0) {
    // Fill the circular ball with the flag texture (crop-to-fill)
    const imgAspect = img.naturalWidth / img.naturalHeight;
    let drawW = diameter;
    let drawH = diameter;
    if (imgAspect > 1) {
      // Image is wider than tall: scale height to diameter and center width
      drawH = diameter;
      drawW = diameter * imgAspect;
    } else {
      drawW = diameter;
      drawH = diameter / imgAspect;
    }
    const drawX = (diameter - drawW) / 2;
    const drawY = (diameter - drawH) / 2;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    // Instant fallback: clean dark backdrop with centered emoji
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, diameter, diameter);
    ctx.font = `${Math.round(radius * 1.35)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, radius, radius + 1);
  }

  // 2. Spherical 3D Ball Lighting (Gloss highlight on top-left, depth shade on bottom-right)
  const sphereLighting = ctx.createRadialGradient(
    radius * 0.65,
    radius * 0.65,
    radius * 0.15,
    radius,
    radius,
    radius
  );
  sphereLighting.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  sphereLighting.addColorStop(0.45, 'rgba(255, 255, 255, 0.08)');
  sphereLighting.addColorStop(0.75, 'rgba(0, 0, 0, 0.0)');
  sphereLighting.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
  ctx.fillStyle = sphereLighting;
  ctx.fillRect(0, 0, diameter, diameter);

  ctx.restore();

  // 3. Crisp outer border for round flag-ball
  ctx.save();
  ctx.beginPath();
  ctx.arc(radius, radius, radius - 0.75, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}
