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
  brandName: string;
  description: string;
  name: string;
  quantity: number;
  status: string;
}

export interface ProductResponseAll {
  products: ProductResponse[];
  total: number;
}