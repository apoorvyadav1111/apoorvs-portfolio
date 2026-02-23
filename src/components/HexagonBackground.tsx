"use client";

import React from "react";

interface HexagonBackgroundProps {
  className?: string;
  hexagonSize?: number;
  gap?: number;
  strokeWidth?: number;
}

export default function HexagonBackground({
  className = "",
  hexagonSize = 50,
  gap = 5,
  strokeWidth = 1,
}: HexagonBackgroundProps) {
  const hexWidth = hexagonSize * 2;
  const hexHeight = Math.sqrt(3) * hexagonSize;
  const patternWidth = hexWidth * 0.75 + gap;
  const patternHeight = hexHeight + gap;

  // Create hexagon path
  const createHexagonPath = (cx: number, cy: number, size: number) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + size * Math.cos(angle);
      const y = cy + size * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    return `M${points.join("L")}Z`;
  };

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="hexagon-pattern"
            x="0"
            y="0"
            width={patternWidth}
            height={patternHeight}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={createHexagonPath(
                hexagonSize,
                hexHeight / 2,
                hexagonSize - gap / 2,
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-amber-500/10"
            />
            <path
              d={createHexagonPath(
                hexagonSize + patternWidth / 2,
                hexHeight / 2 + patternHeight / 2,
                hexagonSize - gap / 2,
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-amber-500/10"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexagon-pattern)" />
      </svg>
    </div>
  );
}
