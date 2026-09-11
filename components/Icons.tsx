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
