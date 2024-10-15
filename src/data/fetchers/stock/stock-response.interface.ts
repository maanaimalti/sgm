export interface StockReponse {
  id: string;
  productName: string;
  area: string;
  quantity: string;
}

export interface StockReponseAll {
  stock: StockReponse[];
  total: number;
}