import { useMemo } from "react";
import { motion } from "framer-motion";

const COLORS = ["#C6A15B", "#1B2A63", "#2F6F9F", "#E6ECF8", "#E3F1F9"];
const COUNT = 70;

/**
 * One-shot confetti — PRD §19.1. Built from divs rather than a dependency;
 * a library would outweigh what this does.
 *
 * Never rendered when prefers-reduced-motion is set (PRD §19.3) — the caller
 * is responsible for that check.
 */
export function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2.4 + Math.random() * 1.6,
        rotate: Math.random() * 720 - 360,
        drift: Math.random() * 80 - 40,
        color: COLORS[i % COLORS.length]!,
        width: 6 + Math.random() * 6,
        height: 10 + Math.random() * 8,
      })),
    [],
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
    >
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: "-12vh", x: 0, rotate: 0, opacity: 1 }}
          animate={{
            y: "112vh",
            x: p.drift,
            rotate: p.rotate,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeIn",
            times: [0, 0.75, 1],
          }}
          style={{
            left: `${p.left}%`,
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
          }}
          className="absolute top-0 rounded-[2px]"
        />
      ))}
    </div>
  );
}
