import { useEffect, useRef, useState, useCallback } from "react";
import Spider from "@/components/Spider";
import ScreenDamage from "@/components/ScreenDamage";
import FoodItem from "@/components/FoodItem";
import SpeechBubble from "@/components/SpeechBubble";
import { chooseBehavior, getSpeechText } from "@/state/petState";
import type { Behavior, PetStats, DamageEvent, FoodItem as FoodItemType, Vec2 } from "@/state/petState";
import { moveToward, randomDesktopPoint, randomEdgePoint, clampToScreen } from "@/ai/movement";
import { api } from "@/api";

declare global {
  interface Window {
    overlayAPI?: {
      setClickThrough: (enabled: boolean) => Promise<void>;
      getScreenSize: () => Promise<{ width: number; height: number }>;
      onTrayCmd: (cb: (cmd: Record<string, unknown>) => void) => void;
    };
  }
}

const SPIDER_RADIUS = 65;
const CLICK_THROUGH_MARGIN = 130;
const API_POLL_MS = 8000;
const GAME_TICK_MS = 50;

const SPEEDS: Record<Behavior, number> = {
  idle: 0,
  wander: 90,
  sleep: 0,
  hungry_wander: 130,
  angry: 175,
  chase_food: 220,
  eat_food: 0,
  screen_bite: 160,
  dead: 0,
};

let nextDamageId = 1;
let nextFoodId = 1;

export default function DesktopPet() {
  const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [pos, setPos] = useState<Vec2>({ x: window.innerWidth / 2, y: window.innerHeight - 200 });
  const [direction, setDirection] = useState(0);
  const [legPhase, setLegPhase] = useState(0);
  const [behavior, setBehavior] = useState<Behavior>("idle");
  const [petStats, setPetStats] = useState<PetStats>({
    hunger: 80, happiness: 80, health: 100, mood: "content", isDead: false, screenEatPercent: 0,
  });
  const [damageEvents, setDamageEvents] = useState<DamageEvent[]>([]);
  const [foods, setFoods] = useState<FoodItemType[]>([]);
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isInteractable, setIsInteractable] = useState(false);

  const posRef = useRef(pos);
  const dirRef = useRef(direction);
  const behaviorRef = useRef<Behavior>("idle");
  const statsRef = useRef(petStats);
  const targetRef = useRef<Vec2 | null>(null);
  const behaviorTimerRef = useRef(0);
  const lastTickRef = useRef(Date.now());
  const legPhaseRef = useRef(0);
  const isPausedRef = useRef(false);
  const foodsRef = useRef<FoodItemType[]>([]);
  const screenSizeRef = useRef(screenSize);
  const damageTimerRef = useRef(0);
  const speechTimerRef = useRef(0);
  const mouseRef = useRef<Vec2>({ x: -999, y: -999 });

  posRef.current = pos;
  behaviorRef.current = behavior;
  statsRef.current = petStats;
  isPausedRef.current = isPaused;
  foodsRef.current = foods;
  screenSizeRef.current = screenSize;

  // Init screen size
  useEffect(() => {
    const getSize = async () => {
      if (window.overlayAPI) {
        const size = await window.overlayAPI.getScreenSize();
        setScreenSize(size);
        screenSizeRef.current = size;
        setPos({ x: size.width / 2, y: size.height - 200 });
        posRef.current = { x: size.width / 2, y: size.height - 200 };
      }
    };
    getSize();
  }, []);

  // Tray commands
  useEffect(() => {
    if (!window.overlayAPI) return;
    window.overlayAPI.onTrayCmd(async (cmd) => {
      const type = cmd.type as string;
      if (type === "feed") {
        try {
          const result = await api.feedPet(null);
          setPetStats({
            hunger: result.hunger,
            happiness: result.happiness,
            health: result.health,
            mood: result.mood,
            isDead: result.isDead,
            screenEatPercent: result.screenEatPercent,
          });
          statsRef.current = {
            hunger: result.hunger,
            happiness: result.happiness,
            health: result.health,
            mood: result.mood,
            isDead: result.isDead,
            screenEatPercent: result.screenEatPercent,
          };
          // Clear screen damage when fed
          if (result.hunger > 50) {
            setDamageEvents(prev => prev.map(e => ({ ...e, opacity: e.opacity * 0.5 })));
          }
          setBehavior("eat_food");
          behaviorRef.current = "eat_food";
          behaviorTimerRef.current = 0;
          setTimeout(() => {
            setBehavior("idle");
            behaviorRef.current = "idle";
          }, 2500);
        } catch {/* ignore */}
      }
      if (type === "dropFood") {
        const kind = (cmd.food as string) === "moth" ? "moth" : "cricket";
        const sw = screenSizeRef.current.width;
        const sh = screenSizeRef.current.height;
        const fx = 100 + Math.random() * (sw - 200);
        const fy = 100 + Math.random() * (sh - 200);
        const food: FoodItemType = { id: nextFoodId++, x: fx, y: fy, kind };
        setFoods(prev => [...prev, food]);
        foodsRef.current = [...foodsRef.current, food];
      }
      if (type === "pause") {
        const paused = cmd.paused as boolean;
        setIsPaused(paused);
        isPausedRef.current = paused;
      }
      if (type === "wakeup") {
        if (behaviorRef.current === "sleep") {
          setBehavior("idle");
          behaviorRef.current = "idle";
          behaviorTimerRef.current = 0;
        }
      }
      if (type === "revive") {
        try {
          await api.revivePet();
        } catch {/* might not be dead */}
        setDamageEvents([]);
        setFoods([]);
        foodsRef.current = [];
        setBehavior("idle");
        behaviorRef.current = "idle";
        behaviorTimerRef.current = 0;
      }
    });
  }, []);

  // API polling
  useEffect(() => {
    const poll = async () => {
      try {
        const pet = await api.getPet();
        const stats: PetStats = {
          hunger: pet.hunger,
          happiness: pet.happiness,
          health: pet.health,
          mood: pet.mood,
          isDead: pet.isDead,
          screenEatPercent: pet.screenEatPercent,
        };
        setPetStats(stats);
        statsRef.current = stats;
      } catch {/* server may be starting */}
    };
    poll();
    const interval = setInterval(poll, API_POLL_MS);
    return () => clearInterval(interval);
  }, []);

  // Pick a new wander target
  const pickNewTarget = useCallback((beh: Behavior) => {
    const { width: sw, height: sh } = screenSizeRef.current;
    if (beh === "screen_bite" || beh === "angry") {
      targetRef.current = randomEdgePoint(sw, sh);
    } else {
      targetRef.current = randomDesktopPoint(sw, sh);
    }
  }, []);

  // Main game loop
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const dt = Math.min((now - lastTickRef.current) / 1000, 0.1);
      lastTickRef.current = now;

      if (isPausedRef.current) return;

      const beh = behaviorRef.current;
      const stats = statsRef.current;
      const currentPos = posRef.current;
      const foods = foodsRef.current;
      const { width: sw, height: sh } = screenSizeRef.current;

      behaviorTimerRef.current += now - (lastTickRef.current - dt * 1000);

      // Choose next behavior
      const hasFood = foods.length > 0;
      const nextBeh = chooseBehavior(stats, beh, hasFood, behaviorTimerRef.current);
      if (nextBeh !== beh) {
        setBehavior(nextBeh);
        behaviorRef.current = nextBeh;
        behaviorTimerRef.current = 0;
        targetRef.current = null;
      }

      const speed = SPEEDS[behaviorRef.current];
      let newPos = { ...currentPos };
      let newDir = dirRef.current;

      if (speed > 0) {
        // Determine target
        if (behaviorRef.current === "chase_food" && foods.length > 0) {
          targetRef.current = { x: foods[0].x, y: foods[0].y };
        } else if (!targetRef.current) {
          pickNewTarget(behaviorRef.current);
        }

        if (targetRef.current) {
          const result = moveToward(currentPos, targetRef.current, speed, dt);
          newPos = result.pos;
          newDir = result.dir;

          // Clamp to screen
          newPos = clampToScreen(newPos, sw, sh);

          if (result.arrived || (
            Math.abs(newPos.x - currentPos.x) < 0.5 &&
            Math.abs(newPos.y - currentPos.y) < 0.5
          )) {
            // Handle food eating
            if (behaviorRef.current === "chase_food" && foods.length > 0) {
              const eaten = foods[0];
              setFoods(prev => prev.filter(f => f.id !== eaten.id));
              foodsRef.current = foodsRef.current.filter(f => f.id !== eaten.id);
              // Boost stats
              api.feedPet(null).catch(() => {});
              setBehavior("eat_food");
              behaviorRef.current = "eat_food";
              behaviorTimerRef.current = 0;
              setTimeout(() => {
                setBehavior("idle");
                behaviorRef.current = "idle";
                behaviorTimerRef.current = 0;
              }, 2000);
            }

            // Handle screen bite — add damage
            if (behaviorRef.current === "screen_bite") {
              damageTimerRef.current += dt * 1000;
              if (damageTimerRef.current > 1500) {
                damageTimerRef.current = 0;
                const damage: DamageEvent = {
                  id: nextDamageId++,
                  type: Math.random() < 0.4 ? "crack" : Math.random() < 0.6 ? "bite" : "web",
                  x: targetRef.current.x + (Math.random() - 0.5) * 80,
                  y: targetRef.current.y + (Math.random() - 0.5) * 80,
                  size: 30 + Math.random() * 50,
                  angle: Math.random() * Math.PI * 2,
                  opacity: 0.6 + Math.random() * 0.4,
                };
                setDamageEvents(prev => {
                  const next = [...prev, damage];
                  // Cap at 40 damage events
                  return next.length > 40 ? next.slice(next.length - 40) : next;
                });
              }
            }

            targetRef.current = null;
          }

          // Update leg phase
          const walkSpeed = speed * dt * 0.015;
          legPhaseRef.current = (legPhaseRef.current + walkSpeed) % 1;
          setLegPhase(legPhaseRef.current);
        }

        setPos({ ...newPos });
        posRef.current = newPos;
        setDirection(newDir);
        dirRef.current = newDir;
      }

      // Speech bubble occasionally
      speechTimerRef.current += dt * 1000;
      if (speechTimerRef.current > 4000) {
        speechTimerRef.current = 0;
        const speech = getSpeechText(behaviorRef.current, statsRef.current.hunger);
        if (speech) setSpeechText(speech);
      }

      // Fade old damage when fed
      if (stats.hunger > 65 && stats.mood === "content" || stats.mood === "happy") {
        setDamageEvents(prev =>
          prev.map(e => ({ ...e, opacity: e.opacity - 0.0005 })).filter(e => e.opacity > 0.05)
        );
      }
    };

    const interval = setInterval(tick, GAME_TICK_MS);
    return () => clearInterval(interval);
  }, [pickNewTarget]);

  // Mouse tracking for click-through
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      const dx = e.clientX - posRef.current.x;
      const dy = e.clientY - posRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const shouldInteract = dist < CLICK_THROUGH_MARGIN;
      if (shouldInteract !== isInteractable) {
        setIsInteractable(shouldInteract);
        window.overlayAPI?.setClickThrough(!shouldInteract);
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isInteractable]);

  // Click to drop food (when interaction is enabled and not clicking spider)
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    const dx = e.clientX - posRef.current.x;
    const dy = e.clientY - posRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > SPIDER_RADIUS && !statsRef.current.isDead) {
      // Drop kibble at click point
      const food: FoodItemType = {
        id: nextFoodId++,
        x: e.clientX,
        y: e.clientY,
        kind: "kibble",
      };
      setFoods(prev => [...prev, food]);
      foodsRef.current = [...foodsRef.current, food];
    }
  }, []);

  // Pet the spider (click on it)
  const handleSpiderClick = useCallback(async () => {
    if (statsRef.current.isDead) return;
    try {
      const result = await api.playWithPet();
      setPetStats({
        hunger: result.hunger,
        happiness: result.happiness,
        health: result.health,
        mood: result.mood,
        isDead: result.isDead,
        screenEatPercent: result.screenEatPercent,
      });
      setSpeechText(":D");
    } catch {/* ignore */}
  }, []);

  const animClass = behavior === "sleep"
    ? "spider-sleep-anim"
    : behavior === "idle"
    ? "spider-breathe-anim"
    : behavior === "angry" || behavior === "screen_bite"
    ? "spider-shake-anim"
    : "";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: "transparent",
        cursor: isInteractable ? "default" : "none",
      }}
      onClick={handleOverlayClick}
    >
      {/* Screen damage effects */}
      <ScreenDamage
        events={damageEvents}
        screenW={screenSize.width}
        screenH={screenSize.height}
      />

      {/* Food items */}
      {foods.map(food => (
        <FoodItem key={food.id} food={food} />
      ))}

      {/* Speech bubble */}
      <SpeechBubble
        text={speechText}
        x={pos.x}
        y={pos.y - SPIDER_RADIUS}
        behavior={behavior}
      />

      {/* The spider — always on top */}
      <div
        className={animClass}
        style={{
          position: "fixed",
          left: pos.x - 65,
          top: pos.y - 65,
          width: 130,
          height: 130,
          cursor: isInteractable ? "pointer" : "none",
          zIndex: 100,
          pointerEvents: isInteractable ? "auto" : "none",
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleSpiderClick();
        }}
      >
        <Spider
          behavior={behavior}
          direction={direction}
          legPhase={legPhase}
          petType="tarantula"
        />
      </div>

      {/* HUD — tiny stat strip at top edge (only visible when interacting) */}
      {isInteractable && !petStats.isDead && (
        <div
          style={{
            position: "fixed",
            top: pos.y < screenSize.height / 2 ? pos.y + 80 : pos.y - 110,
            left: Math.max(10, Math.min(screenSize.width - 160, pos.x - 75)),
            width: 150,
            pointerEvents: "none",
            zIndex: 200,
            background: "rgba(10,8,20,0.85)",
            border: "1px solid rgba(100,70,30,0.5)",
            borderRadius: 8,
            padding: "6px 8px",
            backdropFilter: "blur(6px)",
          }}
        >
          <MiniStat label="Hunger" value={petStats.hunger} color="#d97706" />
          <MiniStat label="Happy" value={petStats.happiness} color="#8b5cf6" />
          <MiniStat label="Health" value={petStats.health} color="#16a34a" />
          <div style={{ marginTop: 4, fontSize: 9, color: "#666", fontFamily: "monospace", textAlign: "center" }}>
            click to pet · right-click tray to feed
          </div>
        </div>
      )}

      {/* Dead overlay message */}
      {petStats.isDead && (
        <div
          style={{
            position: "fixed",
            top: pos.y + 80,
            left: pos.x - 90,
            width: 180,
            pointerEvents: "none",
            zIndex: 200,
            background: "rgba(10,0,0,0.88)",
            border: "1px solid rgba(120,20,20,0.6)",
            borderRadius: 8,
            padding: "8px 12px",
            textAlign: "center",
            color: "#888",
            fontFamily: "monospace",
            fontSize: 11,
          }}
        >
          <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 4 }}>✝ Spidey is gone</div>
          Right-click tray → Revive
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
      <span style={{ color: "#666", fontFamily: "monospace", fontSize: 9, width: 38 }}>{label}</span>
      <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 3, height: 5, overflow: "hidden" }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            height: "100%",
            background: color,
            borderRadius: 3,
            transition: "width 0.5s ease",
          }}
        />
      </div>
      <span style={{ color: value < 25 ? "#ef4444" : "#555", fontFamily: "monospace", fontSize: 9, width: 22, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}
