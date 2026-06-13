export interface ProductResponse {
  id: string;
  category: {
    name: string;
    id: string;
  };
  unity: {
    name: string;
    id: string;
  };
  department: {
    name: string;
    id: string;
  };
  costValue: number;
  saleValue: number;
  description: string;
  name: string;
  brand?: string | null;
  status: string;
  minStock?: number | null;
}

export interface ProductListResponse {
  products: ProductResponse[];
  total: number;
}
