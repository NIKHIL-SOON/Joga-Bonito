import { useMemo } from "react";

const COLORS = ["#2563EB", "#f59e0b", "#10b981", "#f43f5e", "#a855f7", "#fbbf24"];

// A little burst of falling, spinning confetti pieces. Give it a changing
// `key` from the parent (e.g. key={roundIndex}) to replay it.
function Confetti({ count = 26 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.25,
        duration: 0.9 + Math.random() * 0.7,
        rotate: Math.random() * 360,
        size: 5 + Math.random() * 5,
      })),
    [count]
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 animate-confetti-piece rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.4,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export default Confetti;
