import { create } from 'zustand';
import { CellData, RowData } from '../types';

interface ExcelStore {
  data: RowData[];
  activeCell: { row: number; col: string } | null;
  isLoading: boolean;
  filters: { [key: string]: string };
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  
  // Actions
  setData: (data: RowData[]) => void;
  setActiveCell: (cell: { row: number; col: string } | null) => void;
  setIsLoading: (loading: boolean) => void;
  updateCell: (rowIndex: number, colKey: string, value: string | number) => void;
  addRow: () => void;
  removeRow: (rowIndex: number) => void;
  updateFilter: (key: string, value: string) => void;
  updateSort: (key: string) => void;
}

// Helper function to recalculate all dependent fields for a row
const recalculateRow = (row: RowData): RowData => {
  const rate = parseFloat(row.rate.value as string) || 0;
  const boxes = parseFloat(row.boxes.value as string) || 0;
  const qty = parseFloat(row.qty.value as string) || 0;
  const exchangeRate = parseFloat(row.exchangeRate?.value as string) || 0;
  
  // Calculate product value in USD
  const productValueUSD = rate * qty;
  
  // Calculate product value in INR
  const productValueINR = productValueUSD * exchangeRate;
  
  // Calculate amount
  const amount = rate * boxes * qty;
  
  // Calculate discount (15% of amount, capped at 50)
  const discount = Math.min(amount * 0.15, 50);
  
  // Calculate net amount
  const netAmount = amount - discount;
  
  return {
    ...row,
    productValueUSD: { ...row.productValueUSD, value: productValueUSD },
    productValueINR: { ...row.productValueINR, value: productValueINR },
    amount: { ...row.amount, value: amount },
    discount: { ...row.discount, value: discount },
    netAmount: { ...row.netAmount, value: netAmount },
  };
};

export const useExcelStore = create<ExcelStore>((set, get) => ({
  data: [],
  activeCell: null,
  isLoading: false,
  filters: {},
  sortConfig: null,

  setData: (data) => set({ data }),
  
  setActiveCell: (cell) => set({ activeCell: cell }),
  
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  updateCell: (rowIndex, colKey, value) => {
    const { data } = get();
    const newData = [...data];
    
    // Update the cell value
    newData[rowIndex] = {
      ...newData[rowIndex],
      [colKey]: { ...newData[rowIndex][colKey], value }
    };
    
    // If the updated cell affects calculations, recalculate the row
    if (['rate', 'boxes', 'qty', 'exchangeRate'].includes(colKey)) {
      newData[rowIndex] = recalculateRow(newData[rowIndex]);
    }
    
    set({ data: newData });
  },
  
  addRow: () => {
    const { data } = get();
    const newRow: RowData = {
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
    };
    
    // Apply initial calculations
    const calculatedRow = recalculateRow(newRow);
    set({ data: [...data, calculatedRow] });
  },
  
  removeRow: (rowIndex) => {
    const { data } = get();
    const newData = [...data];
    newData.splice(rowIndex, 1);
    
    // Update serial numbers
    newData.forEach((row, idx) => {
      row.srNo.value = idx + 1;
    });
    
    set({ data: newData });
  },
  
  updateFilter: (key, value) => {
    const { filters } = get();
    set({ filters: { ...filters, [key]: value } });
  },
  
  updateSort: (key) => {
    const { sortConfig } = get();
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    const newConfig = { key, direction };
    set({ sortConfig: newConfig });
    
    // Apply sorting
    const { data } = get();
    const sortedData = [...data].sort((a, b) => {
      const aValue = a[key]?.value;
      const bValue = b[key]?.value;
      
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    set({ data: sortedData });
  },
})); 