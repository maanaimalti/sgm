import { IsNumber, IsOptional } from 'class-validator';

export class FindAllProductDto {
  @IsNumber()
  @IsOptional()
  page = 1;

  @IsNumber()
  @IsOptional()
  pageSize = 10;
}
