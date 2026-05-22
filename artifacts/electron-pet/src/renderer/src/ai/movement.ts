import type { Vec2 } from "../state/petState";

export function moveToward(
  pos: Vec2,
  target: Vec2,
  speed: number,
  dt: number
): { pos: Vec2; dir: number; arrived: boolean } {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 6) {
    return { pos: { ...target }, dir: Math.atan2(dy, dx), arrived: true };
  }
  const step = Math.min(speed * dt, dist);
  const dir = Math.atan2(dy, dx);
  return {
    pos: { x: pos.x + Math.cos(dir) * step, y: pos.y + Math.sin(dir) * step },
    dir,
    arrived: false,
  };
}

export function randomDesktopPoint(
  screenW: number,
  screenH: number,
  margin = 140
): Vec2 {
  return {
    x: margin + Math.random() * (screenW - margin * 2),
    y: margin + Math.random() * (screenH - margin * 2),
  };
}

export function randomEdgePoint(screenW: number, screenH: number): Vec2 {
  const edge = Math.floor(Math.random() * 4);
  const pad = 30;
  switch (edge) {
    case 0:
      return { x: pad + Math.random() * (screenW - pad * 2), y: pad };
    case 1:
      return { x: screenW - pad, y: pad + Math.random() * (screenH - pad * 2) };
    case 2:
      return { x: pad + Math.random() * (screenW - pad * 2), y: screenH - pad };
    default:
      return { x: pad, y: pad + Math.random() * (screenH - pad * 2) };
  }
}

export function clampToScreen(pos: Vec2, screenW: number, screenH: number, margin = 70): Vec2 {
  return {
    x: Math.max(margin, Math.min(screenW - margin, pos.x)),
    y: Math.max(margin, Math.min(screenH - margin, pos.y)),
  };
}
