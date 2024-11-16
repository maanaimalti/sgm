import type { CreateMovementDto } from './create-movement.dto';

export class CreateMovementBatchDto {
  items: CreateMovementDto[];
}
