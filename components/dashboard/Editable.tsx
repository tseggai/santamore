"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

/**
 * Click-to-edit wrapper for the live-preview editor. In view mode it shows
 * the content exactly as the public page will, with a pencil that appears
 * on hover and focus; Enter, Space or a click switches to the input. In
 * edit mode, blur, Escape, or Enter (single-line fields) returns to view
 * mode. Keyboard users get the same path: the wrapper is a real button.
 */
export function Editable({
  label,
  editing,
  onEdit,
  onDone,
  view,
  input,
  multiline = false,
  className = "",
}: {
  /** Accessible name for the edit control, e.g. "Edit your name". */
  label: string;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
  view: ReactNode;
  input: ReactNode;
  /** Enter inserts a newline instead of finishing. */
  multiline?: boolean;
  className?: string;
}) {
  const editRef = useRef<HTMLDivElement>(null);

  const onViewKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onEdit();
    }
  };

  const onEditKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" || (event.key === "Enter" && !multiline)) {
      event.preventDefault();
      onDone();
    }
  };

  if (editing) {
    return (
      <div
        ref={editRef}
        onKeyDown={onEditKey}
        onBlur={(event) => {
          if (!editRef.current?.contains(event.relatedTarget as Node | null)) onDone();
        }}
        className={className}
      >
        {input}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onEdit}
      onKeyDown={onViewKey}
      className={`group relative cursor-text rounded-lg outline-none ring-sea/40 ring-offset-2 transition-shadow hover:ring-2 focus-visible:ring-2 ${className}`}
    >
      {view}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-1 -top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink text-paper opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <PencilIcon />
      </span>
    </div>
  );
}

export function PencilIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path
        d="M13.5 3.5 16.5 6.5 7 16H4v-3z M12 5l3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
