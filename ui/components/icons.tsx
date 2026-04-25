import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function svg(d: React.ReactNode) {
  return function Icon({ size = 16, className, ...rest }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden
        {...rest}
      >
        {d}
      </svg>
    );
  };
}

export const SearchIcon = svg(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>,
);
export const ChevronDown = svg(<path d="m6 9 6 6 6-6" />);
export const ChevronRight = svg(<path d="m9 6 6 6-6 6" />);
export const ArrowRight = svg(
  <>
    <path d="M5 12h14" />
    <path d="m13 5 7 7-7 7" />
  </>,
);
export const SlidersIcon = svg(
  <>
    <path d="M4 6h12" />
    <path d="M18 6h2" />
    <circle cx="17" cy="6" r="2" />
    <path d="M4 12h2" />
    <path d="M8 12h12" />
    <circle cx="7" cy="12" r="2" />
    <path d="M4 18h10" />
    <path d="M16 18h4" />
    <circle cx="15" cy="18" r="2" />
  </>,
);
export const PlusIcon = svg(
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>,
);
export const XIcon = svg(
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>,
);
export const CheckIcon = svg(<path d="m5 12 5 5L20 7" />);
export const CalendarIcon = svg(
  <>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M3 10h18" />
    <path d="M8 2v4" />
    <path d="M16 2v4" />
  </>,
);
export const BookIcon = svg(
  <>
    <path d="M4 19V5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z" />
    <path d="M9 3v18" />
  </>,
);
export const StarIcon = ({ size = 16, className, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden
    {...rest}
  >
    <path d="m12 3 2.92 6.05 6.58.96-4.76 4.6 1.13 6.55L12 18.1l-5.87 3.06 1.13-6.55-4.76-4.6 6.58-.96Z" />
  </svg>
);
export const SortIcon = svg(
  <>
    <path d="M3 7h13" />
    <path d="M3 12h9" />
    <path d="M3 17h5" />
    <path d="m17 7 4 4" />
    <path d="M21 11V3" />
    <path d="M21 17v4" />
    <path d="m17 17 4-4" />
  </>,
);
export const SparklesIcon = svg(
  <>
    <path d="M12 3v4" />
    <path d="M12 17v4" />
    <path d="M3 12h4" />
    <path d="M17 12h4" />
    <path d="m6 6 2 2" />
    <path d="m16 16 2 2" />
    <path d="m6 18 2-2" />
    <path d="m16 8 2-2" />
  </>,
);
export const FlameIcon = svg(
  <path d="M8 14c0-3 2-4 2-7 3 1 6 4 6 8a4 4 0 0 1-8 0c0-1 .4-2 1-3z" />,
);
export const ClockIcon = svg(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
);
export const TrashIcon = svg(
  <>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </>,
);
export const SunIcon = svg(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m4.93 19.07 1.41-1.41" />
    <path d="m17.66 6.34 1.41-1.41" />
  </>,
);
export const MoonIcon = svg(
  <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />,
);
