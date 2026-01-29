/**
 * A robust, reusable data table that safely renders dynamic data (e.g., from CSV uploads).
 * Handles objects, nulls, booleans, and long text gracefully.
 */

const renderCell = (cellData) => {
  // Handle null/undefined
  if (cellData === null || cellData === undefined) {
    return <span className="text-gray-400 italic">N/A</span>;
  }

  // Handle empty string
  if (cellData === '') {
    return <span className="text-gray-400 italic">—</span>;
  }

  // Handle booleans
  if (typeof cellData === 'boolean') {
    return cellData ? 'True' : 'False';
  }

  // Handle objects (e.g., nested JSON)
  if (typeof cellData === 'object') {
    try {
      return (
        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
          {JSON.stringify(cellData).substring(0, 80)}
          {JSON.stringify(cellData).length > 80 ? '…' : ''}
        </code>
      );
    } catch (e) {
      return <span className="text-red-500 text-xs">[Render Error]</span>;
    }
  }

  // Default: convert to string (numbers, strings)
  return String(cellData);
};

// Format column names: "transaction_date" → "Transaction Date"
const formatColumnName = (str) => {
  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

function DataTable({ data }) {
  // Guard: ensure data is a non-empty array
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="mt-4 p-6 text-gray-500 border border-gray-200 rounded-lg bg-gray-50 text-center">
        No data to display
      </div>
    );
  }

  const columns = Object.keys(data[0]);

  return (
    <div className="mt-4 overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
      <table className="min-w-full border-collapse">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap"
              >
                {formatColumnName(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={row.id || row._id || rowIndex}
              className="hover:bg-gray-50 even:bg-gray-50/70 transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={`${rowIndex}-${col}`}
                  className="px-4 py-3 text-sm text-gray-700 border-b border-gray-100 align-top max-w-xs"
                >
                  <div className="truncate">{renderCell(row[col])}</div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;