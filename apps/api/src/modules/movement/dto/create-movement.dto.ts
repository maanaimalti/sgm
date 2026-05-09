import { IsEnum, IsNotEmpty, IsNumber, IsString } from "class-validator";
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
  quantity: number;
}
