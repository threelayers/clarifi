type ClariFiAiMarkProps = {
  tone?: "blue" | "dark";
  className?: string;
};

export function ClariFiAiMark({ tone = "blue", className = "" }: ClariFiAiMarkProps) {
  const toneClass =
    tone === "dark"
      ? "bg-ink shadow-[0_10px_24px_rgba(0,0,0,.18)]"
      : "bg-sci shadow-[0_10px_24px_rgba(0,113,227,.18)]";

  return (
    <div
      className={`relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg ${toneClass} text-white ${className}`}
      aria-label="ClariFi AI"
      title="ClariFi AI"
    >
      <svg className="h-[22px] w-[22px]" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path
          d="M8.5 19.2 13.2 14.4 18 17.5 23.5 10.4"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="8.5" cy="19.2" r="2.3" fill="currentColor" />
        <circle cx="13.2" cy="14.4" r="2.3" fill="currentColor" />
        <circle cx="18" cy="17.5" r="2.3" fill="currentColor" />
        <circle cx="23.5" cy="10.4" r="2.3" fill="currentColor" />
        <path
          d="m16 6.2.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3Z"
          fill="currentColor"
          opacity=".92"
        />
      </svg>
      <span className="absolute inset-x-1.5 bottom-1 h-px bg-white/24" />
    </div>
  );
}
