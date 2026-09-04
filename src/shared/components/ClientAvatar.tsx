import { useState } from "react";

type ClientAvatarProps = {
  src?: string;
  name: string;
  initials: string;
  sizeClassName?: string;
  textClassName?: string;
};

export function ClientAvatar({
  src,
  name,
  initials,
  sizeClassName = "h-12 w-12",
  textClassName = "text-sm",
}: ClientAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-xl bg-sci font-bold text-white ring-4 ring-[#E8F3FA] ${sizeClassName} ${textClassName}`}
        aria-label={`${name} avatar placeholder`}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${name} portrait`}
      className={`shrink-0 rounded-xl object-cover ring-4 ring-[#E8F3FA] ${sizeClassName}`}
      onError={() => setFailed(true)}
    />
  );
}
