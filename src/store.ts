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
  filters: { [key: string]: string };
  activeCell: { row: number; col: string } | null;
  isLoading: boolean;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  setData: (newData: RowData[]) => void;
  addRow: () => void;
  removeRow: (index: number) => void;
  updateCell: (rowIndex: number, colKey: string, value: string | number) => void;
  sortData: (key: string, direction: 'asc' | 'desc') => void;
  filterData: (filters: { [key: string]: string }) => RowData[];
  setFilter: (key: string, value: string) => void;
  setActiveCell: (cell: { row: number; col: string } | null) => void;
  setIsLoading: (loading: boolean) => void;
  updateFilter: (filters: { [key: string]: string }) => void;
  updateSort: (sortConfig: { key: string; direction: 'asc' | 'desc' } | null) => void;
}

const useStore = create<StoreState>((set, get) => ({
  data: [],
  filters: {},
  activeCell: null,
  isLoading: false,
  sortConfig: null,

  setData: (newData) => set({ data: newData }),
  
  addRow: () => {
    const { data } = get();
    const newRow = {
      srNo: { value: (data.length + 1).toString(), isCalculated: true },
      // ... other initial row properties
    };
    set({ data: [...data, newRow] });
  },

  removeRow: (index) => {
    const { data } = get();
    const newData = [...data];
    newData.splice(index, 1);
    set({ data: newData });
  },

  updateCell: (rowIndex, colKey, value) => {
    const { data } = get();
    const newData = [...data];
    newData[rowIndex] = {
      ...newData[rowIndex],
      [colKey]: { ...newData[rowIndex][colKey], value }
    };
    set({ data: newData });
  },

  sortData: (key, direction) => {
    set({ sortConfig: { key, direction } });
    // ... sorting implementation
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

  setFilter: (key, value) => set(state => ({ 
    filters: { ...state.filters, [key]: value } 
  })),

  setActiveCell: (cell) => set({ activeCell: cell }),
  
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  updateFilter: (filters) => set({ filters }),
  
  updateSort: (sortConfig) => set({ sortConfig })
}));

export default useStore;