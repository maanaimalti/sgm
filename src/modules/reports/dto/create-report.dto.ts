import { IsEnum, IsOptional, IsString } from "class-validator";

export enum ReportType {
  PRODUCTS = "PRODUCTS",
  ORDERS = "ORDERS",
  MOVEMENTS = "MOVEMENTS",
  STOCK = "STOCK",
  USERS = "USERS",
}

export class CreateReportDto {
  @IsEnum(ReportType)
  type: ReportType;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  parameters?: string; // JSON string for filters
}
