export type Behavior =
  | "idle"
  | "wander"
  | "sleep"
  | "hungry_wander"
  | "angry"
  | "chase_food"
  | "eat_food"
  | "screen_bite"
  | "dead";

export type PetStats = {
  hunger: number;
  happiness: number;
  health: number;
  mood: string;
  isDead: boolean;
  screenEatPercent: number;
};

export type Vec2 = { x: number; y: number };

export type DamageEvent = {
  id: number;
  type: "bite" | "crack" | "web";
  x: number;
  y: number;
  size: number;
  angle: number;
  opacity: number;
};

export type FoodItem = {
  id: number;
  x: number;
  y: number;
  kind: "cricket" | "moth" | "kibble";
};

export function chooseBehavior(
  stats: PetStats,
  current: Behavior,
  hasFood: boolean,
  timeInState: number
): Behavior {
  if (stats.isDead) return "dead";
  if (hasFood && current !== "eat_food") return "chase_food";

  const { mood } = stats;

  if (mood === "dying" || mood === "eating_screen") {
    if (current === "screen_bite" && timeInState < 8000) return "screen_bite";
    return "screen_bite";
  }
  if (mood === "angry") {
    return current === "screen_bite" ? "angry" : "angry";
  }
  if (mood === "hungry") {
    return "hungry_wander";
  }

  if (current === "sleep") {
    if (timeInState > 15000 + Math.random() * 15000) return "wander";
    if (stats.hunger < 55) return "hungry_wander";
    return "sleep";
  }

  if (current === "idle") {
    if (timeInState > 2500 + Math.random() * 3500) {
      const roll = Math.random();
      if (roll < 0.25 && stats.hunger > 70 && stats.happiness > 60) return "sleep";
      return "wander";
    }
    return "idle";
  }

  if (current === "wander") {
    if (timeInState > 5000 + Math.random() * 8000) return "idle";
    return "wander";
  }

  if (current === "hungry_wander") {
    if (stats.hunger > 60) return "wander";
    return "hungry_wander";
  }

  if (current === "angry") {
    if (stats.hunger > 50) return "wander";
    return "angry";
  }

  return current;
}

export function getSpeechText(behavior: Behavior, hunger: number): string | null {
  if (behavior === "dead") return "x_x";
  if (behavior === "sleep") return "Zzz...";
  if (behavior === "screen_bite") return "RAAAAWR";
  if (behavior === "angry") {
    const lines = ["SO HUNGRY", "FEED ME", ">:((", "GRRRR"];
    return lines[Math.floor(hunger / 15) % lines.length];
  }
  if (behavior === "hungry_wander") {
    return "...hungry";
  }
  if (behavior === "eat_food") return "nom nom";
  if (behavior === "idle" && Math.random() < 0.15) {
    const lines = ["...", "*skitters*", "hi :)", "boo!"];
    return lines[Math.floor(Math.random() * lines.length)];
  }
  return null;
}
