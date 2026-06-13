import { Transform } from "class-transformer";
import { IsString, MaxLength, MinLength } from "class-validator";

export class RejectOrderDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  observation: string;
}
