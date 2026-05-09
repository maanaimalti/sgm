export interface StockResponse {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
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
