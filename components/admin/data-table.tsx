"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Pencil, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

export interface FilterOption {
  value: string;
  label: string;
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  searchPlaceholder,
  searchValue,
  filterOptions,
  filterValue,
  onFilterChange,
  filterLabel = "Filter",
  onEdit,
  onDelete,
  emptyTitle,
  emptyDescription,
  rowLabel,
  extraActions,
}: {
  rows: T[];
  columns: Column<T>[];
  searchPlaceholder: string;
  searchValue: (row: T, query: string) => boolean;
  filterOptions?: FilterOption[];
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterLabel?: string;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  emptyTitle: string;
  emptyDescription: string;
  rowLabel: (row: T) => string;
  extraActions?: (row: T) => ReactNode;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () => rows.filter((row) => searchValue(row, query.trim().toLowerCase())),
    [rows, query, searchValue],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="pl-9"
          />
        </div>
        {filterOptions && onFilterChange && (
          <div className="sm:w-52">
            <Select
              value={filterValue ?? "all"}
              onChange={(event) => onFilterChange(event.target.value)}
              aria-label={filterLabel}
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={
            query ? (
              <Button variant="outline" onClick={() => setQuery("")}>
                Clear search
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-100 md:block">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className={cn("px-3 py-3", column.className)}>
                      {column.header}
                    </th>
                  ))}
                  {(onEdit || onDelete || extraActions) && (
                    <th className="px-3 py-3 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    {columns.map((column) => (
                      <td key={column.key} className={cn("px-3 py-3 align-middle", column.className)}>
                        {column.cell(row)}
                      </td>
                    ))}
                    {(onEdit || onDelete || extraActions) && (
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {extraActions?.(row)}
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-slate-500"
                              onClick={() => onEdit(row)}
                              aria-label={`Edit ${rowLabel(row)}`}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-rose-600"
                              onClick={() => onDelete(row)}
                              aria-label={`Delete ${rowLabel(row)}`}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {visible.map((row) => (
              <div key={row.id} className="rounded-2xl border border-slate-100 p-3.5">
                <div className="space-y-2">
                  {columns.map((column) => (
                    <div key={column.key} className="flex items-start justify-between gap-3 text-xs">
                      <span className="font-bold uppercase tracking-wide text-slate-400">
                        {column.header}
                      </span>
                      <span className="min-w-0 text-right text-slate-700">{column.cell(row)}</span>
                    </div>
                  ))}
                </div>
                {(onEdit || onDelete || extraActions) && (
                  <div className="mt-3 flex flex-wrap justify-end gap-1.5 border-t border-slate-100 pt-3">
                    {extraActions?.(row)}
                    {onEdit && (
                      <Button variant="outline" size="sm" onClick={() => onEdit(row)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    )}
                    {onDelete && (
                      <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => onDelete(row)}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
