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
  status: string;
}

export interface ProductResponseAll {
  products: ProductResponse[];
  total: number;
}