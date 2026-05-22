import type { FoodItem as FoodItemType } from "../state/petState";

type Props = { food: FoodItemType };

const FOOD_EMOJI: Record<string, string> = {
  cricket: "🦗",
  moth: "🦋",
  kibble: "🍪",
};

export default function FoodItem({ food }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        left: food.x - 20,
        top: food.y - 20,
        width: 40,
        height: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 28,
        pointerEvents: "none",
        zIndex: 30,
        animation: "foodBounce 0.8s ease-in-out infinite",
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
      }}
    >
      {FOOD_EMOJI[food.kind] ?? "🍖"}
    </div>
  );
}
