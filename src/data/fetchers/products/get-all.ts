import { api } from "@/services/api";
import type { ProductResponseAll } from "./product-response.interface";

export const GetAllProductsFetcher = async ({ page = 1, pageSize = 10, search = '' }: Props) => {
  console.log({page, pageSize, search})
  const response = await api.get<ProductResponseAll>(
    `/products?page=${page}&pageSize=${pageSize}&search=${search}`
  );
  return response.data;
};

interface Props {
  page?: number;
  pageSize?: number;
  search?: string;
}
