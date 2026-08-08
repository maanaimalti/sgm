import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from "class-validator";
import { MovementType } from "../movement-type.enum";

export class CreateMovementDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(MovementType)
  type: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  quantity: number;
}
