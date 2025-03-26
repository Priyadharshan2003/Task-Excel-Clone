import { create } from 'zustand';

interface CellData {
  value: string | number;
  isHighlighted?: boolean;
  isCalculated?: boolean;
}

interface RowData {
  [key: string]: CellData;
}

interface StoreState {
  data: RowData[];
  addRow: () => void;
  removeRow: (index: number) => void;
  updateCell: (rowIndex: number, colKey: string, value: string | number) => void;
  sortData: (key: string, direction: 'asc' | 'desc') => void;
  filterData: (filters: { [key: string]: string }) => RowData[];
  setData: (newData: RowData[]) => void;
  setFilter: (key: string, value: string) => void;
}

const useStore = create<StoreState>((set, get) => ({
  data: [],
  
  addRow: () => {
    const { data } = get();
    const newRow: RowData = {
      srNo: { value: data.length + 1, isCalculated: true },
      hsCode: { value: '' },
      description: { value: '' },
      rate: { value: '' },
      boxes: { value: '' },
      qty: { value: '' },
      amount: { value: '', isCalculated: true },
      discount: { value: '', isCalculated: true },
      netAmount: { value: '', isCalculated: true },
    };
    set({ data: [...data, newRow] });
  },
  
  removeRow: (index: number) => {
    const { data } = get();
    const newData = [...data];
    newData.splice(index, 1);
    // Update serial numbers
    newData.forEach((row, idx) => {
      row.srNo.value = idx + 1;
    });
    set({ data: newData });
  },
  
  updateCell: (rowIndex, colKey, value) => {
    const { data } = get();
    const newData = [...data];
    newData[rowIndex][colKey].value = value;
    
    // Recalculate dependent fields
    if (['rate', 'boxes', 'qty'].includes(colKey)) {
      const rate = parseFloat(newData[rowIndex].rate.value as string) || 0;
      const boxes = parseFloat(newData[rowIndex].boxes.value as string) || 0;
      const qty = parseFloat(newData[rowIndex].qty.value as string) || 0;
      
      // Calculate amount
      newData[rowIndex].amount.value = rate * boxes * qty;
      
      // Calculate discount
      const amount = parseFloat(newData[rowIndex].amount.value as string) || 0;
      newData[rowIndex].discount.value = Math.min(amount * 0.15, 50);
      
      // Calculate net amount
      const discount = parseFloat(newData[rowIndex].discount.value as string) || 0;
      newData[rowIndex].netAmount.value = amount - discount;
    }
    
    set({ data: newData });
  },
  
  sortData: (key, direction) => {
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
  
  filterData: (filters) => {
    const { data } = get();
    return data.filter(row => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        return String(row[key]?.value).toLowerCase().includes(value.toLowerCase());
      });
    });
  },
  
  setData: (newData) => set({ data: newData }),
  setFilter: (key, value) => set(state => ({ 
    filters: { ...state.filters, [key]: value } 
  })),
}));

export default useStore;