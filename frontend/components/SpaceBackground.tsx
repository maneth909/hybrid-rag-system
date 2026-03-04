import { useState, useEffect } from "react";

export default function SpaceBackground() {
  const [meteors, setMeteors] = useState<React.CSSProperties[]>([]);
  const [stars, setStars] = useState<React.CSSProperties[]>([]);

  useEffect(() => {
    // Generate random meteors
    const generatedMeteors = [...new Array(15)].map(() => ({
      top: Math.floor(Math.random() * 100) + "vh",
      left: Math.floor(Math.random() * 100) + "vw",
      animationDelay: Math.random() * (0.8 - 0.2) + 0.2 + "s",
      animationDuration: Math.floor(Math.random() * (10 - 2) + 2) + "s",
    }));
    setMeteors(generatedMeteors);

    // Generate random static stars
    const generatedStars = [...new Array(60)].map(() => ({
      top: Math.random() * 100 + "%",
      left: Math.random() * 100 + "%",
      opacity: Math.random() * 0.6 + 0.2,
      transform: `scale(${Math.random() * 0.8 + 0.2})`,
    }));
    setStars(generatedStars);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {stars.map((style, i) => (
        <div
          key={`star-${i}`}
          className="absolute w-1 h-1 bg-black dark:bg-white rounded-full"
          style={style}
        />
      ))}

      {/* Shooting Meteors */}
      {meteors.map((style, idx) => (
        <span
          key={`meteor-${idx}`}
          className="absolute h-[2px] w-[2px] rounded-full bg-black dark:bg-white shadow-[0_0_0_1px_#00000010] dark:shadow-[0_0_0_1px_#ffffff10]"
          style={{
            ...style,
            animationName: "meteor",
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
          }}
        >
          <div className="pointer-events-none absolute top-1/2 -z-10 h-[1px] w-[60px] -translate-y-1/2 right-full bg-gradient-to-r from-transparent to-black dark:to-white opacity-40 dark:opacity-60" />
        </span>
      ))}

      <style>{`
        @keyframes meteor {
          /* Changed angle to 45deg to fall from top-left to bottom-right */
          0% { transform: rotate(45deg) translateX(-200px); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: rotate(45deg) translateX(1200px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
