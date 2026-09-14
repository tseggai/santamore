"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";

export interface ColumnFilter<T> {
  options: { value: string; label: string }[];
  match: (row: T, value: string) => boolean;
}

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Sort key; omit for an unsortable column. */
  sort?: (row: T) => string | number | null;
  /** A select in the filter bar, "All" plus these options. */
  filter?: ColumnFilter<T>;
  align?: "left" | "right";
  className?: string;
}

/**
 * The console list: one row per record, filterable and sortable columns,
 * a leading image cell, a checkbox per row for bulk actions, and the row
 * itself opens the record (buttons inside it do their own thing). Wide
 * tables scroll sideways inside their own box; the page never does.
 */
export function DataTable<T>({
  rows,
  getId,
  columns,
  leading,
  onOpen,
  rowActions,
  bulkActions,
  searchText,
  searchPlaceholder,
  emptyLabel,
  filterSlot,
}: {
  rows: T[];
  getId: (row: T) => string;
  columns: Column<T>[];
  /** Image or initial shown in the first cell (40px square). */
  leading?: (row: T) => ReactNode;
  onOpen: (row: T) => void;
  rowActions?: (row: T) => ReactNode;
  /** Buttons for the selection bar; `clear` empties the selection. */
  bulkActions?: (ids: string[], clear: () => void) => ReactNode;
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  emptyLabel: string;
  /** Extra controls in the filter bar (quick filters, counts). */
  filterSlot?: ReactNode;
}) {
  const t = useTranslations("admin.table");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = rows.filter((row) => {
      if (needle && searchText && !searchText(row).toLowerCase().includes(needle)) return false;
      for (const column of columns) {
        const value = filters[column.key];
        if (value && column.filter && !column.filter.match(row, value)) return false;
      }
      return true;
    });
    if (sort) {
      const column = columns.find((c) => c.key === sort.key);
      if (column?.sort) {
        const key = column.sort;
        const dir = sort.dir === "asc" ? 1 : -1;
        list = [...list].sort((a, b) => {
          const av = key(a);
          const bv = key(b);
          if (av === null || av === undefined) return 1;
          if (bv === null || bv === undefined) return -1;
          if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
          return String(av).localeCompare(String(bv), undefined, { sensitivity: "base" }) * dir;
        });
      }
    }
    return list;
  }, [rows, query, filters, sort, columns, searchText]);

  const visibleIds = visible.map(getId);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const selectedIds = [...selected].filter((id) => rows.some((row) => getId(row) === id));
  const clear = () => setSelected(new Set());

  const toggleAll = () =>
    setSelected((current) => {
      const next = new Set(current);
      if (allSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  const toggleOne = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const isInteractive = (target: EventTarget | null) =>
    target instanceof Element && target.closest("button, a, input, select, textarea, label");
  const onRowClick = (row: T) => (event: MouseEvent) => {
    if (isInteractive(event.target)) return;
    onOpen(row);
  };
  const onRowKey = (row: T) => (event: KeyboardEvent) => {
    if (isInteractive(event.target) && event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(row);
    }
  };
  const cycleSort = (key: string) =>
    setSort((current) => (current?.key !== key ? { key, dir: "asc" } : current.dir === "asc" ? { key, dir: "desc" } : null));

  const filterable = columns.filter((c) => c.filter);
  const control =
    "rounded-lg bg-mist px-3 py-2 text-[14px] outline-none focus:bg-mist-2";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {searchText ? (
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder ?? t("search")}
            aria-label={searchPlaceholder ?? t("search")}
            className={`${control} w-full sm:w-60`}
          />
        ) : null}
        {filterable.map((column) => (
          <label key={column.key} className="flex items-center gap-1.5 text-[13.5px] text-black/60">
            <span className="sr-only">{column.header}</span>
            <select
              value={filters[column.key] ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, [column.key]: e.target.value }))}
              className={control}
            >
              <option value="">{t("all", { column: column.header })}</option>
              {column.filter!.options.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        ))}
        {filterSlot}
        <span className="ml-auto font-mono text-[13px] tabular-nums text-black/55">
          {t("count", { shown: visible.length, total: rows.length })}
        </span>
      </div>

      {selectedIds.length > 0 && bulkActions ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-paper">
          <span className="font-mono text-[13px] tabular-nums">{t("selected", { count: selectedIds.length })}</span>
          <span className="flex flex-wrap gap-1.5">{bulkActions(selectedIds, clear)}</span>
          <button type="button" onClick={clear} className="ml-auto text-[13px] font-semibold underline underline-offset-2 hover:opacity-80">
            {t("clear")}
          </button>
        </div>
      ) : null}

      <div className="mt-3 overflow-x-auto rounded-lg bg-mist">
        <table className="w-full min-w-[720px] border-collapse text-[14.5px]">
          <thead>
            <tr className="text-left text-[12.5px] font-semibold uppercase tracking-[0.08em] text-black/55">
              <th className="w-10 px-3 py-2.5">
                {bulkActions ? (
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label={t("selectAll")} className="h-4 w-4 accent-red" />
                ) : null}
              </th>
              {leading ? <th className="w-14 px-2 py-2.5" /> : null}
              {columns.map((column) => {
                const active = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={`px-3 py-2.5 ${column.align === "right" ? "text-right" : ""} ${column.className ?? ""}`}
                  >
                    {column.sort ? (
                      <button type="button" onClick={() => cycleSort(column.key)} className="inline-flex items-center gap-1 uppercase hover:text-sea">
                        {column.header}
                        <span aria-hidden className="font-mono text-[11px]">{active ? (sort!.dir === "asc" ? "↑" : "↓") : "↕"}</span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {rowActions ? <th className="px-3 py-2.5" /> : null}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 3} className="px-4 py-6 text-center text-black/60">{emptyLabel}</td>
              </tr>
            ) : (
              visible.map((row) => {
                const id = getId(row);
                return (
                  <tr
                    key={id}
                    tabIndex={0}
                    onClick={onRowClick(row)}
                    onKeyDown={onRowKey(row)}
                    aria-selected={selected.has(id)}
                    className={`cursor-pointer border-t-[0.5px] border-line transition-colors hover:bg-mist-2 focus:outline-none focus-visible:bg-mist-2 ${
                      selected.has(id) ? "bg-paper" : ""
                    }`}
                  >
                    <td className="px-3 py-2">
                      {bulkActions ? (
                        <input type="checkbox" checked={selected.has(id)} onChange={() => toggleOne(id)} aria-label={t("selectRow")} className="h-4 w-4 accent-red" />
                      ) : null}
                    </td>
                    {leading ? <td className="px-2 py-1.5">{leading(row)}</td> : null}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`whitespace-nowrap px-3 py-2 ${column.align === "right" ? "text-right font-mono tabular-nums" : ""} ${column.className ?? ""}`}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                    {rowActions ? (
                      <td className="whitespace-nowrap px-3 py-1.5 text-right">
                        <span className="inline-flex gap-1.5">{rowActions(row)}</span>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Small pieces shared by the console tables. */
export const rowButton =
  "rounded-lg bg-paper px-2.5 py-1 text-[13px] font-semibold transition-colors hover:bg-mist-2 disabled:opacity-40";
export const bulkButton =
  "rounded-lg bg-paper/15 px-3 py-1 text-[13px] font-semibold text-paper transition-colors hover:bg-paper/25 disabled:opacity-40";

export function Chip({ children, tone = "paper" }: { children: ReactNode; tone?: "sea" | "red" | "ink" | "paper" }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${
        tone === "sea" ? "bg-sea text-paper" : tone === "red" ? "bg-red text-paper" : tone === "ink" ? "bg-ink text-paper" : "bg-paper text-black/60"
      }`}
    >
      {children}
    </span>
  );
}

export function Thumb({ src, initial, rounded = false }: { src: string | null; initial: string; rounded?: boolean }) {
  const shape = rounded ? "rounded-full" : "rounded-lg";
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- storage URLs, arbitrary sizes
    <img src={src} alt="" className={`h-10 w-10 ${shape} bg-paper object-cover`} />
  ) : (
    <span className={`flex h-10 w-10 items-center justify-center ${shape} bg-paper text-[15px] font-bold text-black/40`}>{initial || "?"}</span>
  );
}
