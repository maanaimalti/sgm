import { orderStatus } from "@prisma/client";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";

export class FindAllOrdersDto {
  @IsNumber()
  @IsOptional()
  page? = 1;

  @IsNumber()
  @IsOptional()
  pageSize? = 10;

  @IsOptional()
  @IsEnum(orderStatus)
  status?: orderStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
