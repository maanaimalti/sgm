export interface StockResponse {
  id: string;
  quantity: number;
  createdAt?: string;
  updatedAt?: string;
  product: {
    id: string;
    name: string;
    minStock?: number | null;
    department: {
      name: string;
      id: string;
    };
    unity: {
      id: string;
      name: string;
    };
  };
}
