import { cn } from "@/lib/utils";

const tones = [
  "bg-brand-soft text-brand-ink",
  "bg-warn-soft text-warn-ink",
  "bg-ok-soft text-ok-ink",
  "bg-bad-soft text-bad-ink",
];

function initialsOf(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "?";
}

interface AvatarInitialsProps {
  name: string;
  size?: number;
  className?: string;
}

export function AvatarInitials({
  name,
  size = 32,
  className,
}: AvatarInitialsProps) {
  const initials = initialsOf(name);
  const idx = name ? name.charCodeAt(0) % tones.length : 0;
  const tone = tones[idx];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium tracking-[-0.005em]",
        tone,
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, Math.round(size * 0.4)),
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
