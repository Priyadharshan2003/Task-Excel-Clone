export interface CellData {
  value: string | number;
  isHighlighted?: boolean;
  isCalculated?: boolean;
}

export interface RowData {
  [key: string]: CellData;
  srNo: CellData;
  hsCode: CellData;
  htsCode: CellData;
  marksNos: CellData;
  description: CellData;
  rate: CellData;
  boxes: CellData;
  qty: CellData;
  productValueUSD: CellData;
  exchangeRate: CellData;
  productValueINR: CellData;
  netWeight: CellData;
  amount: CellData;
  discount: CellData;
  netAmount: CellData;
}

export interface Column {
  key: string;
  label: string;
  width: number;
  editable: boolean;
  isCalculated?: boolean;
}

export interface Filter {
  column: string;
  value: string;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
} 