/** Small stroke icons for icon-only actions; every use carries its own aria-label. */
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3zM13.5 6.5l3 3" {...stroke} />
    </svg>
  );
}

export function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5" {...stroke} />
    </svg>
  );
}

export function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" {...stroke} />
      <circle cx="12" cy="12" r="3" {...stroke} />
    </svg>
  );
}

export function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <rect x="3.5" y="5" width="17" height="14" rx="2" {...stroke} />
      <path d="M3.5 16l5-5 4 4 3-3 5 5" {...stroke} />
      <circle cx="15.5" cy="9" r="1.5" {...stroke} />
    </svg>
  );
}
