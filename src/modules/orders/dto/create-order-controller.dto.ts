import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

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
}
