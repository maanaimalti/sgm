import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  brandName: string;

  @IsString()
  @IsNotEmpty()
  unityId: string;

  @IsNumber()
  @IsNotEmpty()
  costValue: number;

  @IsNumber()
  @IsOptional()
  saleValue?: number;

  @IsString()
  @IsNotEmpty()
  departmentId: string;
}
