import { getOptimizedAvatarUrl } from '@/lib/avatar';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export function Avatar({
  name,
  url,
  size = 'h-6 w-6 text-[10px]',
  pixelSize = 80,
  className = '',
}: {
  name: string;
  url?: string | null;
  size?: string;
  pixelSize?: number;
  className?: string;
}) {
  const optimized = getOptimizedAvatarUrl(url, pixelSize);
  if (optimized) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={optimized}
        alt={name}
        className={`${size} shrink-0 rounded-full object-cover border border-white shadow-xs ${className}`}
        loading="lazy"
      />
    );
  }
  return (
    <span
      className={`${size} grid shrink-0 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-800 border border-white shadow-xs ${className}`}
    >
      {initials(name)}
    </span>
  );
}
