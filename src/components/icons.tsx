import type { SVGProps } from "react";

/** Inline stroke icons (stroke 1.8, round caps), as in the Kit. Never use emoji. */
function Svg({ size = 16, children, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden={rest["aria-label"] ? undefined : true} {...rest}>
      {children}
    </svg>
  );
}
type P = SVGProps<SVGSVGElement> & { size?: number };

export const LockIcon = (p: P) => (
  <Svg {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
);
export const TicketIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 8a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v8a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2z" />
    <path d="M10 6v12" strokeDasharray="2 2" />
  </Svg>
);
export const CarIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 17h14v-5l-2-5H7l-2 5z" />
    <circle cx="8" cy="17" r="1.6" />
    <circle cx="16" cy="17" r="1.6" />
  </Svg>
);
export const PlusIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const CloseIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const BoltIcon = (p: P) => (
  <Svg {...p}>
    <path d="M13 3L5 14h6l-1 7 8-11h-6z" />
  </Svg>
);

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="12" r="6" fill="#FFB547" />
      <path d="M3 19c3-2 5-2 8 0s5 2 8 0 5-2 6-1" fill="none" stroke="#2C6E91" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M3 24c3-2 5-2 8 0s5 2 8 0 5-2 6-1" fill="none" stroke="#2C6E91" strokeWidth="2.2" strokeLinecap="round" opacity=".45" />
    </svg>
  );
}
