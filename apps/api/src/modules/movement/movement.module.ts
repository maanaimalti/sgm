import { Module } from "@nestjs/common";
import { NotificationModule } from "../notification/notification.module";
import { MovementController } from "./movement.controller";
import { MovementService } from "./movement.service";

@Module({
  imports: [NotificationModule],
  controllers: [MovementController],
  providers: [MovementService],
})
export class MovementModule {}
