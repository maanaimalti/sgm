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
  description: string;
  name: string;
  status: string;
}

export interface ProductResponseAll {
  products: ProductResponse[];
  total: number;
}