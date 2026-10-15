export default function PulseLine({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 24"
      preserveAspectRatio="none"
      className={`pulse-line h-5 w-full ${className}`}
      aria-hidden
    >
      <path
        d="M0 12 H40 L48 12 54 4 60 20 66 12 H96 L104 12 110 2 118 22 126 12 H160 L168 12 174 6 180 18 186 12 H240"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
