import type { StockReponseAll } from "./stock-response.interface";

export const getAllStockFetcher = async ({
  page = 1,
  pageSize = 10,
  area = "all",
}: Props): Promise<StockReponseAll> => {
  return {
    stock: [
      {
        area: "Cozinha",
        id: "1",
        productName: "Arroz",
        quantity: '10kg',
      }
    ],
    total: 20
  };
  // const response = await api.get(
  //   `/stock?page=${page}&pageSize=${pageSize}&area=${area}&type=${type}`
  // );
  // return response.data;
};

type Areas = "all" | "kitchen" | "lib";

interface Props {
  page?: number;
  pageSize?: number;
  area?: Areas;
}
