import { IsNumber, IsOptional } from 'class-validator';

export class FindAllMovementDTO {
  @IsNumber()
  @IsOptional()
  page: number;

  @IsNumber()
  @IsOptional()
  pageSize: number;
}
