import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

class OrderItem {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;
}

export class CreateOrderControllerDto {
  items: OrderItem[];

  @IsOptional()
  @IsString()
  observation?: string;

  @IsOptional()
  @IsString()
  event?: string;
}
