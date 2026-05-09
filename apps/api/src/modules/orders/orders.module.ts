import { Module } from "@nestjs/common";
import { UploadFileModule } from "src/shared/upload/upload-file.module";
import { NotificationModule } from "../notification/notification.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [UploadFileModule, NotificationModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
