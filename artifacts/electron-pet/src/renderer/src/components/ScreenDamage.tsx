import { useEffect, useRef } from "react";
import type { DamageEvent } from "../state/petState";

type Props = {
  events: DamageEvent[];
  screenW: number;
  screenH: number;
};

export default function ScreenDamage({ events, screenW, screenH }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || events.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = screenW;
    canvas.height = screenH;
    ctx.clearRect(0, 0, screenW, screenH);

    for (const ev of events) {
      const alpha = ev.opacity;
      ctx.save();
      ctx.translate(ev.x, ev.y);
      ctx.rotate(ev.angle);
      ctx.globalAlpha = alpha;

      if (ev.type === "bite") {
        // Dark irregular bite-hole
        const r = ev.size;
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        grad.addColorStop(0, "rgba(0,0,0,0.97)");
        grad.addColorStop(0.5, "rgba(5,2,8,0.85)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        // Irregular polygon for the bite
        const sides = 8 + Math.floor(Math.sin(ev.id * 13) * 3);
        for (let i = 0; i < sides; i++) {
          const angle = (Math.PI * 2 * i) / sides;
          const jitter = 0.5 + 0.5 * Math.abs(Math.sin(ev.id * 7 + i * 3));
          const rx = Math.cos(angle) * r * jitter;
          const ry = Math.sin(angle) * r * jitter;
          if (i === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.fill();

        // Edge glow (red/amber)
        const glowColor = ev.id % 3 === 0 ? "rgba(180,30,10,0.4)" : "rgba(80,20,5,0.3)";
        const gGrad = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.3);
        gGrad.addColorStop(0, "rgba(0,0,0,0)");
        gGrad.addColorStop(0.5, glowColor);
        gGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
        ctx.fill();
      }

      if (ev.type === "crack") {
        // Radiating crack lines from bite point
        ctx.strokeStyle = `rgba(80,30,10,${alpha * 0.7})`;
        ctx.lineWidth = 1.5;
        const branches = 5 + Math.floor(Math.abs(Math.sin(ev.id * 5)) * 4);
        for (let b = 0; b < branches; b++) {
          const baseAngle = (Math.PI * 2 * b) / branches + ev.angle * 0.5;
          ctx.beginPath();
          let cx2 = 0, cy2 = 0;
          const segments = 3 + Math.floor(Math.abs(Math.sin(ev.id + b)) * 3);
          for (let s = 0; s < segments; s++) {
            const segLen = (ev.size * (0.8 + Math.random() * 0.8)) / segments;
            const jitter = (Math.random() - 0.5) * 0.5;
            const nx = cx2 + Math.cos(baseAngle + jitter) * segLen;
            const ny = cy2 + Math.sin(baseAngle + jitter) * segLen;
            if (s === 0) ctx.moveTo(cx2, cy2);
            else ctx.lineTo(cx2, cy2);
            cx2 = nx; cy2 = ny;
          }
          ctx.lineTo(cx2, cy2);
          ctx.stroke();

          // Sub-crack
          if (Math.sin(ev.id * b) > 0.3) {
            ctx.beginPath();
            ctx.moveTo(cx2 * 0.5, cy2 * 0.5);
            const subAngle = baseAngle + 0.6;
            ctx.lineTo(cx2 * 0.5 + Math.cos(subAngle) * ev.size * 0.4, cy2 * 0.5 + Math.sin(subAngle) * ev.size * 0.4);
            ctx.globalAlpha = alpha * 0.5;
            ctx.stroke();
            ctx.globalAlpha = alpha;
          }
        }
      }

      if (ev.type === "web") {
        // Spider web in corner
        const strands = 7;
        const rings = 5;
        const r = ev.size;
        ctx.strokeStyle = `rgba(180,140,60,${alpha * 0.55})`;
        ctx.lineWidth = 0.8;

        // Radial strands
        for (let s = 0; s < strands; s++) {
          const angle = (Math.PI * 2 * s) / strands;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          ctx.stroke();
        }

        // Ring segments
        for (let ring = 1; ring <= rings; ring++) {
          const rr = (r / rings) * ring;
          ctx.beginPath();
          for (let s = 0; s < strands; s++) {
            const angle1 = (Math.PI * 2 * s) / strands;
            const angle2 = (Math.PI * 2 * (s + 1)) / strands;
            const x1 = Math.cos(angle1) * rr;
            const y1 = Math.sin(angle1) * rr;
            const x2 = Math.cos(angle2) * rr;
            const y2 = Math.sin(angle2) * rr;
            if (s === 0) ctx.moveTo(x1, y1);
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            ctx.quadraticCurveTo(mx * 1.05, my * 1.05, x2, y2);
          }
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    // Overall darkness vignette when severely damaged
    const severity = Math.min(events.length / 25, 1);
    if (severity > 0.2) {
      const vignette = ctx.createRadialGradient(
        screenW / 2, screenH / 2, screenH * 0.2,
        screenW / 2, screenH / 2, Math.max(screenW, screenH) * 0.75
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, `rgba(0,0,0,${severity * 0.55})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, screenW, screenH);
    }
  }, [events, screenW, screenH]);

  if (events.length === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: screenW,
        height: screenH,
        pointerEvents: "none",
        zIndex: 10,
      }}
    />
  );
}
