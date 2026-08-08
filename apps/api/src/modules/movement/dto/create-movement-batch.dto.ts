import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, ValidateNested } from "class-validator";
import { CreateMovementDto } from "./create-movement.dto";

export class CreateMovementBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateMovementDto)
  items: CreateMovementDto[];
}
