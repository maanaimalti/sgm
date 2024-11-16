import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class FindAllMovementDTO {
  @IsNumber()
  @IsOptional()
  page? = 1;

  @IsNumber()
  @IsOptional()
  pageSize? = 10;

  @IsOptional()
  search?: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;
}
