"use client";

/**
 * Fan/player avatar rendered as a local initials circle — never a
 * broken face, never an external placeholder service. The color is a
 * stable hash of the name so each fan keeps their identity everywhere.
 */
export default function FanAvatar({
  name,
  size = 36,
}: {
  name: string;
  size?: number;
}) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  const initials = name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase() || "?";
  return (
    <span
      className="flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: `hsl(${h} 55% 38%)`,
        border: `1.5px solid hsl(${h} 55% 55%)`,
        fontSize: Math.max(8, size * 0.34),
      }}
      aria-label={name}
      role="img"
    >
      {initials}
    </span>
  );
}
