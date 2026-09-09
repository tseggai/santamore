import Image from "next/image";

/**
 * Photo or initial, always a circle with the ink hairline from the
 * prototype. `src` is the public CDN URL (see lib/storage.ts); with none,
 * the first letter on the brand red — so a team and a runner look the same
 * on the leaderboard whether or not they have uploaded a photo yet.
 */
export function Avatar({
  src,
  name,
  size = 52,
  className = "",
  priority = false,
}: {
  src: string | null;
  name: string;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "S";
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        priority={priority}
        style={style}
        className={`shrink-0 rounded-full border-[1.5px] border-ink object-cover ${className}`}
      />
    );
  }
  return (
    <div
      aria-hidden
      style={style}
      className={`type-display flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-red font-medium text-paper ${className}`}
    >
      {initial}
    </div>
  );
}
