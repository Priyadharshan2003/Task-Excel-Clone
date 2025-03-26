import { useRef, useEffect } from 'react';
import useStore from './store';
import * as XLSX from 'xlsx';

// Define your interfaces
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

const ExcelTool = () => {
  const {
    data,
    setData,
    addRow,
    removeRow,
    updateCell,
    sortData,
    filterData,
    setFilter,
    filters,
    activeCell,
    setActiveCell,
    sortConfig,
    isLoading,
    setIsLoading
  } = useStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const recalculateRow = (row: RowData): RowData => {
    const rate = typeof row.rate.value === 'string' ? parseFloat(row.rate.value) || 0 : row.rate.value as number;
    const boxes = typeof row.boxes.value === 'string' ? parseFloat(row.boxes.value) || 0 : row.boxes.value as number;
    const qty = typeof row.qty.value === 'string' ? parseFloat(row.qty.value) || 0 : row.qty.value as number;
    const exchangeRate = typeof row.exchangeRate.value === 'string' ? parseFloat(row.exchangeRate.value) || 0 : row.exchangeRate.value as number;

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

  useEffect(() => {
    if (data.length === 0) {
      const initialData = Array(10).fill(0).map((_, i) => {
        const newRow = {
          srNo: { value: (i + 1).toString(), isCalculated: true },
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
    }
  }, [data.length, setData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      if (!workbook.SheetNames.length) {
        throw new Error('Excel file is empty');
      }

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false
      }) as Array<Array<string | number>>;

      const headerRowIndex = jsonData.findIndex(row => 
        String(row[0]).trim().toUpperCase() === 'SR NO'
      );

      if (headerRowIndex === -1) {
        throw new Error('Could not find header row with "SR No"');
      }

      const newData = processExcelData(jsonData, headerRowIndex);
      setData(newData);
    } catch (error) {
      console.error('Error processing Excel file:', error);
      alert(`Error processing Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const processExcelData = (jsonData: Array<Array<string | number>>, headerRowIndex: number): RowData[] => {
    const newData: RowData[] = [];
    
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0 || String(row[0]).toUpperCase() === 'TOTAL') {
        continue;
      }

      const rowData: RowData = {
        srNo: { value: parseFloat(String(row[0])) || newData.length + 1, isCalculated: true },
        hsCode: { value: String(row[1] || '').trim() },
        htsCode: { value: String(row[2] || '').trim() },
        marksNos: { value: String(row[3] || '').trim() },
        description: { value: String(row[5] || '').trim() },
        rate: { value: parseFloat(String(row[7])) || 0 },
        boxes: { value: parseFloat(String(row[8])) || 0 },
        qty: { value: parseFloat(String(row[9])) || 0 },
        productValueUSD: { value: 0, isCalculated: true },
        exchangeRate: { value: parseFloat(String(row[11])) || 0 },
        productValueINR: { value: 0, isCalculated: true },
        netWeight: { value: parseFloat(String(row[13])) || 0 },
        amount: { value: 0, isCalculated: true },
        discount: { value: 0, isCalculated: true },
        netAmount: { value: 0, isCalculated: true }
      };

      newData.push(recalculateRow(rowData));
    }

    return newData;
  };

  const handleCellChange = (rowIndex: number, colKey: string, value: string) => {
    updateCell(rowIndex, colKey, value);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    sortData(key, direction);
  };

  const handleFilter = (key: string, value: string) => {
    setFilter(key, value);
  };

  const filteredData = filterData(filters);

  const calculateTotals = () => {
    const totals: Record<string, number> = {};

    columns.forEach(col => {
      if (col.isCalculated) return;

      const numericValues = filteredData
        .map((row: RowData) => parseFloat(row[col.key]?.value as string) || 0)
        .filter((val: number) => !isNaN(val));

      if (numericValues.length > 0) {
        totals[col.key] = numericValues.reduce((sum: number, val: number) => sum + val, 0);
      }
    });

    return totals;
  };

  const totals = calculateTotals();

  return (
    <div className="p-6 max-w-full">
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="alert" aria-live="polite">
          <div className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Processing...</span>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Excel Data Manager</h2>
        
        <div className="flex gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv"
            className="hidden"
            aria-label="Upload Excel file"
            title="Upload Excel file"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 shadow-sm"
            disabled={isLoading}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            Upload Excel
          </button>
          <button
            onClick={addRow}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2 shadow-sm"
            disabled={isLoading}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add Row
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-lg bg-white">
        <table className="min-w-full divide-y divide-gray-300">
          <thead>
            <tr className="bg-gray-50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="sticky top-0 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-300"
                  style={{ width: column.width }}
                  onClick={() => handleSort(column.key)}
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
                      aria-label={`Filter ${column.label}`}
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
            {filteredData.map((row: RowData, rowIndex: number) => (
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
                          aria-label={`Edit ${column.label}`}
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
                    onClick={() => removeRow(rowIndex)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 text-sm"
                  >
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

export default ExcelTool;