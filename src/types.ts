// types.ts
export interface CellData {
    value: string | number;
    isHighlighted?: boolean;
    isCalculated?: boolean;
  }
  
  export interface RowData {
    [key: string]: CellData;
  }
  
  export interface Column {
    key: string;
    label: string;
    width: number;
    editable: boolean;
    isCalculated?: boolean;
  }