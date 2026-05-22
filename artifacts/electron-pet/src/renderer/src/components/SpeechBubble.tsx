import { useEffect, useState } from "react";

type Props = {
  text: string | null;
  x: number;
  y: number;
  behavior: string;
};

export default function SpeechBubble({ text, x, y, behavior }: Props) {
  const [visible, setVisible] = useState(false);
  const [displayed, setDisplayed] = useState<string | null>(null);

  useEffect(() => {
    if (text && text !== displayed) {
      setDisplayed(text);
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 2500);
      return () => clearTimeout(t);
    }
  }, [text]);

  if (!visible || !displayed) return null;

  const isAngry = behavior === "angry" || behavior === "screen_bite";
  const isSleeping = behavior === "sleep";

  const bubbleColor = isAngry
    ? "rgba(80,0,0,0.92)"
    : isSleeping
    ? "rgba(20,15,50,0.88)"
    : "rgba(20,20,30,0.88)";

  const textColor = isAngry ? "#ff6060" : isSleeping ? "#b0a0ff" : "#e0d4b0";
  const borderColor = isAngry ? "rgba(180,30,30,0.7)" : isSleeping ? "rgba(80,60,180,0.5)" : "rgba(100,80,40,0.5)";

  return (
    <div
      style={{
        position: "fixed",
        left: x - 40,
        top: y - 70,
        pointerEvents: "none",
        zIndex: 50,
        animation: "bubbleIn 0.2s ease-out",
      }}
    >
      <div
        style={{
          background: bubbleColor,
          border: `1px solid ${borderColor}`,
          borderRadius: 10,
          padding: "4px 10px",
          color: textColor,
          fontFamily: "'Courier New', monospace",
          fontSize: isAngry ? 13 : 12,
          fontWeight: isAngry ? "bold" : "normal",
          whiteSpace: "nowrap",
          backdropFilter: "blur(4px)",
          boxShadow: isAngry ? "0 0 12px rgba(200,20,20,0.4)" : "0 2px 8px rgba(0,0,0,0.5)",
        }}
      >
        {displayed}
      </div>
      {/* Bubble tail */}
      <div
        style={{
          width: 0,
          height: 0,
          marginLeft: 16,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: `6px solid ${bubbleColor}`,
        }}
      />
    </div>
  );
}
