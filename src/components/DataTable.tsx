import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useState } from 'react';
import type { ColumnDef, SortingState } from '@tanstack/react-table';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  title?: string;
}

export function DataTable<T>({ data, columns, title }: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      {title && (
        <h4 className="text-sm font-semibold text-precepgo-card-title mb-3">{title}</h4>
      )}
      <table className="w-full border-collapse bg-white">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-gray-200">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={`px-4 py-3 text-left text-xs font-semibold text-precepgo-card-title uppercase tracking-wider whitespace-nowrap ${
                    header.column.getCanSort() ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                  }`}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-2">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && (
                      <span className="text-gray-400 text-xs">
                        {{
                          asc: '↑',
                          desc: '↓',
                        }[header.column.getIsSorted() as string] ?? '↕'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-100">
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-precepgo-card-text"
              >
                No data available
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row, index) => (
              <tr
                key={row.id}
                className={`border-b border-gray-100 transition-colors ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                } hover:bg-precepgo-card-bg`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-3 text-sm text-precepgo-card-text"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// Helper function to create columns from document data
export function createColumnsFromData(data: any[]): ColumnDef<any>[] {
  if (data.length === 0) return [];

  // Get all unique keys from all documents
  const allKeys = new Set<string>();
  data.forEach((doc) => {
    Object.keys(doc).forEach((key) => {
      if (key !== 'id' && typeof doc[key] !== 'object') {
        allKeys.add(key);
      }
    });
  });

  // Create columns for each key
  return Array.from(allKeys).map((key) => ({
    accessorKey: key,
    header: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    cell: ({ getValue }) => {
      const value = getValue();
      if (value === null || value === undefined) return <span className="text-gray-400">—</span>;
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (typeof value === 'object') return <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>;
      return String(value);
    },
  }));
}

