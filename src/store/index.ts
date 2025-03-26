import { create } from 'zustand';
import { RowData } from '../types';

interface StoreState {
  data: RowData[];
  activeCell: { row: number; col: string } | null;
  isLoading: boolean;
  filters: { [key: string]: string };
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  setData: (newData: RowData[]) => void;
  setActiveCell: (cell: { row: number; col: string } | null) => void;
  setIsLoading: (loading: boolean) => void;
  updateCell: (rowIndex: number, colKey: string, value: string | number) => void;
  addRow: () => void;
  removeRow: (index: number) => void;
  updateFilter: (key: string, value: string) => void;
  updateSort: (key: string) => void;
}

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
    productValueUSD: { value: productValueUSD, isCalculated: true },
    productValueINR: { value: productValueINR, isCalculated: true },
    amount: { value: amount, isCalculated: true },
    discount: { value: discount, isCalculated: true },
    netAmount: { value: netAmount, isCalculated: true }
  };
};

const useStore = create<StoreState>((set, get) => ({
  data: [],
  activeCell: null,
  isLoading: false,
  filters: {},
  sortConfig: null,

  setData: (newData) => set({ data: newData }),
  setActiveCell: (cell) => set({ activeCell: cell }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  updateCell: (rowIndex, colKey, value) => {
    const { data } = get();
    const newData = [...data];
    if (newData[rowIndex]) {
      newData[rowIndex] = {
        ...newData[rowIndex],
        [colKey]: { value, isCalculated: false }
      };
      if (['rate', 'boxes', 'qty', 'exchangeRate'].includes(colKey)) {
        newData[rowIndex] = recalculateRow(newData[rowIndex]);
      }
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
      rate: { value: 0 },
      boxes: { value: 0 },
      qty: { value: 0 },
      productValueUSD: { value: 0, isCalculated: true },
      exchangeRate: { value: 82.5 },
      productValueINR: { value: 0, isCalculated: true },
      netWeight: { value: 0 },
      amount: { value: 0, isCalculated: true },
      discount: { value: 0, isCalculated: true },
      netAmount: { value: 0, isCalculated: true }
    };
    set({ data: [...data, recalculateRow(newRow)] });
  },

  removeRow: (index) => {
    const { data } = get();
    const newData = data.filter((_, i) => i !== index).map((row, i) => ({
      ...row,
      srNo: { value: i + 1, isCalculated: true }
    }));
    set({ data: newData });
  },

  updateFilter: (key, value) => {
    const { filters } = get();
    set({ filters: { ...filters, [key]: value } });
  },

  updateSort: (key) => {
    const { sortConfig } = get();
    const direction = sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    set({ sortConfig: { key, direction } });
  }
}));

export default useStore; 