import { IsNotEmpty, IsString } from "class-validator";
import { CreateOrderControllerDto } from "./create-order-controller.dto";

export class CreateOrderDto extends CreateOrderControllerDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}
