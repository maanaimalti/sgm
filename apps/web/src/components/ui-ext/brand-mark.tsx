import Image from "next/image";
import type * as React from "react";

interface MarkProps {
  size?: number;
  color?: string;
}

export function Mark({ size = 32, color = "var(--brand)" }: MarkProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="20" cy="20" r="20" fill={color} fillOpacity="0.12" />
      <path
        d="M10 28C14 12 26 12 30 28"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <text
        x="20"
        y="24"
        textAnchor="middle"
        fontFamily="var(--serif)"
        fontSize="13"
        fill={color}
      >
        sgm
      </text>
    </svg>
  );
}

interface LogoProps {
  /** Rendered width in px. Height is derived from the logo's 2.99:1 ratio. */
  width?: number;
  className?: string;
  priority?: boolean;
}

/** The official "Maanaim Alagoas" logo (public/logo.png). */
export function Logo({ width = 180, className, priority }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Maanaim Alagoas"
      width={width}
      height={Math.round((width * 2466) / 7363)}
      priority={priority}
      className={className}
    />
  );
}

interface WordmarkProps {
  color?: string;
  className?: string;
}

export function Wordmark({ color, className }: WordmarkProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <Mark size={32} color={color} />
      <div className="flex flex-col leading-none">
        <span
          className="font-serif text-[20px] tracking-[-0.01em]"
          style={color ? { color } : undefined}
        >
          SGM
        </span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted mt-0.5">
          Maanaim · AL
        </span>
      </div>
    </div>
  );
}
