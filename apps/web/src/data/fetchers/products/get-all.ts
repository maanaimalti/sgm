import type { ProductListResponse } from "@sgm/shared";
import { api } from "@/services/api";

export const GetAllProductsFetcher = async ({
  page = 1,
  pageSize = 10,
  search = "",
}: Props) => {
  const response = await api.get<ProductListResponse>(
    `/products?page=${page}&pageSize=${pageSize}&search=${search}`,
  );
  return response.data;
};

interface Props {
  page?: number;
  pageSize?: number;
  search?: string;
}
