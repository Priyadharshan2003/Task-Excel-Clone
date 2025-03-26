import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';

interface CellData {
  value: string | number;
  isHighlighted?: boolean;
  isCalculated?: boolean;
}

interface RowData {
  [key: string]: CellData;
}

interface Column {
  key: string;
  label: string;
  width: number;
  editable: boolean;
  isCalculated?: boolean;
}

const ExcelLikeTool = () => {
  const [data, setData] = useState<RowData[]>([]);
  const [activeCell, setActiveCell] = useState<{ row: number; col: string } | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Define columns based on the invoice structure
  const columns: Column[] = [
    { key: 'srNo', label: 'Sr No', width: 60, editable: false, isCalculated: true },
    { key: 'hsCode', label: 'HS CODE', width: 100, editable: true },
    { key: 'htsCode', label: 'HTS CODE', width: 100, editable: true },
    { key: 'marksNos', label: 'MARKS & NOS', width: 100, editable: true },
    { key: 'description', label: 'DESCRIPTION OF GOODS', width: 300, editable: true },
    { key: 'rate', label: 'RATE IN USD', width: 100, editable: true },
    { key: 'boxes', label: 'TOTAL No. OF BOXES', width: 120, editable: true },
    { key: 'qty', label: 'TOTAL QTY', width: 100, editable: true },
    { key: 'productValueUSD', label: 'PRODUCT VALUE IN USD', width: 150, editable: false, isCalculated: true },
    { key: 'exchangeRate', label: 'EXCHANGE RATE', width: 120, editable: true },
    { key: 'productValueINR', label: 'PRODUCT VALUE IN INR', width: 150, editable: false, isCalculated: true },
    { key: 'netWeight', label: 'Net Weight', width: 100, editable: true },
    { key: 'amount', label: 'AMOUNT', width: 120, editable: false, isCalculated: true },
    { key: 'discount', label: 'DISCOUNT', width: 120, editable: false, isCalculated: true },
    { key: 'netAmount', label: 'NET AMOUNT', width: 120, editable: false, isCalculated: true },
  ];

  // Helper function to recalculate all formulas for a row
  const recalculateRow = (row: RowData): RowData => {
    // Convert values to numbers safely
    const rate = typeof row.rate.value === 'string' ? parseFloat(row.rate.value) || 0 : row.rate.value as number;
    const boxes = typeof row.boxes.value === 'string' ? parseFloat(row.boxes.value) || 0 : row.boxes.value as number;
    const qty = typeof row.qty.value === 'string' ? parseFloat(row.qty.value) || 0 : row.qty.value as number;
    const exchangeRate = typeof row.exchangeRate.value === 'string' ? parseFloat(row.exchangeRate.value) || 0 : row.exchangeRate.value as number;

    // Calculate all derived values
    const productValueUSD = rate * qty;
    const amount = rate * boxes * qty;
    const discount = Math.min(amount * 0.15, 50);
    const netAmount = amount - discount;
    const productValueINR = productValueUSD * exchangeRate;

    return {
      ...row,
      productValueUSD: { ...row.productValueUSD, value: productValueUSD },
      amount: { ...row.amount, value: amount },
      discount: { ...row.discount, value: discount },
      netAmount: { ...row.netAmount, value: netAmount },
      productValueINR: { ...row.productValueINR, value: productValueINR }
    };
  };

  // Initialize with sample data
  useEffect(() => {
    const initialData: RowData[] = Array(10).fill(0).map((_, i) => {
      const newRow = {
        srNo: { value: i + 1, isCalculated: true },
        hsCode: { value: '' },
        htsCode: { value: '' },
        marksNos: { value: '' },
        description: { value: '' },
        rate: { value: '' },
        boxes: { value: '' },
        qty: { value: '' },
        productValueUSD: { value: '', isCalculated: true },
        exchangeRate: { value: '' },
        productValueINR: { value: '', isCalculated: true },
        netWeight: { value: '' },
        amount: { value: '', isCalculated: true },
        discount: { value: '', isCalculated: true },
        netAmount: { value: '', isCalculated: true },
      };
      return recalculateRow(newRow);
    });
    setData(initialData);
  }, []);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { header: 1 });

        // Find the row where headers start
        let headerRowIndex = 0;
        for (let i = 0; i < jsonData.length; i++) {
          if (jsonData[i][0] === 'SR No') {
            headerRowIndex = i;
            break;
          }
        }

        // Process data rows
        const newData: RowData[] = [];
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0 || row[0] === 'TOTAL') continue;

          // Create base row data
          const rowData: RowData = {
            srNo: { value: row[0] || '', isCalculated: true },
            hsCode: { value: row[1] || '' },
            htsCode: { value: row[2] || '' },
            marksNos: { value: row[3] || '' },
            description: { value: row[5] || '' },
            rate: { value: row[7] || 0 },
            boxes: { value: row[8] || 0 },
            qty: { value: row[9] || 0 },
            productValueUSD: { value: 0, isCalculated: true },
            exchangeRate: { value: row[11] || 0 },
            productValueINR: { value: 0, isCalculated: true },
            netWeight: { value: row[13] || 0 },
            amount: { value: 0, isCalculated: true },
            discount: { value: 0, isCalculated: true },
            netAmount: { value: 0, isCalculated: true },
          };

          // Apply calculations to ALL rows
          newData.push(recalculateRow(rowData));
        }

        setData(newData);
        setError(null);
      } catch (error) {
        console.error('Error processing Excel file:', error);
        setError('Error processing Excel file. Please check the format and try again.');
      }
    };
    reader.onerror = () => {
      setError('Error reading file. Please try again.');
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle cell value change
  const handleCellChange = (rowIndex: number, colKey: string, value: string) => {
    const newData = [...data];
    
    // Update the cell value
    newData[rowIndex] = {
      ...newData[rowIndex],
      [colKey]: { ...newData[rowIndex][colKey], value }
    };

    // Recalculate the entire row if any of these fields change
    if (['rate', 'boxes', 'qty', 'exchangeRate'].includes(colKey)) {
      newData[rowIndex] = recalculateRow(newData[rowIndex]);
    }

    setData(newData);
  };

  // Add new row
  const handleAddRow = () => {
    const newRow = recalculateRow({
      srNo: { value: data.length + 1, isCalculated: true },
      hsCode: { value: '' },
      htsCode: { value: '' },
      marksNos: { value: '' },
      description: { value: '' },
      rate: { value: '' },
      boxes: { value: '' },
      qty: { value: '' },
      productValueUSD: { value: '', isCalculated: true },
      exchangeRate: { value: '' },
      productValueINR: { value: '', isCalculated: true },
      netWeight: { value: '' },
      amount: { value: '', isCalculated: true },
      discount: { value: '', isCalculated: true },
      netAmount: { value: '', isCalculated: true },
    });
    setData([...data, newRow]);
  };

  // Remove row
  const handleRemoveRow = (rowIndex: number) => {
    const newData = [...data];
    newData.splice(rowIndex, 1);
    // Update serial numbers
    newData.forEach((row, idx) => {
      row.srNo.value = idx + 1;
    });
    setData(newData);
  };

  // Sort data
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sortedData = [...data].sort((a, b) => {
      const aValue = a[key]?.value;
      const bValue = b[key]?.value;

      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    setData(sortedData);
  };

  // Apply filter
  const handleFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  // Get filtered data
  const getFilteredData = () => {
    return data.filter(row => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        return String(row[key]?.value).toLowerCase().includes(value.toLowerCase());
      });
    });
  };

  // Calculate totals
  const calculateTotals = () => {
    const totals: Record<string, number> = {};

    columns.forEach(col => {
      if (col.isCalculated) return;

      const numericValues = data
        .map(row => parseFloat(row[col.key]?.value as string) || 0)
        .filter(val => !isNaN(val));

      if (numericValues.length > 0) {
        totals[col.key] = numericValues.reduce((sum, val) => sum + val, 0);
      }
    });

    return totals;
  };

  const filteredData = getFilteredData();
  const totals = calculateTotals();

  return (
    <div className="p-6 max-w-full">
      {/* Header Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Commercial Invoice Processor</h2>
        
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Buttons Section */}
        <div className="flex gap-4 mb-6">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <button
            onClick={() => {
              setError(null);
              fileInputRef.current?.click();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Excel
          </button>
          <button
            onClick={handleAddRow}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Row
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-lg bg-white">
        <table className="min-w-full divide-y divide-gray-300">
          <thead>
            <tr className="bg-gray-50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="sticky top-0 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-300"
                  style={{ width: column.width }}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center">
                      <span className="font-semibold">{column.label}</span>
                      {sortConfig?.key === column.key && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder={`Filter ${column.label}`}
                      className="w-full px-2 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      onChange={(e) => handleFilter(column.key, e.target.value)}
                    />
                  </div>
                </th>
              ))}
              <th className="sticky top-0 px-4 py-3 bg-gray-50 border-b border-gray-300 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-300">
            {filteredData.map((row, rowIndex) => (
              <tr 
                key={rowIndex}
                className={`hover:bg-gray-50 transition-colors duration-150 ${
                  rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                {columns.map((column) => {
                  const cell = row[column.key] || { value: '' };
                  return (
                    <td
                      key={`${rowIndex}-${column.key}`}
                      className={`px-4 py-2 text-sm text-gray-700 border-r border-gray-300
                        ${cell.isHighlighted ? 'bg-yellow-50' : ''}
                        ${cell.isCalculated ? 'bg-blue-50' : ''}
                        ${activeCell?.row === rowIndex && activeCell?.col === column.key ? 'bg-blue-100' : ''}
                      `}
                      onClick={() => setActiveCell({ row: rowIndex, col: column.key })}
                    >
                      {column.editable && activeCell?.row === rowIndex && activeCell?.col === column.key ? (
                        <input
                          type={typeof cell.value === 'number' ? 'number' : 'text'}
                          value={cell.value as string}
                          onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)}
                          className="w-full px-2 py-1.5 border border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
                          autoFocus
                          onBlur={() => setActiveCell(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setActiveCell(null);
                            }
                          }}
                        />
                      ) : (
                        <span className="block w-full truncate">
                          {typeof cell.value === 'number' ? cell.value.toFixed(2) : cell.value}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-2 border-r border-gray-300 whitespace-nowrap">
                  <button
                    onClick={() => handleRemoveRow(rowIndex)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 text-sm flex items-center gap-1 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-300">
            <tr>
              {columns.map((column) => {
                if (column.isCalculated) {
                  return <td key={`total-${column.key}`} className="px-4 py-3 border-r border-gray-300"></td>;
                }
                const total = totals[column.key] || 0;
                return (
                  <td
                    key={`total-${column.key}`}
                    className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300"
                  >
                    {typeof total === 'number' ? total.toFixed(2) : total}
                  </td>
                );
              })}
              <td className="px-4 py-3 border-r border-gray-300"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default ExcelLikeTool;