/**
 * Utility for client-side CSV export with UTF-8 BOM for Microsoft Excel compatibility.
 */

export interface CsvColumn<T> {
  header: string;
  accessor: (item: T) => string | number | boolean | null | undefined;
}

export function exportToCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  data: T[]
) {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  // Header row
  const headers = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(",");

  // Data rows
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        const val = col.accessor(item);
        if (val === null || val === undefined) {
          return '""';
        }
        const strVal = String(val).replace(/"/g, '""');
        return `"${strVal}"`;
      })
      .join(",");
  });

  // UTF-8 BOM + CSV string
  const csvContent = "\uFEFF" + [headers, ...rows].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
