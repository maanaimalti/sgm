import { api } from "@/services/api";
import type { ProductListResponse } from "@sgm/shared";

interface Props {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
}

export const GetAllProductsFetcher = async ({
  page = 1,
  pageSize = 10,
  search = "",
  categoryId,
}: Props) => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (search) params.set("search", search);
  if (categoryId) params.set("categoryId", categoryId);

  const response = await api.get<ProductListResponse>(
    `/products?${params.toString()}`,
  );
  return response.data;
};
