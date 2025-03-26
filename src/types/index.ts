export interface CellData {
  value: string | number;
  isHighlighted?: boolean;
  isCalculated?: boolean;
}

export interface RowData {
  [key: string]: CellData;
} 