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
  productValues: {
    costValue: number;
    saleValue: number;
    id: string;
  };
  description: string;
  name: string;
  status: string;
}

export interface ProductResponseAll {
  products: ProductResponse[];
  total: number;
}