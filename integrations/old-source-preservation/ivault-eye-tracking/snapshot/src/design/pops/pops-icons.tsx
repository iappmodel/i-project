import type { SVGProps } from "react";

type PopsIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function baseProps(size: number, props: PopsIconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export function PopsMembraneIcon({ size = 20, ...props }: PopsIconProps) {
  return (
    <svg {...baseProps(size, props)}>
      <path d="M12 3.5c4.8 0 8.5 3.7 8.5 8.5s-3.7 8.5-8.5 8.5-8.5-3.7-8.5-8.5 3.7-8.5 8.5-8.5z" />
      <path d="M7.8 12c.7-2.4 2.3-3.7 4.2-3.7S15.5 9.6 16.2 12" opacity="0.6" />
      <circle cx="12" cy="12" r="1.2" />
    </svg>
  );
}

export function PopsPulseIcon({ size = 20, ...props }: PopsIconProps) {
  return (
    <svg {...baseProps(size, props)}>
      <path d="M3.5 12h3.2l1.7-3.5 2.5 7 2.1-5h2.2l1.4 1.5H20.5" />
      <path d="M12 4.5v2.2M12 17.3v2.2" opacity="0.45" />
    </svg>
  );
}

export function PopsRingIcon({ size = 20, ...props }: PopsIconProps) {
  return (
    <svg {...baseProps(size, props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" opacity="0.4" />
      <circle cx="12" cy="12" r="3.2" opacity="0.8" />
    </svg>
  );
}

export function PopsSignalFieldIcon({ size = 20, ...props }: PopsIconProps) {
  return (
    <svg {...baseProps(size, props)}>
      <path d="M4 15.5c1.8-2 4.1-3.1 8-3.1s6.2 1.1 8 3.1" />
      <path d="M6.5 11.6c1.5-1.4 3.3-2.1 5.5-2.1s4 .7 5.5 2.1" opacity="0.7" />
      <path d="M9.2 8.1c.8-.6 1.7-.9 2.8-.9s2 .3 2.8.9" opacity="0.5" />
      <circle cx="12" cy="16.8" r="1.2" />
    </svg>
  );
}

export function PopsReceiptIcon({ size = 20, ...props }: PopsIconProps) {
  return (
    <svg {...baseProps(size, props)}>
      <path d="M7 3.5h10v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4v-17z" />
      <path d="M9.2 8h5.6M9.2 11.2h5.6M9.2 14.4h3.5" />
    </svg>
  );
}

export function PopsSealIcon({ size = 20, ...props }: PopsIconProps) {
  return (
    <svg {...baseProps(size, props)}>
      <path d="M12 3.5l2 1.4 2.5-.4 1.1 2.2 2 1.4-.5 2.4.5 2.4-2 1.4-1.1 2.2-2.5-.4-2 1.4-2-1.4-2.5.4-1.1-2.2-2-1.4.5-2.4-.5-2.4 2-1.4 1.1-2.2 2.5.4 2-1.4z" />
      <path d="M8.8 12.2l2.1 2.1 4.3-4.3" />
    </svg>
  );
}

export function PopsPendingValueIcon({ size = 20, ...props }: PopsIconProps) {
  return (
    <svg {...baseProps(size, props)}>
      <path d="M4 12a8 8 0 1 0 16 0 8 8 0 1 0-16 0z" />
      <path d="M12 7.5v4.8l2.8 1.8" />
      <circle cx="12" cy="12" r="0.8" />
    </svg>
  );
}

/**
 * Usage notes:
 * - Keep these icons as primary P.O.P.S symbols across product surfaces.
 * - Do not substitute eyes, cameras, crosshairs, scan grids, or police motifs.
 */
