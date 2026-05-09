import { cn } from '../lib/utils';

interface DecorativeProps {
  className?: string;
}

/**
 * Tactical grid overlay for empty states and backgrounds.
 * Uses CSS pattern-grid via the `.tactical-grid` class.
 */
export function TacticalGrid({ className }: DecorativeProps) {
  return (
    <div
      className={cn('absolute inset-0 pointer-events-none', className)}
      aria-hidden="true"
    >
      <div className="w-full h-full pattern-grid" />
    </div>
  );
}

/**
 * Scanline overlay for "data feed" sections.
 * Purely decorative — renders transparent repeating lines.
 */
export function ScanlineOverlay({ className }: DecorativeProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none pattern-scanline',
        className
      )}
      aria-hidden="true"
    />
  );
}

/**
 * Geometric accent pattern — corner decoration for cards/sections.
 */
export function GeometricPattern({ className }: DecorativeProps) {
  return (
    <svg
      className={cn('absolute pointer-events-none opacity-[0.04]', className)}
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
    >
      <rect x="20" y="20" width="40" height="40" stroke="currentColor" strokeWidth="1" />
      <rect x="80" y="20" width="40" height="40" stroke="currentColor" strokeWidth="1" />
      <rect x="140" y="20" width="40" height="40" stroke="currentColor" strokeWidth="1" />
      <rect x="20" y="80" width="40" height="40" stroke="currentColor" strokeWidth="1" />
      <rect x="80" y="80" width="40" height="40" stroke="currentColor" strokeWidth="1" />
      <rect x="140" y="80" width="40" height="40" stroke="currentColor" strokeWidth="1" />
      <rect x="20" y="140" width="40" height="40" stroke="currentColor" strokeWidth="1" />
      <rect x="80" y="140" width="40" height="40" stroke="currentColor" strokeWidth="1" />
      <rect x="140" y="140" width="40" height="40" stroke="currentColor" strokeWidth="1" />
      <line x1="0" y1="100" x2="200" y2="100" stroke="currentColor" strokeWidth="0.5" />
      <line x1="100" y1="0" x2="100" y2="200" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  );
}
